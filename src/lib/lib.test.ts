import { addDays, diffDays, parseISO, dateRange } from "./dates";
import { validateLegs, detectConflicts, planMove, cityOn, travelOn, TRIP_DAYS } from "./schedule";
import { defaultState, reducer, budgetLines } from "../state/store";
import { scoreFujiDay, rankFujiDays, fetchForecast, type ForecastResponse } from "./weather";
import { convert, fetchRates, isStale } from "./fx";
import { parseCommons } from "./photos";
import { suggestSwaps } from "./swaps";
import type { ScheduleItem } from "../types";

const res = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body }) as Response;

describe("dates", () => {
  it("handles month/year boundaries and rejects bad dates", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(diffDays("2026-12-20", "2027-01-10")).toBe(21);
    expect(Number.isNaN(parseISO("2026-02-30"))).toBe(true);
    expect(dateRange("2026-12-20", "2027-01-10")).toHaveLength(22);
    expect(TRIP_DAYS).toHaveLength(22);
  });
});

describe("legs", () => {
  it("default route is valid and contiguous", () => {
    const s = defaultState();
    expect(validateLegs(s.legs).filter((p) => p.level === "error")).toEqual([]);
    expect(cityOn("2026-12-20", s.legs)).toBe("sha");
    expect(cityOn("2027-01-10", s.legs)).toBe("tok");
    expect(travelOn("2026-12-23", s.legs)?.to.city).toBe("fuk");
  });
  it("flags overlaps, gaps, reversed and out-of-trip dates", () => {
    const s = defaultState();
    const legs = s.legs.map((l) => (l.id === "leg-fuk" ? { ...l, arrive: "2026-12-22" } : l.id === "leg-osa" ? { ...l, arrive: "2026-12-27" } : l));
    const msgs = validateLegs(legs).map((p) => p.msg).join("\n");
    expect(msgs).toMatch(/overlap/);
    expect(msgs).toMatch(/No stay booked/);
    const bad = validateLegs([{ ...s.legs[0], arrive: "2026-12-25", depart: "2026-12-21" }, { ...s.legs[1], depart: "2027-02-01" }]);
    expect(bad.some((p) => /after arrival/.test(p.msg))).toBe(true);
    expect(bad.some((p) => /between/.test(p.msg))).toBe(true);
  });
});

describe("calendar conflicts and moves", () => {
  it("default plan has no hard clashes", () => {
    const s = defaultState();
    expect(detectConflicts(s.schedule, s.legs).filter((p) => p.level === "error")).toEqual([]);
  });
  it("solo and family tracks can run in parallel, 'all' blocks both", () => {
    const a: ScheduleItem = { uid: "a", date: "2026-12-30", slot: "afternoon", span: 1, track: "solo", booked: false, title: "x" };
    const b: ScheduleItem = { ...a, uid: "b", track: "family" };
    const c: ScheduleItem = { ...a, uid: "c", track: "all" };
    expect(detectConflicts([a, b], defaultState().legs).filter((p) => p.level === "error")).toHaveLength(0);
    expect(detectConflicts([a, b, c], defaultState().legs).filter((p) => p.level === "error")).toHaveLength(2);
  });
  it("warns when an activity is in the wrong city", () => {
    const s = defaultState();
    const usj = s.schedule.find((i) => i.activityId === "usj")!;
    const moved = s.schedule.map((i) => (i === usj ? { ...i, date: "2027-01-02" } : i));
    expect(detectConflicts(moved, s.legs).some((p) => /Osaka/.test(p.msg))).toBe(true);
  });
  it("never overwrites booked items", () => {
    let s = defaultState();
    const tdl = s.schedule.find((i) => i.activityId === "tdl")!;
    s = reducer(s, { type: "setItem", uid: tdl.uid, patch: { booked: true } });
    const fuji = s.schedule.find((i) => i.activityId === "fuji-view")!;
    const plan = planMove(s.schedule, fuji.uid, tdl.date, "morning");
    expect(plan.ok).toBe(false);
    expect(plan.blockedByBooked.map((b) => b.uid)).toContain(tdl.uid);
    const after = reducer(s, { type: "move", uid: fuji.uid, date: tdl.date, slot: "morning", confirmed: true });
    expect(after).toBe(s);
  });
  it("booked items themselves need confirmation to move", () => {
    let s = defaultState();
    const usj = s.schedule.find((i) => i.activityId === "usj")!;
    s = reducer(s, { type: "setItem", uid: usj.uid, patch: { booked: true } });
    expect(reducer(s, { type: "move", uid: usj.uid, date: "2026-12-27", slot: "morning" })).toBe(s);
  });
  it("moving onto unbooked items requires confirmation, then sends them to the saved tray", () => {
    const s = defaultState();
    const fuji = s.schedule.find((i) => i.activityId === "fuji-view")!;
    expect(reducer(s, { type: "move", uid: fuji.uid, date: "2027-01-09", slot: "morning" })).toBe(s);
    const after = reducer(s, { type: "move", uid: fuji.uid, date: "2027-01-09", slot: "morning", confirmed: true });
    expect(after.schedule.find((i) => i.uid === fuji.uid)!.date).toBe("2027-01-09");
    expect(after.saved).toContain("fish");
    expect(after.schedule.some((i) => i.activityId === "fish")).toBe(false);
  });
  it("saving without scheduling and unscheduling back to the tray", () => {
    let s = defaultState();
    s = reducer(s, { type: "toggleSaved", id: "teamlab" });
    expect(s.saved).toContain("teamlab");
    const kart = s.schedule.find((i) => i.activityId === "kart")!;
    s = reducer(s, { type: "unschedule", uid: kart.uid });
    expect(s.saved).toContain("kart");
    s = reducer(s, { type: "schedule", activityId: "kart", date: "2026-12-31", slot: "evening", track: "solo" });
    expect(s.saved).not.toContain("kart");
  });
  it("full-day activities fill all three slots", () => {
    const s = reducer(defaultState(), { type: "schedule", activityId: "owakudani", date: "2027-01-05", slot: "evening", track: "all" });
    const added = s.schedule[s.schedule.length - 1];
    expect(added.span).toBe(1);
    const s2 = reducer(defaultState(), { type: "schedule", activityId: "usj", date: "2026-12-27", slot: "evening", track: "all" });
    const usj2 = s2.schedule[s2.schedule.length - 1];
    expect(usj2.slot).toBe("morning");
    expect(usj2.span).toBe(3);
  });
});

