export const DAY_MS = 86400000;

/** Parse an ISO date (yyyy-mm-dd) as a UTC midnight timestamp. Returns NaN when invalid. */
export function parseISO(d: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return NaN;
  const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return toISO(t) === d ? t : NaN;
}
export function toISO(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}
export function addDays(d: string, n: number): string {
  return toISO(parseISO(d) + n * DAY_MS);
}
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b) - parseISO(a)) / DAY_MS);
}
export function dateRange(start: string, endInclusive: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= endInclusive; d = addDays(d, 1)) out.push(d);
  return out;
}
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function dow(d: string): string {
  return DOW[new Date(parseISO(d)).getUTCDay()];
}
export function fmt(d: string, opts: { dow?: boolean } = {}): string {
  const t = new Date(parseISO(d));
  return `${opts.dow ? DOW[t.getUTCDay()] + " " : ""}${t.getUTCDate()} ${MON[t.getUTCMonth()]}`;
}
export function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
export function isoTodayLocal(now = new Date()): string {
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, "0"), d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
