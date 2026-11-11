import type { Leg, ScheduleItem, Slot, Track, CityId } from "../types";
import { TRIP_START, TRIP_END } from "../data/trip";
import { ACT_BY_ID } from "../data/activities";
import { addDays, dateRange, parseISO, fmt } from "./dates";

export const SLOTS: Slot[] = ["morning", "afternoon", "evening"];
export const slotIndex = (s: Slot) => SLOTS.indexOf(s);

export const TRIP_DAYS = dateRange(TRIP_START, TRIP_END);

export function mainLegs(legs: Leg[]): Leg[] {
  return legs.filter((l) => !l.optional).sort((a, b) => a.arrive.localeCompare(b.arrive));
}

/** City you sleep in on the night of `d` (main legs only). On the final day, the last city. */
export function cityOn(d: string, legs: Leg[]): CityId | null {
  const m = mainLegs(legs);
  for (const l of m) if (l.arrive <= d && d < l.depart && l.city !== "stop") return l.city;
  const last = m[m.length - 1];
  if (last && d === last.depart && last.city !== "stop") return last.city;
  return null;
}
export function stayOn(d: string, legs: Leg[]): Leg | null {
  const stop = legs.find((l) => l.optional && l.arrive <= d && d < l.depart);
  if (stop) return stop;
  return mainLegs(legs).find((l) => l.arrive <= d && d < l.depart) ?? null;
}
export function travelOn(d: string, legs: Leg[]): { from: Leg; to: Leg } | null {
  const m = mainLegs(legs);
  for (let i = 0; i < m.length - 1; i++) if (m[i].depart === d && m[i + 1].arrive === d) return { from: m[i], to: m[i + 1] };
  return null;
}

export interface Problem { level: "error" | "warning"; msg: string; legId?: string; uid?: string }

export function validateLegs(legs: Leg[]): Problem[] {
  const out: Problem[] = [];
  for (const l of legs) {
    if (Number.isNaN(parseISO(l.arrive)) || Number.isNaN(parseISO(l.depart))) {
      out.push({ level: "error", msg: `${l.name}: enter valid dates.`, legId: l.id });
      continue;
    }
    if (l.depart <= l.arrive) out.push({ level: "error", msg: `${l.name}: departure must be after arrival.`, legId: l.id });
    if (l.arrive < TRIP_START || l.depart > TRIP_END) out.push({ level: "error", msg: `${l.name}: dates must be between ${fmt(TRIP_START)} and ${fmt(TRIP_END)}.`, legId: l.id });
  }
  const m = mainLegs(legs);
  for (let i = 0; i < m.length - 1; i++) {
    const a = m[i], b = m[i + 1];
    if (b.arrive < a.depart) out.push({ level: "error", msg: `${a.name} and ${b.name} overlap (${fmt(b.arrive)} – ${fmt(a.depart)}).`, legId: b.id });
    else if (b.arrive > a.depart) out.push({ level: "warning", msg: `No stay booked for the night(s) ${fmt(a.depart)} – ${fmt(addDays(b.arrive, -1))}. Add an overnight stop or adjust dates.`, legId: b.id });
  }
  if (m.length && m[0].arrive > TRIP_START) out.push({ level: "warning", msg: `Nothing planned before ${fmt(m[0].arrive)}.` });
  if (m.length && m[m.length - 1].depart < TRIP_END) out.push({ level: "warning", msg: `Last stay ends ${fmt(m[m.length - 1].depart)}, before the trip ends ${fmt(TRIP_END)}.` });
  const stops = legs.filter((l) => l.optional);
  for (const s of stops) for (const t of stops) if (s.id < t.id && s.arrive < t.depart && t.arrive < s.depart) out.push({ level: "error", msg: `Overnight stops ${s.name} and ${t.name} overlap.`, legId: t.id });
  return out;
}

const tracksClash = (a: Track, b: Track) => a === "all" || b === "all" || a === b;
const rangeOf = (it: Pick<ScheduleItem, "slot" | "span">) => [slotIndex(it.slot), slotIndex(it.slot) + Math.max(1, it.span)] as const;

