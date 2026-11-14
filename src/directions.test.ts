import { describe, expect, it } from "vitest";
import { estimate, fmtMins, googleDirections } from "./lib/directions";

const tokyo = { lat: 35.681, lon: 139.767 }, shibuya = { lat: 35.658, lon: 139.701 }, osaka = { lat: 34.733, lon: 135.500 };

describe("directions", () => {
  it("suggests walking only when close and the shinkansen for long trips", () => {
    const near = estimate(tokyo, { lat: 35.685, lon: 139.770 }, "jp");
    expect(near.ways.map((w) => w.label)).toEqual(["Walk"]);
    const mid = estimate(tokyo, shibuya, "jp");
    expect(mid.ways.some((w) => w.label === "Taxi")).toBe(true);
    const far = estimate(osaka, tokyo, "jp");
    const train = far.ways.find((w) => w.label.startsWith("Shinkansen"))!;
    expect(train.minutes).toBeGreaterThan(150); expect(train.minutes).toBeLessThan(240);
    expect(far.ways.some((w) => w.label === "Taxi")).toBe(false);
  });
  it("formats times and builds Google links", () => {
    expect(fmtMins(3)).toBe("5 min");
    expect(fmtMins(95)).toBe("1 h 30 min");
    const u = googleDirections("Shibuya Sky", "transit", tokyo);
    expect(u).toContain("destination=Shibuya+Sky"); expect(u).toContain("origin=35.681%2C139.767"); expect(u).toContain("travelmode=transit");
    expect(googleDirections("x", "walking")).not.toContain("origin");
  });
});
