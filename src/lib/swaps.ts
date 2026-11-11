import type { Leg, ScheduleItem } from "../types";
import { ACT_BY_ID, ALL_ACTIVITIES } from "../data/activities";
import { cityOn, planMove, TRIP_DAYS } from "./schedule";
import type { DaySummary } from "./weather";
import { isBadOutdoorDay } from "./weather";

export interface Swap {
  uid: string;
  title: string;
  date: string;
  why: string;
  booked: boolean;
  moveTo?: string; // a better date in the same city with a free slot
  indoorAlt?: string[]; // indoor activity ids in the same city, not yet scheduled
}

/** Suggest (never apply) swaps for weather-sensitive items on bad-forecast days. Dates without a forecast are skipped. */
export function suggestSwaps(items: ScheduleItem[], legs: Leg[], wx: (date: string, activityId: string) => DaySummary | null): Swap[] {
  const scheduled = new Set(items.map((i) => i.activityId).filter(Boolean));
  const out: Swap[] = [];
  for (const i of items) {
    const act = i.activityId ? ACT_BY_ID[i.activityId] : undefined;
    if (!act || !(act.weatherSensitive || act.weather === "outdoor")) continue;
    const s = wx(i.date, act.id);
    if (!s || !isBadOutdoorDay(s)) continue;
    const why = [s.precipProb != null && s.precipProb >= 60 ? `${s.precipProb}% rain/snow chance` : "", (s.gust ?? 0) >= 50 ? `gusts ${Math.round(s.gust!)} km/h` : "", (s.snow ?? 0) >= 2 ? `${s.snow} cm snow` : "", (s.precip ?? 0) >= 5 ? `${s.precip} mm` : ""].filter(Boolean).join(", ");
    const city = cityOn(i.date, legs);
    let moveTo: string | undefined;
    for (const d of TRIP_DAYS) {
      if (d === i.date || cityOn(d, legs) !== city) continue;
      const ds = wx(d, act.id);
      if (!ds || isBadOutdoorDay(ds)) continue;
      const plan = planMove(items, i.uid, d, i.slot);
      if (plan.ok && plan.displaced.length === 0) { moveTo = d; break; }
    }
    const indoorAlt = ALL_ACTIVITIES.filter((a) => a.city === act.city && a.weather === "indoor" && !scheduled.has(a.id) && !a.fullDay).sort((a, b) => b.score - a.score).slice(0, 2).map((a) => a.id);
    out.push({ uid: i.uid, title: act.title, date: i.date, why: why || "poor forecast", booked: i.booked, moveTo, indoorAlt });
  }
  return out;
}
