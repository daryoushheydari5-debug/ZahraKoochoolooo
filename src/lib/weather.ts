import type { LatLon } from "../types";
import { diffDays } from "./dates";

/** Open-Meteo: free, no key, CC BY 4.0. https://open-meteo.com/ */
export const WEATHER_ATTRIBUTION = { label: "Weather data by Open-Meteo.com", url: "https://open-meteo.com/", license: "CC BY 4.0" };
export const FORECAST_HORIZON_DAYS = 16;

export interface HourlyBlock {
  time: string[];
  cloud_cover: (number | null)[];
  cloud_cover_low: (number | null)[];
  visibility: (number | null)[];
  precipitation_probability: (number | null)[];
  precipitation: (number | null)[];
  wind_gusts_10m: (number | null)[];
  snowfall: (number | null)[];
  temperature_2m: (number | null)[];
}
export interface DailyBlock {
  time: string[];
  weather_code: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
  precipitation_sum: (number | null)[];
  precipitation_probability_max: (number | null)[];
  wind_gusts_10m_max: (number | null)[];
  snowfall_sum: (number | null)[];
  cloud_cover_mean?: (number | null)[];
}
export interface ForecastResponse { latitude: number; longitude: number; hourly?: HourlyBlock; daily?: DailyBlock }

export interface Fetched<T> { data: T; fetchedAt: number; fromCache: boolean; stale: boolean }

export class WeatherError extends Error {}

const HOURLY = "cloud_cover,cloud_cover_low,visibility,precipitation_probability,precipitation,wind_gusts_10m,snowfall,temperature_2m";
const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,snowfall_sum";

export function forecastUrl(points: LatLon[], withHourly: boolean): string {
  const p = new URLSearchParams({
    latitude: points.map((x) => x.lat.toFixed(4)).join(","),
    longitude: points.map((x) => x.lon.toFixed(4)).join(","),
    daily: DAILY,
    timezone: "Asia/Tokyo",
    forecast_days: String(FORECAST_HORIZON_DAYS),
  });
  if (withHourly) p.set("hourly", HOURLY);
  return "https://api.open-meteo.com/v1/forecast?" + p.toString();
}

const CACHE_MS = 3 * 3600 * 1000;

/** Fetch with a localStorage cache. On failure falls back to the cached copy (marked stale); otherwise throws. Never invents data. */
const inflight = new Map<string, Promise<Fetched<ForecastResponse[]>>>();
/** Deduplicates concurrent requests for the same forecast (several screens ask at once). */
export function fetchForecast(points: LatLon[], withHourly: boolean, opts: { fetchImpl?: typeof fetch; now?: number; force?: boolean } = {}): Promise<Fetched<ForecastResponse[]>> {
  const k = forecastUrl(points, withHourly) + (opts.force ? "#f" : "");
  if (!opts.fetchImpl && inflight.has(k)) return inflight.get(k)!;
  const p = fetchForecastInner(points, withHourly, opts).finally(() => inflight.delete(k));
  if (!opts.fetchImpl) inflight.set(k, p);
  return p;
}
async function fetchForecastInner(points: LatLon[], withHourly: boolean, opts: { fetchImpl?: typeof fetch; now?: number; force?: boolean }): Promise<Fetched<ForecastResponse[]>> {
  const url = forecastUrl(points, withHourly);
  const key = "aa.wx." + url;
  const now = opts.now ?? Date.now();
  let cached: { at: number; data: ForecastResponse[] } | null = null;
  try { const raw = localStorage.getItem(key); if (raw) cached = JSON.parse(raw); } catch { /* ignore */ }
  if (cached && !opts.force && now - cached.at < CACHE_MS) return { data: cached.data, fetchedAt: cached.at, fromCache: true, stale: false };
  try {
    const res = await (opts.fetchImpl ?? fetch)(url);
    if (!res.ok) throw new WeatherError(`Weather service answered ${res.status}`);
    const json = await res.json();
    const data: ForecastResponse[] = Array.isArray(json) ? json : [json];
    if (!data.every((d) => d && (d.daily || d.hourly))) throw new WeatherError("Weather service returned no forecast");
    try { localStorage.setItem(key, JSON.stringify({ at: now, data })); } catch { /* quota */ }
    return { data, fetchedAt: now, fromCache: false, stale: false };
  } catch (e) {
    if (cached) return { data: cached.data, fetchedAt: cached.at, fromCache: true, stale: true };
    throw e instanceof WeatherError ? e : new WeatherError("Couldn't reach the weather service (offline or blocked).");
  }
}

