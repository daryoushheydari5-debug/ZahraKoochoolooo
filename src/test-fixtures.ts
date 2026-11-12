/** The old starter plan, kept only so the scheduling/safety tests have something to work on. The app itself starts blank. */
import { defaultState, type AppState } from "./state/store";
import { CITY_COLORS } from "./data/trip";
import { ACT_BY_ID } from "./data/activities";
import type { ScheduleItem, Slot, Track } from "./types";

const it = (date: string, activityId: string | undefined, slot: Slot, track: Track, extra: Partial<ScheduleItem> = {}): ScheduleItem => {
  const span = activityId && ACT_BY_ID[activityId]?.fullDay ? 3 : extra.span ?? 1;
  return { uid: `d-${date}-${activityId ?? extra.title}`, activityId, date, slot: span === 3 ? "morning" : slot, span, track, booked: false, kind: activityId ? "activity" : "custom", ...extra };
};

export function starterState(): AppState {
  const s = defaultState();
  return {
    ...s,
    legs: [
      ...s.legs,
      { id: "stop-izu", city: "stop", name: "Izu overnight (Ito)", arrive: "2027-01-04", depart: "2027-01-05", stayBooked: false, optional: true, color: CITY_COLORS.stop },
      { id: "stop-fuji", city: "stop", name: "Lake Kawaguchi overnight", arrive: "2027-01-07", depart: "2027-01-08", stayBooked: false, optional: true, color: CITY_COLORS.stop },
    ],
    saved: ["paraglide", "icecave", "owakudani", "miraikan", "aso"],
    cars: [...s.cars, { id: "car-tok", label: "Tokyo car for Mt Fuji", city: "tok", pickup: "2027-01-07", days: 3, dailyJpy: 10000, childSeatJpyPerDay: 1100, km: 350, lPer100: 7, fuelJpyPerL: 175, tollsJpy: 7000, parkingJpy: 6000 }],
    schedule: [
      it("2026-12-20", "maglev", "afternoon", "all"),
      it("2026-12-20", "escape", "evening", "solo"),
      it("2026-12-21", "lsnow", "morning", "all"),
      it("2026-12-22", "sci", "morning", "all", { span: 2 }),
      it("2026-12-24", "beppu", "morning", "all"),
      it("2026-12-25", "itoshima", "morning", "all", { span: 2 }),
      it("2026-12-25", "ezo", "evening", "all"),
      it("2026-12-26", "round1", "evening", "solo"),
      it("2026-12-27", "nara", "morning", "all"),
      it("2026-12-27", "noodle", "afternoon", "all"),
      it("2026-12-28", "usj", "morning", "all"),
      it("2026-12-29", "bat", "evening", "solo"),
      it("2026-12-30", "teamlab", "morning", "all"),
      it("2026-12-30", "kart", "afternoon", "solo"),
      it("2026-12-31", "gacha", "afternoon", "all"),
      it("2027-01-01", "snack", "afternoon", "all"),
      it("2027-01-02", "small", "morning", "all", { span: 2 }),
      it("2027-01-03", "gala", "morning", "solo"),
      it("2027-01-04", "izu", "afternoon", "all", { span: 2 }),
      it("2027-01-05", "taiko", "afternoon", "solo"),
      it("2027-01-06", "tdl", "morning", "all"),
      it("2027-01-07", "fuji-view", "morning", "all"),
      it("2027-01-08", "fujiq", "morning", "all"),
      it("2027-01-09", "fish", "afternoon", "all"),
      it("2027-01-10", "basho", "afternoon", "solo"),
    ],
  };
}
