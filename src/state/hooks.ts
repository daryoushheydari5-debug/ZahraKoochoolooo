import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AppState, Action } from "./store";
import type { LatLon, RegionId } from "../types";
import { CITY_POS } from "../data/trip";
import { ACT_BY_ID } from "../data/activities";
import { fetchForecast, dailyFor, type ForecastResponse, type DaySummary } from "../lib/weather";
import { fetchRatesShared, loadCachedRates, type Rates } from "../lib/fx";

export const StoreCtx = createContext<{ state: AppState; dispatch: (a: Action) => void } | null>(null);
export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreCtx missing");
  return c;
}

export const REGION_POS: Record<RegionId, LatLon> = {
  ...CITY_POS,
  kyushu: { lat: 33.2840, lon: 131.4910 },
  kansai: { lat: 34.6851, lon: 135.8430 },
  fuji: { lat: 35.5005, lon: 138.7600 },
  hakone: { lat: 35.2324, lon: 139.1069 },
  izu: { lat: 34.9000, lon: 139.1300 },
  nikko: { lat: 36.7500, lon: 139.6000 },
  chichibu: { lat: 35.9920, lon: 139.0850 },
  kamakura: { lat: 35.3000, lon: 139.4800 },
  minakami: { lat: 36.6780, lon: 138.9990 },
  yuzawa: { lat: 36.9500, lon: 138.7870 },
};
const REGIONS = Object.keys(REGION_POS) as RegionId[];

export type LoadState<T> = { status: "idle" | "loading" | "ok" | "error"; data?: T; error?: string; fetchedAt?: number; stale?: boolean; fromCache?: boolean };

/** Daily forecasts for every city and road-trip region in one request. */
export function useRegionWeather() {
  const [st, setSt] = useState<LoadState<Record<string, ForecastResponse>>>({ status: "idle" });
  const load = useCallback(async (force = false) => {
    setSt((s) => ({ ...s, status: "loading" }));
    try {
      const r = await fetchForecast(REGIONS.map((k) => REGION_POS[k]), false, { force });
      const data: Record<string, ForecastResponse> = {};
      REGIONS.forEach((k, i) => (data[k] = r.data[i]));
      setSt({ status: "ok", data, fetchedAt: r.fetchedAt, stale: r.stale, fromCache: r.fromCache });
    } catch (e) {
      setSt({ status: "error", error: (e as Error).message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const forActivity = useCallback((date: string, activityId: string): DaySummary | null => {
    const a = ACT_BY_ID[activityId];
    if (!a || !st.data) return null;
    return dailyFor(st.data[a.region], date);
  }, [st.data]);
  const forRegion = useCallback((date: string, region: RegionId): DaySummary | null => (st.data ? dailyFor(st.data[region], date) : null), [st.data]);
  return { ...st, reload: () => load(true), forActivity, forRegion };
}

export function useRates(manual: { JPY: number; CNY: number } | null | undefined) {
  const [st, setSt] = useState<LoadState<Rates>>(() => {
    const c = loadCachedRates();
    return c ? { status: "idle", data: c, fromCache: true } : { status: "idle" };
  });
  const load = useCallback(async () => {
    setSt((s) => ({ ...s, status: "loading" }));
    try {
      const r = await fetchRatesShared();
      setSt({ status: "ok", data: r, fromCache: false });
    } catch (e) {
      setSt((s) => ({ status: "error", data: s.data, error: (e as Error).message, fromCache: !!s.data }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const effective: Rates | undefined = manual
    ? { JPY: manual.JPY, CNY: manual.CNY, source: "Manual rate you entered", sourceUrl: "", asOf: 0, fetchedAt: 0, manual: true }
    : st.data;
  return { ...st, rates: effective, reload: load };
}