/* ---------------- Daily summaries ---------------- */
export interface DaySummary {
  date: string;
  code: number | null;
  tMax: number | null;
  tMin: number | null;
  precip: number | null;
  precipProb: number | null;
  gust: number | null;
  snow: number | null;
}
export function dailyFor(f: ForecastResponse | undefined, date: string): DaySummary | null {
  const d = f?.daily;
  if (!d) return null;
  const i = d.time.indexOf(date);
  if (i < 0) return null;
  return { date, code: d.weather_code[i], tMax: d.temperature_2m_max[i], tMin: d.temperature_2m_min[i], precip: d.precipitation_sum[i], precipProb: d.precipitation_probability_max[i], gust: d.wind_gusts_10m_max[i], snow: d.snowfall_sum[i] };
}
export function isBadOutdoorDay(s: DaySummary): boolean {
  return (s.precipProb ?? 0) >= 60 || (s.precip ?? 0) >= 5 || (s.gust ?? 0) >= 50 || (s.snow ?? 0) >= 2;
}
export function wxIcon(code: number | null): string {
  if (code == null) return "·";
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67 || (code >= 80 && code <= 82)) return "🌧️";
  if (code <= 77 || code === 85 || code === 86) return "🌨️";
  return "⛈️";
}

/* ---------------- Mt Fuji ranking ---------------- */
export type Confidence = "high" | "medium" | "low";
export interface FujiDay {
  date: string;
  available: boolean;
  reason?: string;
  score?: number; // 0-100
  leadDays?: number;
  reliability?: number; // 0-1
  confidence?: Confidence;
  cloud?: number; // morning mean %
  lowCloud?: number;
  precipProb?: number;
  precip?: number;
  gust?: number;
  visibilityKm?: number;
  snowCm?: number;
  tMin?: number;
  driving?: "good" | "caution" | "poor";
  notes: string[];
}

export function reliabilityFor(leadDays: number): number {
  if (leadDays <= 2) return 0.95;
  if (leadDays <= 4) return 0.85;
  if (leadDays <= 7) return 0.7;
  if (leadDays <= 10) return 0.5;
  return 0.35;
}
export const confidenceOf = (r: number): Confidence => (r >= 0.8 ? "high" : r >= 0.6 ? "medium" : "low");

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const max = (xs: number[]) => (xs.length ? Math.max(...xs) : NaN);