describe("budget", () => {
  it("includes accommodation, both rental cars, fuel, tolls, parking and tickets", () => {
    const lines = budgetLines(defaultState());
    const cats = new Set(lines.map((l) => l.category));
    for (const c of ["accommodation", "rental car", "fuel", "tolls", "parking", "tickets"]) expect(cats.has(c as never)).toBe(true);
    const fukCar = lines.find((l) => l.id === "car-fuk-rent")!;
    expect(fukCar.amount).toBe(3 * (8000 + 1100));
    const solo = lines.find((l) => l.label.startsWith("Go-karts"))!;
    expect(solo.sharedBy).toEqual(["darius"]);
  });
});

/* ---------------- Weather ---------------- */
function hourlyFixture(dates: string[], f: (date: string, hr: number) => Partial<Record<string, number>>): ForecastResponse {
  const time: string[] = [], o: Record<string, number[]> = { cloud_cover: [], cloud_cover_low: [], visibility: [], precipitation_probability: [], precipitation: [], wind_gusts_10m: [], snowfall: [], temperature_2m: [] };
  for (const d of dates) for (let h = 0; h < 24; h++) {
    time.push(`${d}T${String(h).padStart(2, "0")}:00`);
    const v = { cloud_cover: 20, cloud_cover_low: 10, visibility: 30000, precipitation_probability: 5, precipitation: 0, wind_gusts_10m: 15, snowfall: 0, temperature_2m: 2, ...f(d, h) };
    for (const k of Object.keys(o)) o[k].push(v[k as keyof typeof v] as number);
  }
  return { latitude: 35.5, longitude: 138.76, hourly: { time, ...(o as any) } };
}

