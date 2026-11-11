import type { Currency } from "../types";

export interface Rates {
  /** 1 AUD = x JPY, 1 AUD = y CNY */
  JPY: number;
  CNY: number;
  source: string;
  sourceUrl: string;
  /** When the provider says the rate is from (ms) */
  asOf: number;
  fetchedAt: number;
  manual?: boolean;
}

export const PROVIDERS = [
  {
    name: "Frankfurter (European Central Bank reference rates)",
    url: "https://api.frankfurter.app/latest?from=AUD&to=JPY,CNY",
    home: "https://www.frankfurter.app/",
    parse: (j: any): Pick<Rates, "JPY" | "CNY" | "asOf"> | null =>
      j?.rates?.JPY > 0 && j?.rates?.CNY > 0 && j?.date ? { JPY: j.rates.JPY, CNY: j.rates.CNY, asOf: Date.parse(j.date + "T16:00:00Z") } : null,
  },
  {
    name: "ExchangeRate-API (open access)",
    url: "https://open.er-api.com/v6/latest/AUD",
    home: "https://www.exchangerate-api.com",
    parse: (j: any): Pick<Rates, "JPY" | "CNY" | "asOf"> | null =>
      j?.result === "success" && j?.rates?.JPY > 0 && j?.rates?.CNY > 0 ? { JPY: j.rates.JPY, CNY: j.rates.CNY, asOf: (j.time_last_update_unix ?? 0) * 1000 } : null,
  },
];

const KEY = "aa.fx";
export const STALE_AFTER_MS = 3 * 86400000; // ECB doesn't publish on weekends, so allow 3 days

export function loadCachedRates(): Rates | null {
  try { const r = JSON.parse(localStorage.getItem(KEY) || "null"); return r && r.JPY > 0 && r.CNY > 0 ? r : null; } catch { return null; }
}
export function saveRates(r: Rates) {
  try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ }
}

let pending: Promise<Rates> | null = null;
export function fetchRatesShared(): Promise<Rates> {
  if (!pending) pending = fetchRates().then((r) => { setTimeout(() => (pending = null), 60000); return r; }, (e) => { pending = null; throw e; });
  return pending;
}

export async function fetchRates(fetchImpl: typeof fetch = fetch, now = Date.now()): Promise<Rates> {
  let lastErr = "";
  for (const p of PROVIDERS) {
    try {
      const res = await fetchImpl(p.url);
      if (!res.ok) { lastErr = `${p.name}: HTTP ${res.status}`; continue; }
      const parsed = p.parse(await res.json());
      if (parsed) {
        const r: Rates = { ...parsed, source: p.name, sourceUrl: p.home, fetchedAt: now };
        saveRates(r);
        return r;
      }
      lastErr = `${p.name}: unexpected response`;
    } catch (e) {
      lastErr = `${p.name}: ${(e as Error).message || "network error"}`;
    }
  }
  throw new Error(lastErr || "No exchange-rate provider reachable");
}

export function isStale(r: Rates, now = Date.now()): boolean {
  return r.manual === true || now - r.asOf > STALE_AFTER_MS;
}

/** Convert between AUD/JPY/CNY using AUD-based rates. */
export function convert(amount: number, from: Currency, to: Currency, r: Pick<Rates, "JPY" | "CNY">): number {
  if (!Number.isFinite(amount)) return NaN;
  const perAud: Record<Currency, number> = { AUD: 1, JPY: r.JPY, CNY: r.CNY };
  return (amount / perAud[from]) * perAud[to];
}

export function money(n: number, c: Currency): string {
  if (!Number.isFinite(n)) return "—";
  const sym = c === "AUD" ? "A$" : c === "JPY" ? "¥" : "CN¥";
  const digits = c === "JPY" ? 0 : 2;
  return sym + n.toLocaleString("en-AU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** For tests: forget the shared in-flight/recent request. */
export function resetRatesRequest() { pending = null; }
