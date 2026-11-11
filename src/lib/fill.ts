import type { Activity, Leg, ScheduleItem, Slot, Track } from "../types";
import { ALL_ACTIVITIES } from "../data/activities";
import { SLOTS, TRIP_DAYS, cityOn, travelOn, overlaps } from "./schedule";
import { diffDays } from "./dates";

const suits = (a: Activity, s: Slot) => (a.best ? a.best.includes(s) : s !== "evening");

/**
 * Suggest activities for every empty slot. Returns only NEW items (marked suggested);
 * never touches or overlaps existing items, so booked plans and the user's own edits stay as they are.
 */
export function fillEmpty(items: ScheduleItem[], legs: Leg[]): ScheduleItem[] {
  const added: ScheduleItem[] = [];
  const all = () => [...items, ...added];
  const used = new Set(items.map((i) => i.activityId).filter(Boolean) as string[]);
  const stops = legs.filter((l) => l.optional);

  const free = (date: string, slot: Slot, track: Track) => !all().some((i) => overlaps(i, { date, slot, span: 1, track }));
  const usedOn = (date: string, id: string) => all().some((i) => i.date === date && i.activityId === id);
  // Repeatable ideas (arcades, snack hunts, bathhouses) at most 3 times, and not on back-to-back days.
  const repeatOk = (date: string, id: string) => {
    const uses = all().filter((i) => i.activityId === id);
    return uses.length < 3 && !uses.some((i) => Math.abs(diffDays(i.date, date)) < 2);
  };

  const pick = (date: string, slot: Slot, city: string, solo: boolean): Activity | undefined => {
    const pool = ALL_ACTIVITIES.filter((a) =>
      a.city === city && a.region === a.city && !a.fullDay && !a.flexible &&
      !a.closed?.some(([f, t]) => f <= date && date <= t) &&
      (solo ? a.modes.includes("solo") : !a.adultOnly && (a.modes.includes("together") || a.modes.includes("turns"))) &&
      (a.repeatable ? !usedOn(date, a.id) && repeatOk(date, a.id) : !used.has(a.id)));
    const rank = (xs: Activity[]) => xs.sort((a, b) => Number(!!a.repeatable) - Number(!!b.repeatable) || b.score - a.score)[0];
    return rank(pool.filter((a) => suits(a, slot))) ?? (slot !== "evening" ? rank(pool.filter((a) => !a.best || !a.best.every((x) => x === "evening"))) : undefined);
  };

  for (const d of TRIP_DAYS) {
    const tr = travelOn(d, legs);
    const stopStarts = stops.some((s) => s.arrive === d), stopEnds = stops.some((s) => s.depart === d);
    const base = tr ? tr.to.city : cityOn(d, legs);
    if (!base || base === "stop") continue;
    for (const slot of SLOTS) {
      if (tr && slot !== "evening") continue; // travelling
      if ((stopStarts || stopEnds) && slot === "morning") continue; // getting to / back from an overnight stop
      if (stops.some((s) => s.arrive <= d && d < s.depart) && slot === "evening") continue; // evening at the overnight stop
      if (d === TRIP_DAYS[TRIP_DAYS.length - 1] && slot === "evening") continue; // flying home
      if (!free(d, slot, "family")) continue;
      // If Darius has a solo plan in this slot, suggest something for the family instead of all four.
      const track: Track = free(d, slot, "all") ? "all" : "family";
      const a = pick(d, slot, base, false);
      if (a) { added.push(mk(a, d, slot, track)); used.add(a.id); }
    }
    // Darius's solo evening, when the group evening isn't shared
    if (free(d, "evening", "solo") && !tr && d !== TRIP_DAYS[TRIP_DAYS.length - 1]) {
      const a = pick(d, "evening", base, true);
      if (a && !all().some((i) => i.date === d && i.activityId === a.id)) { added.push(mk(a, d, "evening", "solo")); used.add(a.id); }
    }
  }
  return added;
}

let n = 0;
function mk(a: Activity, date: string, slot: Slot, track: Track): ScheduleItem {
  return { uid: `s-${date}-${slot}-${track}-${a.id}-${(n++).toString(36)}`, activityId: a.id, date, slot, span: 1, track, booked: false, kind: "activity", suggested: true };
}
