import type { BudgetItem, Leg, ScheduleItem, Slot, Track, Currency, TravellerId } from "../types";
import { DEFAULT_LEGS } from "../data/trip";
import { ACT_BY_ID } from "../data/activities";
import { newUid, planMove, slotIndex } from "../lib/schedule";

export interface CarPlan {
  id: string;
  label: string;
  city: "fuk" | "tok";
  pickup: string;
  days: number;
  dailyJpy: number;
  childSeatJpyPerDay: number;
  km: number;
  lPer100: number;
  fuelJpyPerL: number;
  tollsJpy: number;
  parkingJpy: number;
}

export interface AppState {
  v: 1;
  legs: Leg[];
  schedule: ScheduleItem[];
  saved: string[]; // saved for later, not scheduled
  favs: string[];
  votes: Record<string, "in" | "maybe" | "nah">;
  budget: BudgetItem[];
  cars: CarPlan[];
  manualRates?: { JPY: number; CNY: number } | null;
  fujiWindow: { from: string; to: string };
  travelMode: Record<string, "drive" | "transit">;
  /** Ticked items on the "To book" list that aren't stays or activities (flights, trains, documents). */
  done?: Record<string, boolean>;
  /** Spending money in AUD: Darius on his own, Zaynab & Ruhullah sharing one budget. */
  budgets?: { darius: number; couple: number };
  /** One-time plan updates already applied to a saved plan. */
  patches?: string[];
}


/** The plan starts blank: activities are only added from Explore. */
export function defaultSchedule(): ScheduleItem[] {
  return [];
}

export function defaultState(): AppState {
  return baseState();
}
export function baseState(): AppState {
  return {
    v: 1,
    legs: [
      ...DEFAULT_LEGS.map((l) => ({ ...l })),
    ],
    schedule: defaultSchedule(),
    saved: [],
    patches: ["haichang", "blank", "nohotels"],
    budgets: { darius: 4000, couple: 5000 },
    done: {},
    favs: ["usj", "tdl", "fuji-view"],
    votes: {},
    budget: [],
    cars: [
      { id: "car-fuk", label: "Fukuoka car (3 days)", city: "fuk", pickup: "2026-12-23", days: 3, dailyJpy: 8000, childSeatJpyPerDay: 1100, km: 450, lPer100: 7, fuelJpyPerL: 175, tollsJpy: 8000, parkingJpy: 6000 },
    ],
    manualRates: null,
    fujiWindow: { from: "2026-12-30", to: "2027-01-09" },
    travelMode: {},
  };
}

export type Action =
  | { type: "setLeg"; id: string; patch: Partial<Leg> }
  | { type: "addStop"; leg: Leg }
  | { type: "removeLeg"; id: string }
  | { type: "schedule"; activityId?: string; title?: string; date: string; slot: Slot; track: Track; span?: number }
  | { type: "move"; uid: string; date: string; slot: Slot; track?: Track; confirmed?: boolean }
  | { type: "unschedule"; uid: string }
  | { type: "removeItem"; uid: string }
  | { type: "setItem"; uid: string; patch: Partial<ScheduleItem> }
  | { type: "toggleSaved"; id: string }
  | { type: "toggleFav"; id: string }
  | { type: "vote"; id: string; v: "in" | "maybe" | "nah" | null }
  | { type: "addBudget"; item: BudgetItem }
  | { type: "removeBudget"; id: string }
  | { type: "setCar"; id: string; patch: Partial<CarPlan> }
  | { type: "manualRates"; rates: { JPY: number; CNY: number } | null }
  | { type: "fujiWindow"; from: string; to: string }
  | { type: "travelMode"; id: string; mode: "drive" | "transit" }
  | { type: "toggleDone"; id: string }
  | { type: "setBudgets"; budgets: { darius: number; couple: number } }
  | { type: "reset" };

