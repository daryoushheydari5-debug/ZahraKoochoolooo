import { baseState, defaultState, reducer } from "../state/store";
import { fillEmpty } from "./fill";
import { detectConflicts, overlaps } from "./schedule";
import { ACT_BY_ID } from "../data/activities";

describe("fillEmpty", () => {
  it("fills the default plan without clashes or touching existing items", () => {
    const base = baseState();
    const added = fillEmpty(base.schedule, base.legs);
    expect(added.length).toBeGreaterThan(20);
    for (const n of added) {
      expect(n.suggested).toBe(true);
      expect(ACT_BY_ID[n.activityId!]).toBeTruthy();
      expect(base.schedule.some((i) => overlaps(i, n))).toBe(false);
    }
    expect(detectConflicts([...base.schedule, ...added], base.legs).filter((c) => c.level === "error")).toEqual([]);
    if ((globalThis as any).process?.env?.DUMP) {
      const all = [...base.schedule, ...added].sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
      console.log(all.map((i) => `${i.date} ${i.slot.padEnd(9)} ${i.track.padEnd(6)} ${i.suggested ? "*" : " "}${i.activityId ?? i.title}`).join("\n"));
    }
  });
  it("is idempotent and never overwrites a booked item", () => {
    let s = defaultState();
    const before = s.schedule.length;
    s = reducer(s, { type: "fill" });
    expect(s.schedule.length).toBe(before);
    const booked = s.schedule.find((i) => !i.suggested)!;
    s = reducer(s, { type: "setItem", uid: booked.uid, patch: { booked: true } });
    s = reducer(s, { type: "clearSuggestions" });
    expect(s.schedule.every((i) => !i.suggested)).toBe(true);
    expect(s.schedule.find((i) => i.uid === booked.uid)).toBeTruthy();
    s = reducer(s, { type: "fill" });
    expect(s.schedule.filter((i) => i.suggested).length).toBeGreaterThan(20);
  });

  it("adds Haichang Ocean Park to an older saved plan without touching booked items", async () => {
    const { applyPatches } = await import("../state/store");
    const old = { ...baseState(), patches: undefined, saved: [] as string[], schedule: baseState().schedule.map((i) => (i.activityId === "haichang" ? { ...i, activityId: "sci" } : i)) };
    const st = applyPatches(old);
    expect(st.schedule.find((i) => i.activityId === "haichang")?.date).toBe("2026-12-22");
    expect(st.saved).toContain("sci");
    expect(applyPatches(st)).toBe(st);
    const booked = { ...old, schedule: old.schedule.map((i) => (i.activityId === "sci" ? { ...i, booked: true } : i)) };
    const b = applyPatches(booked);
    expect(b.schedule.some((i) => i.activityId === "haichang")).toBe(false);
    expect(b.saved).toContain("haichang");
  });
});