describe("Mt Fuji ranking", () => {
  const today = "2027-01-01";
  it("says 'Forecast not available yet' beyond the horizon and never invents values", () => {
    const d = scoreFujiDay(hourlyFixture(["2027-01-02"], () => ({})), "2027-01-30", today);
    expect(d.available).toBe(false);
    expect(d.reason).toBe("Forecast not available yet");
    expect(d.score).toBeUndefined();
    const r = rankFujiDays(null, ["2027-01-05"], today);
    expect(r.best).toBeUndefined();
    expect(r.days[0].reason).toBe("Forecast not available yet");
  });
  it("ranks the clear day first and the next best as alternative", () => {
    const dates = ["2027-01-03", "2027-01-04", "2027-01-05"];
    const fx = hourlyFixture(dates, (d) => (d === "2027-01-03" ? { cloud_cover: 95, cloud_cover_low: 90, precipitation_probability: 80 } : d === "2027-01-04" ? { cloud_cover: 5 } : { cloud_cover: 40 }));
    const r = rankFujiDays(fx, dates, today);
    expect(r.best?.date).toBe("2027-01-04");
    expect(r.alternative?.date).toBe("2027-01-05");
    expect(r.days[0].notes.join(" ")).toMatch(/cloudy/);
  });
  it("downgrades driving when snow is forecast and lowers confidence with lead time", () => {
    const fx = hourlyFixture(["2027-01-02", "2027-01-03"], (d) => (d === "2027-01-03" ? { snowfall: 1 } : {}));
    const d = scoreFujiDay(fx, "2027-01-03", today);
    expect(d.driving).toBe("poor");
    expect(d.confidence).toBe("high");
    const far = scoreFujiDay(hourlyFixture(["2027-01-13"], () => ({})), "2027-01-13", today);
    expect(far.confidence).toBe("low");
  });
  it("falls back to cached data marked stale, and errors clearly with no cache", async () => {
    const pts = [{ lat: 35.5, lon: 138.76 }];
    const fail = (async () => { throw new TypeError("blocked"); }) as unknown as typeof fetch;
    await expect(fetchForecast(pts, true, { fetchImpl: fail })).rejects.toThrow(/Couldn't reach/);
    const good = (async () => res({ latitude: 1, longitude: 1, hourly: { time: [] } })) as unknown as typeof fetch;
    const first = await fetchForecast(pts, true, { fetchImpl: good, now: 1000 });
    expect(first.fromCache).toBe(false);
    const second = await fetchForecast(pts, true, { fetchImpl: fail, now: 1000 + 4 * 3600e3 });
    expect(second.stale).toBe(true);
  });
});

describe("currency", () => {
  it("converts both ways", () => {
    const r = { JPY: 100, CNY: 5 };
    expect(convert(1000, "JPY", "AUD", r)).toBeCloseTo(10);
    expect(convert(10, "AUD", "CNY", r)).toBeCloseTo(50);
    expect(convert(50, "CNY", "JPY", r)).toBeCloseTo(1000);
  });
  it("falls back to the second provider and records the timestamp", async () => {
    const calls: string[] = [];
    const f = (async (u: string) => {
      calls.push(u);
      if (u.includes("frankfurter")) return res({}, false, 503);
      return res({ result: "success", time_last_update_unix: 1_800_000_000, rates: { JPY: 99.5, CNY: 4.71 } });
    }) as unknown as typeof fetch;
    const r = await fetchRates(f, 1_800_000_500_000);
    expect(calls).toHaveLength(2);
    expect(r.JPY).toBe(99.5);
    expect(r.asOf).toBe(1_800_000_000_000);
    expect(isStale(r, r.asOf + 4 * 86400000)).toBe(true);
    expect(isStale(r, r.asOf + 3600000)).toBe(false);
  });
  it("throws when every provider fails (no made-up rate)", async () => {
    const f = (async () => res({}, false, 500)) as unknown as typeof fetch;
    await expect(fetchRates(f)).rejects.toThrow();
  });
});

describe("photos", () => {
  it("keeps only openly licensed images with attribution", () => {
    const p = parseCommons({ query: { pages: {
      1: { index: 1, title: "File:A.jpg", imageinfo: [{ thumburl: "u1", descriptionurl: "d1", extmetadata: { LicenseShortName: { value: "All rights reserved" } } }] },
      2: { index: 2, title: "File:B.jpg", imageinfo: [{ thumburl: "u2", descriptionurl: "d2", extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" }, Artist: { value: "<a href='x'>Jane</a>" } } }] },
    } } });
    expect(p).toMatchObject({ url: "u2", author: "Jane", license: "CC BY-SA 4.0", title: "B.jpg" });
    expect(parseCommons({})).toBeNull();
  });
});

describe("weather swaps", () => {
  it("suggests a dry day in the same city and indoor alternatives, but only where a forecast exists", () => {
    const s = defaultState();
    const wx = (date: string) => (date === "2026-12-30" ? null : { date, code: 61, tMax: 5, tMin: 0, precip: date === "2027-01-09" ? 12 : 0, precipProb: date === "2027-01-09" ? 90 : 10, gust: 10, snow: 0 });
    const swaps = suggestSwaps(s.schedule, s.legs, wx);
    const fish = swaps.find((x) => x.title.startsWith("Fishing"))!;
    expect(fish.date).toBe("2027-01-09");
    expect(fish.moveTo).toBeDefined();
    expect(fish.indoorAlt!.length).toBeGreaterThan(0);
    expect(swaps.some((x) => x.date === "2026-12-30")).toBe(false);
  });
});