export function overlaps(a: Pick<ScheduleItem, "date" | "slot" | "span" | "track">, b: Pick<ScheduleItem, "date" | "slot" | "span" | "track">): boolean {
  if (a.date !== b.date || !tracksClash(a.track, b.track)) return false;
  const [a0, a1] = rangeOf(a), [b0, b1] = rangeOf(b);
  return a0 < b1 && b0 < a1;
}

/** Items in `items` that `cand` would overlap. */
export function clashesWith(cand: Pick<ScheduleItem, "date" | "slot" | "span" | "track"> & { uid?: string }, items: ScheduleItem[]): ScheduleItem[] {
  return items.filter((i) => i.uid !== cand.uid && overlaps(cand, i));
}

export function itemTitle(i: ScheduleItem): string {
  return i.activityId ? ACT_BY_ID[i.activityId]?.title ?? i.activityId : i.title ?? "Untitled";
}

export function detectConflicts(items: ScheduleItem[], legs: Leg[]): Problem[] {
  const out: Problem[] = [];
  const seen = new Set<string>();
  for (const a of items) {
    if (!TRIP_DAYS.includes(a.date)) out.push({ level: "error", msg: `${itemTitle(a)} is outside the trip dates.`, uid: a.uid });
    if (slotIndex(a.slot) + a.span > 3) out.push({ level: "error", msg: `${itemTitle(a)} runs past the evening slot.`, uid: a.uid });
    for (const b of items) {
      if (a.uid >= b.uid) continue;
      if (overlaps(a, b)) {
        const k = a.uid + b.uid;
        if (!seen.has(k)) { seen.add(k); out.push({ level: "error", msg: `${fmt(a.date, { dow: true })}: ${itemTitle(a)} clashes with ${itemTitle(b)}.`, uid: b.uid }); }
      }
    }
    const act = a.activityId ? ACT_BY_ID[a.activityId] : undefined;
    if (act) {
      const c = cityOn(a.date, legs), tr = travelOn(a.date, legs);
      const ok = c === act.city || (tr && (tr.from.city === act.city || tr.to.city === act.city));
      if (c && !ok) out.push({ level: "warning", msg: `${act.title} is done from ${cityLabel(act.city)}, but you're based in ${cityLabel(c)} on ${fmt(a.date, { dow: true })}.`, uid: a.uid });
      if (tr && act.fullDay) out.push({ level: "warning", msg: `${act.title} is a full day but ${fmt(a.date)} is a travel day.`, uid: a.uid });
      if (act.adultOnly && a.track === "all") out.push({ level: "warning", msg: `${act.title} is adults-only: put it on the solo track or take turns.`, uid: a.uid });
    }
  }
  return out;
}

export function cityLabel(c: CityId | "stop"): string {
  return { sha: "Shanghai", fuk: "Fukuoka", osa: "Osaka", tok: "Tokyo", stop: "an overnight stop" }[c];
}

export interface MovePlan { ok: boolean; reason?: string; displaced: ScheduleItem[]; blockedByBooked: ScheduleItem[] }

/** Work out what would happen if item `uid` moved to date/slot. Never touches booked items. */
export function planMove(items: ScheduleItem[], uid: string, date: string, slot: Slot): MovePlan {
  const it = items.find((i) => i.uid === uid);
  if (!it) return { ok: false, reason: "Item not found", displaced: [], blockedByBooked: [] };
  if (!TRIP_DAYS.includes(date)) return { ok: false, reason: "Date is outside the trip", displaced: [], blockedByBooked: [] };
  const span = it.span;
  const start = span === 3 ? "morning" : slot;
  if (slotIndex(start) + span > 3) return { ok: false, reason: "Not enough time left in that day", displaced: [], blockedByBooked: [] };
  const cand = { ...it, date, slot: start };
  const clash = clashesWith(cand, items);
  const blockedByBooked = clash.filter((c) => c.booked);
  return { ok: blockedByBooked.length === 0, reason: blockedByBooked.length ? "Booked items are in the way" : undefined, displaced: clash.filter((c) => !c.booked), blockedByBooked };
}

let counter = 0;
export const newUid = () => `i${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
