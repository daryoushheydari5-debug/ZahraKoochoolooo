import { describe, expect, it } from "vitest";
import { PLACES } from "./data/places";
import { ACT_BY_ID, ALL_ACTIVITIES } from "./data/activities";

describe("map places", () => {
  it("have unique ids, sane coordinates and real linked activities", () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    for (const p of PLACES) {
      expect(p.lat).toBeGreaterThan(24); expect(p.lat).toBeLessThan(46);
      expect(p.lon).toBeGreaterThan(119); expect(p.lon).toBeLessThan(146);
      if (p.activity) { expect(ACT_BY_ID[p.activity], p.id).toBeTruthy(); expect(ALL_ACTIVITIES.some((a) => a.id === p.activity), p.id).toBe(true); }
    }
  });
});
