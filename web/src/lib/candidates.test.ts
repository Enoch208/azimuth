import { describe, expect, it } from "vitest";
import { FIELD_CELLS, octantFrom, survivingCells } from "@/lib/candidates";
import type { BearingRecord, ProbeRecord } from "@/lib/hunt-client";
import type { Coordinate } from "@/lib/types";

const SECRET = { x: 41, y: 27 };

const squared = (a: Coordinate, b: Coordinate) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

// Replay a hunt against a known secret the way the contract would answer it.
function play(cells: Coordinate[]): ProbeRecord[] {
  let best = Number.POSITIVE_INFINITY;
  return cells.map((cell, index) => {
    const distance = squared(cell, SECRET);
    const outcome = distance === 0 ? "found" : distance < best ? "warmer" : "colder";
    best = Math.min(best, distance);
    return { cell, outcome, at: index } as ProbeRecord;
  });
}

describe("the surviving region only ever contains the truth", () => {
  it("starts as the whole field", () => {
    expect(survivingCells([], [])).toHaveLength(FIELD_CELLS);
  });

  it("always keeps the real cell, however many probes are played", () => {
    const probes = play([
      { x: 0, y: 0 },
      { x: 63, y: 63 },
      { x: 32, y: 32 },
      { x: 48, y: 16 },
      { x: 40, y: 28 },
      { x: 12, y: 55 },
    ]);
    const live = survivingCells(probes, []);
    expect(live.some((c) => c.x === SECRET.x && c.y === SECRET.y)).toBe(true);
  });

  it("shrinks as evidence accumulates", () => {
    const cells = [
      { x: 0, y: 0 },
      { x: 63, y: 63 },
      { x: 32, y: 32 },
      { x: 48, y: 16 },
      { x: 40, y: 28 },
    ];
    const sizes = cells.map((_, i) => survivingCells(play(cells.slice(0, i + 1)), []).length);
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    }
    expect(sizes.at(-1)).toBeLessThan(FIELD_CELLS / 4);
  });

  it("never keeps a cell that was already probed and missed", () => {
    const probes = play([{ x: 10, y: 10 }, { x: 20, y: 20 }]);
    const live = survivingCells(probes, []);
    expect(live.some((c) => c.x === 10 && c.y === 10)).toBe(false);
    expect(live.some((c) => c.x === 20 && c.y === 20)).toBe(false);
  });

  it("collapses to the exact cell once a probe finds it", () => {
    const probes = play([{ x: 5, y: 5 }, SECRET]);
    expect(survivingCells(probes, [])).toEqual([SECRET]);
  });

  it("applies a bearing as an octant constraint and keeps the truth", () => {
    const origin = { x: 20, y: 40 };
    const bearing: BearingRecord = { origin, bearing: octantFrom(origin, SECRET), at: 0 };
    const live = survivingCells([], [bearing]);

    expect(live.length).toBeLessThan(FIELD_CELLS / 2);
    expect(live.some((c) => c.x === SECRET.x && c.y === SECRET.y)).toBe(true);
    for (const cell of live) {
      expect(octantFrom(origin, cell)).toBe(bearing.bearing);
    }
  });

  it("combines probes and bearings without ever dropping the truth", () => {
    const origin = { x: 8, y: 8 };
    const bearing: BearingRecord = { origin, bearing: octantFrom(origin, SECRET), at: 0 };
    const probes = play([
      { x: 0, y: 0 },
      { x: 63, y: 0 },
      { x: 32, y: 32 },
    ]);
    const live = survivingCells(probes, [bearing]);
    expect(live.some((c) => c.x === SECRET.x && c.y === SECRET.y)).toBe(true);
  });

  it("holds for many different secrets", () => {
    for (const secret of [
      { x: 0, y: 0 },
      { x: 63, y: 63 },
      { x: 1, y: 62 },
      { x: 33, y: 7 },
    ]) {
      let best = Number.POSITIVE_INFINITY;
      const probes = [
        { x: 30, y: 30 },
        { x: 10, y: 50 },
        { x: 55, y: 20 },
      ].map((cell, index) => {
        const distance = squared(cell, secret);
        const outcome = distance === 0 ? "found" : distance < best ? "warmer" : "colder";
        best = Math.min(best, distance);
        return { cell, outcome, at: index } as ProbeRecord;
      });
      const live = survivingCells(probes, []);
      expect(live.some((c) => c.x === secret.x && c.y === secret.y)).toBe(true);
    }
  });
});