/** Pure reducer. Moves never overwrite booked items; displaced unbooked items go to the saved tray. */
export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "setLeg":
      return { ...s, legs: s.legs.map((l) => (l.id === a.id ? { ...l, ...a.patch } : l)) };
    case "addStop":
      return { ...s, legs: [...s.legs, a.leg] };
    case "removeLeg":
      return { ...s, legs: s.legs.filter((l) => l.id !== a.id || !l.optional) };
    case "schedule": {
      const act = a.activityId ? ACT_BY_ID[a.activityId] : undefined;
      const span = act?.fullDay ? 3 : Math.max(1, Math.min(a.span ?? act?.slots ?? 1, 3 - slotIndex(a.slot)));
      const item: ScheduleItem = { uid: newUid(), activityId: a.activityId, title: a.title, date: a.date, slot: span === 3 ? "morning" : a.slot, span, track: a.track, booked: false, kind: a.activityId ? "activity" : "custom" };
      return { ...s, schedule: [...s.schedule, item], saved: s.saved.filter((x) => x !== a.activityId) };
    }
    case "move": {
      const cur = s.schedule.find((i) => i.uid === a.uid);
      if (!cur) return s;
      if (cur.booked && !a.confirmed) return s; // booked items move only with explicit confirmation
      const withTrack = a.track ? s.schedule.map((i) => (i.uid === a.uid ? { ...i, track: a.track! } : i)) : s.schedule;
      const plan = planMove(withTrack, a.uid, a.date, a.slot);
      if (!plan.ok) return s;
      if (plan.displaced.length && !a.confirmed) return s;
      const displacedIds = new Set(plan.displaced.map((d) => d.uid));
      const moved = withTrack
        .filter((i) => !displacedIds.has(i.uid))
        .map((i) => (i.uid === a.uid ? { ...i, suggested: false, date: a.date, slot: i.span === 3 ? "morning" : a.slot } : i));
      const toTray = plan.displaced.map((d) => d.activityId).filter((x): x is string => !!x && !s.saved.includes(x));
      return { ...s, schedule: moved as ScheduleItem[], saved: [...s.saved, ...toTray] };
    }
    case "removeItem":
      return { ...s, schedule: s.schedule.filter((i) => i.uid !== a.uid || i.booked) };
    case "unschedule": {
      const cur = s.schedule.find((i) => i.uid === a.uid);
      if (!cur) return s;
      return { ...s, schedule: s.schedule.filter((i) => i.uid !== a.uid), saved: cur.activityId && !s.saved.includes(cur.activityId) ? [...s.saved, cur.activityId] : s.saved };
    }
    case "setItem":
      return { ...s, schedule: s.schedule.map((i) => (i.uid === a.uid ? { ...i, suggested: false, ...a.patch } : i)) };
    case "toggleSaved":
      return { ...s, saved: s.saved.includes(a.id) ? s.saved.filter((x) => x !== a.id) : [...s.saved, a.id] };
    case "toggleFav":
      return { ...s, favs: s.favs.includes(a.id) ? s.favs.filter((x) => x !== a.id) : [...s.favs, a.id] };
    case "vote": {
      const votes = { ...s.votes };
      if (a.v) votes[a.id] = a.v; else delete votes[a.id];
      return { ...s, votes };
    }
    case "addBudget":
      return { ...s, budget: [...s.budget, a.item] };
    case "removeBudget":
      return { ...s, budget: s.budget.filter((b) => b.id !== a.id) };
    case "setCar":
      return { ...s, cars: s.cars.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case "manualRates":
      return { ...s, manualRates: a.rates };
    case "fujiWindow":
      return { ...s, fujiWindow: { from: a.from, to: a.to } };
    case "travelMode":
      return { ...s, travelMode: { ...s.travelMode, [a.id]: a.mode } };
    case "setBudgets":
      return { ...s, budgets: a.budgets };
    case "toggleDone":
      return { ...s, done: { ...s.done, [a.id]: !s.done?.[a.id] } };
    case "reset":
      return defaultState();
  }
}

const KEY = "aa.state.v1";
/** 12 Nov: Darius asked for a blank plan that only fills from Explore. Clears suggestions and starter picks once; anything marked booked stays. */
export function applyPatches(s: AppState): AppState {
  s = clearStarterHotels(s);
  const done = s.patches ?? [];
  if (done.includes("blank")) return s;
  return {
    ...s,
    schedule: s.schedule.filter((i) => i.booked),
    legs: s.legs.filter((l) => !l.optional || l.stayBooked),
    cars: s.cars.filter((c) => c.id !== "car-tok"),
    patches: [...done, "blank"],
  };
}
const STARTER_HOTELS = ["homeinn-pujian", "at-hakata", "lagent-osaka-bay", "tokyo-east-apartment"];
/** 12 Nov: Darius will add the hotels they actually booked, so the example hotels go (unless ticked as booked). */
function clearStarterHotels(s: AppState): AppState {
  const done = s.patches ?? [];
  if (done.includes("nohotels")) return s;
  return {
    ...s,
    legs: s.legs.map((l) => (l.stay && STARTER_HOTELS.includes(l.stay.id) && !l.stayBooked ? { ...l, stay: undefined } : l)),
    patches: [...done, "nohotels"],
  };
}
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.v === 1 && Array.isArray(p.legs) && Array.isArray(p.schedule)) {
        const st: AppState = applyPatches({ ...baseState(), ...p });
        return st;
      }
    }
  } catch { /* ignore corrupt storage */ }
  return defaultState();
}
export function persistState(s: AppState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota/private mode */ }
}