/** Score one date from hourly data in the 06:00–11:00 viewing window (local). */
export function scoreFujiDay(f: ForecastResponse, date: string, today: string): FujiDay {
  const notes: string[] = [];
  const lead = diffDays(today, date);
  if (lead < 0) return { date, available: false, reason: "Date has passed", notes };
  if (lead >= FORECAST_HORIZON_DAYS) return { date, available: false, reason: "Forecast not available yet", leadDays: lead, notes };
  const h = f.hourly;
  if (!h) return { date, available: false, reason: "Forecast not available yet", leadDays: lead, notes };
  const idx: number[] = [];
  h.time.forEach((t, i) => { if (t.startsWith(date)) { const hr = +t.slice(11, 13); if (hr >= 6 && hr <= 11) idx.push(i); } });
  const pick = (arr: (number | null)[]) => idx.map((i) => arr[i]).filter((v): v is number => typeof v === "number");
  const cloud = pick(h.cloud_cover), low = pick(h.cloud_cover_low), pp = pick(h.precipitation_probability), pr = pick(h.precipitation), gust = pick(h.wind_gusts_10m), vis = pick(h.visibility);
  const dayIdx = h.time.map((t, i) => (t.startsWith(date) ? i : -1)).filter((i) => i >= 0);
  const prevDate = new Date(Date.parse(date + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);
  const prevIdx = h.time.map((t, i) => (t.startsWith(prevDate) ? i : -1)).filter((i) => i >= 0);
  const snowDay = [...prevIdx, ...dayIdx].map((i) => h.snowfall[i]).filter((v): v is number => typeof v === "number");
  const temps = dayIdx.map((i) => h.temperature_2m[i]).filter((v): v is number => typeof v === "number");
  if (cloud.length < 3) return { date, available: false, reason: "Forecast not available yet", leadDays: lead, notes };

  const c = mean(cloud), lc = low.length ? mean(low) : c, p = pp.length ? max(pp) : 0, prSum = pr.reduce((a, b) => a + b, 0), g = gust.length ? max(gust) : 0;
  const visKm = vis.length ? mean(vis) / 1000 : NaN;
  const snowCm = snowDay.reduce((a, b) => a + b, 0);
  const tMin = temps.length ? Math.min(...temps) : NaN;

  // Visibility proxy: measured visibility if present, otherwise derived from low cloud + precipitation.
  const visScore = Number.isFinite(visKm) ? Math.min(visKm, 40) / 40 : Math.max(0, 1 - lc / 100 - prSum / 10);
  const cloudScore = 1 - (0.6 * c + 0.4 * lc) / 100;
  const rainScore = 1 - p / 100;
  const windScore = g <= 30 ? 1 : g >= 70 ? 0 : 1 - (g - 30) / 40;
  const driving: FujiDay["driving"] = snowCm >= 5 ? "poor" : snowCm >= 1 || (Number.isFinite(tMin) && tMin <= -3) ? "caution" : "good";
  const driveScore = driving === "good" ? 1 : driving === "caution" ? 0.6 : 0.1;
  const raw = 0.45 * cloudScore + 0.2 * rainScore + 0.15 * visScore + 0.1 * windScore + 0.1 * driveScore;
  const rel = reliabilityFor(lead);

  if (c >= 70) notes.push("Mostly cloudy in the morning: Fuji likely hidden");
  if (p >= 50) notes.push(`${Math.round(p)}% chance of rain or snow`);
  if (g >= 50) notes.push(`Gusts to ${Math.round(g)} km/h: ropeways, coasters and paragliding may stop`);
  if (driving === "poor") notes.push(`${snowCm.toFixed(1)} cm snow forecast: chains or winter tyres essential, consider the bus`);
  else if (driving === "caution") notes.push("Possible ice at sunrise: drive slowly, winter tyres");
  if (rel < 0.6) notes.push("Long-range forecast: check again closer to the day");

  return {
    date, available: true, leadDays: lead, reliability: rel, confidence: confidenceOf(rel), score: Math.round(raw * 100),
    cloud: Math.round(c), lowCloud: Math.round(lc), precipProb: Math.round(p), precip: +prSum.toFixed(1), gust: Math.round(g),
    visibilityKm: Number.isFinite(visKm) ? +visKm.toFixed(1) : undefined, snowCm: +snowCm.toFixed(1), tMin: Number.isFinite(tMin) ? Math.round(tMin) : undefined,
    driving, notes,
  };
}

export interface FujiRanking { days: FujiDay[]; best?: FujiDay; alternative?: FujiDay }

/** Rank candidate dates. Ties broken by forecast reliability (nearer dates are more trustworthy). */
export function rankFujiDays(f: ForecastResponse | null, candidates: string[], today: string): FujiRanking {
  const days = candidates.map((d) => (f ? scoreFujiDay(f, d, today) : { date: d, available: false, reason: "Forecast not available yet", notes: [] } as FujiDay));
  const ok = days.filter((d) => d.available).sort((a, b) => (b.score! * (0.85 + 0.15 * b.reliability!)) - (a.score! * (0.85 + 0.15 * a.reliability!)) || a.date.localeCompare(b.date));
  return { days, best: ok[0], alternative: ok[1] };
}