/* ---------------- Budget ---------------- */
export const ADULTS: TravellerId[] = ["darius", "sister", "husband"];
export interface BudgetLine { id: string; label: string; category: BudgetItem["category"]; amount: number; currency: Currency; estimate: boolean; sharedBy: TravellerId[]; auto: boolean }

export function budgetLines(s: AppState): BudgetLine[] {
  const lines: BudgetLine[] = [];
  for (const l of s.legs) {
    const nights = Math.max(0, Math.round((Date.parse(l.depart) - Date.parse(l.arrive)) / 86400000));
    const st = l.stay;
    const amt = st?.cost ?? (st?.nightlyAud && nights ? { amount: st.nightlyAud * nights, currency: "AUD" as Currency } : null);
    if (!st || !amt) continue;
    const label = `${st.name} · ${nights} night${nights === 1 ? "" : "s"}`;
    if (st.split === "thirds") lines.push({ id: "acc-" + l.id, label, category: "accommodation", amount: amt.amount, currency: amt.currency, estimate: !st.cost, sharedBy: ADULTS, auto: true });
    else {
      lines.push({ id: "acc-" + l.id + "-d", label: label + " (Darius's room, half)", category: "accommodation", amount: amt.amount / 2, currency: amt.currency, estimate: !st.cost, sharedBy: ["darius"], auto: true });
      lines.push({ id: "acc-" + l.id + "-c", label: label + " (Zaynab & Ruhullah's room, half)", category: "accommodation", amount: amt.amount / 2, currency: amt.currency, estimate: !st.cost, sharedBy: ["sister", "husband"], auto: true });
    }
  }
  for (const c of s.cars) {
    const sb = ADULTS;
    lines.push({ id: c.id + "-rent", label: `${c.label}: rental + child seat`, category: "rental car", amount: c.days * (c.dailyJpy + c.childSeatJpyPerDay), currency: "JPY", estimate: true, sharedBy: sb, auto: true });
    lines.push({ id: c.id + "-fuel", label: `${c.label}: fuel (${c.km} km)`, category: "fuel", amount: Math.round((c.km * c.lPer100) / 100 * c.fuelJpyPerL), currency: "JPY", estimate: true, sharedBy: sb, auto: true });
    lines.push({ id: c.id + "-tolls", label: `${c.label}: tolls`, category: "tolls", amount: c.tollsJpy, currency: "JPY", estimate: true, sharedBy: sb, auto: true });
    lines.push({ id: c.id + "-park", label: `${c.label}: parking`, category: "parking", amount: c.parkingJpy, currency: "JPY", estimate: true, sharedBy: sb, auto: true });
  }
  for (const i of s.schedule) {
    const act = i.activityId ? ACT_BY_ID[i.activityId] : undefined;
    if (!act || act.cost.amount == null) continue;
    const who: TravellerId[] = i.track === "solo" ? ["darius"] : i.track === "family" ? ["sister", "husband"] : ADULTS;
    const amount = act.cost.basis === "per-adult" ? act.cost.amount * who.length : act.cost.amount;
    lines.push({ id: "tix-" + i.uid, label: `${act.title} (${i.track === "solo" ? "Darius" : i.track === "family" ? "Zaynab & Ruhullah" : "3 adults"})`, category: "tickets", amount, currency: act.cost.currency, estimate: act.cost.status !== "verified", sharedBy: who, auto: true });
  }
  for (const b of s.budget) lines.push({ id: b.id, label: b.label, category: b.category, amount: b.amount, currency: b.currency, estimate: b.estimate, sharedBy: b.split === "individual" && b.person ? [b.person] : b.sharedBy ?? ADULTS, auto: false });
  return lines;
}
