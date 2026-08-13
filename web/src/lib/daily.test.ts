import { describe, expect, it } from "vitest";
import {
  canDig,
  canSeal,
  tileFromIndex,
  tileIndex,
  DIGS,
  FIELD,
  alreadyDug,
  chebyshev,
  dayIndex,
  digsLeft,
  isFound,
  isOver,
  shareText,
  temperatureAt,
  type Dig,
} from "@/lib/daily";

const treasure = { x: 5, y: 5 };
const dig = (x: number, y: number): Dig => ({
  tile: { x, y },
  temperature: temperatureAt({ x, y }, treasure),
});

describe("the temperature ladder", () => {
  it("reads found only when standing on the treasure", () => {
    expect(temperatureAt(treasure, treasure)).toBe(0);
    expect(temperatureAt({ x: 5, y: 6 }, treasure)).not.toBe(0);
  });

  it("bands Chebyshev distance in twos", () => {
    const expected: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 1],
      [3, 2],
      [4, 2],
      [5, 3],
      [6, 3],
      [7, 4],
      [8, 4],
      [9, 5],
      [10, 5],
    ];
    for (const [distance, band] of expected) {
      const guess = { x: Math.min(FIELD - 1, treasure.x + distance), y: treasure.y };
      if (chebyshev(guess, treasure) !== distance) continue;
      expect(temperatureAt(guess, treasure)).toBe(band);
    }
  });

  it("never reports a temperature outside the ladder anywhere on the map", () => {
    for (let x = 0; x < FIELD; x += 1) {
      for (let y = 0; y < FIELD; y += 1) {
        const t = temperatureAt({ x, y }, treasure);
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(5);
      }
    }
  });

  it("gets colder as you walk away, never warmer", () => {
    let previous = 0;
    for (let step = 0; step <= 5; step += 1) {
      const t = temperatureAt({ x: 5 + step, y: 5 }, treasure);
      expect(t).toBeGreaterThanOrEqual(previous);
      previous = t;
    }
  });
});

describe("the state of a hunt", () => {
  it("counts down from six digs", () => {
    expect(digsLeft([])).toBe(DIGS);
    expect(digsLeft([dig(0, 0), dig(1, 1)])).toBe(DIGS - 2);
  });

  it("ends when the treasure is found", () => {
    const digs = [dig(0, 0), dig(5, 5)];
    expect(isFound(digs)).toBe(true);
    expect(isOver(digs)).toBe(true);
  });

  it("ends when the digs run out", () => {
    const digs = [dig(0, 0), dig(0, 1), dig(0, 2), dig(0, 3), dig(0, 4), dig(0, 6)];
    expect(isFound(digs)).toBe(false);
    expect(isOver(digs)).toBe(true);
  });

  it("knows a tile has already been dug", () => {
    const digs = [dig(3, 4)];
    expect(alreadyDug(digs, { x: 3, y: 4 })).toBe(true);
    expect(alreadyDug(digs, { x: 4, y: 3 })).toBe(false);
  });
});

describe("a shared result must not spoil the day", () => {
  const played = [dig(0, 0), dig(9, 2), dig(6, 6), dig(5, 5)];

  it("says how it went", () => {
    const text = shareText(20_800, played);
    expect(text).toContain("4/6");
    expect(text).toMatch(/AZIMUTH #\d+/);
  });

  it("marks an unfinished hunt as a miss", () => {
    const text = shareText(20_800, [dig(0, 0)]);
    expect(text).toContain("X/6");
  });

  it("carries one square per dig", () => {
    const trail = shareText(20_800, played).split("\n")[1];
    expect([...trail].length).toBe(played.length);
  });

  it("never leaks a coordinate", () => {
    const text = shareText(20_800, played);
    for (const entry of played) {
      expect(text).not.toContain(`${entry.tile.x},${entry.tile.y}`);
    }
    expect(text).not.toMatch(/\b(?:10|[0-9]),\s?(?:10|[0-9])\b/);
  });

  it("gives two hunters with different paths the same shape of result", () => {
    const other = [dig(10, 10), dig(1, 9), dig(4, 4), dig(5, 5)];
    const a = shareText(20_800, played).split("\n")[0];
    const b = shareText(20_800, other).split("\n")[0];
    expect(a).toBe(b);
  });
});

describe("day numbering", () => {
  it("advances once every twenty four hours", () => {
    const noon = 20_800 * 86_400 + 43_200;
    expect(dayIndex(noon)).toBe(20_800);
    expect(dayIndex(noon + 86_400)).toBe(20_801);
  });
});

describe("a sealed guess travels as one number", () => {
  it("folds a tile into x + FIELD * y and back", () => {
    for (let y = 0; y < FIELD; y += 1) {
      for (let x = 0; x < FIELD; x += 1) {
        expect(tileFromIndex(tileIndex({ x, y }))).toEqual({ x, y });
      }
    }
  });

  it("gives every tile on the map a distinct number", () => {
    const seen = new Set<number>();
    for (let y = 0; y < FIELD; y += 1) {
      for (let x = 0; x < FIELD; x += 1) seen.add(tileIndex({ x, y }));
    }
    expect(seen.size).toBe(FIELD * FIELD);
    expect(Math.max(...seen)).toBe(FIELD * FIELD - 1);
  });
});

describe("who is offered a last word", () => {
  const miss = (x: number, y: number): Dig => ({ tile: { x, y }, temperature: 4 });
  const spent = [miss(0, 0), miss(1, 1), miss(2, 2), miss(3, 3), miss(4, 4), miss(5, 5)];

  it("offers it once all six digs are spent and none of them landed", () => {
    expect(canSeal(spent, false)).toBe(true);
  });

  it("does not offer it while digs remain", () => {
    expect(canSeal(spent.slice(0, 5), false)).toBe(false);
  });

  it("does not offer it to a hunter who already dug the treasure up", () => {
    const found = [...spent.slice(0, 5), { tile: { x: 9, y: 9 }, temperature: 0 as const }];
    expect(canSeal(found, false)).toBe(false);
  });

  it("does not offer a second one", () => {
    expect(canSeal(spent, true)).toBe(false);
  });
});

describe("an unread answer holds the board", () => {
  const read = (x: number, y: number): Dig => ({ tile: { x, y }, temperature: 4 });
  const unread = (x: number, y: number): Dig => ({ tile: { x, y }, temperature: null });

  it("allows a dig when every answer so far has arrived", () => {
    expect(canDig([read(0, 0), read(1, 1)])).toBe(true);
  });

  // The unread answer may be FOUND. Spending the rest of a hunt looking for a
  // treasure already under your feet is the worst thing this board can do.
  it("refuses a dig while an earlier answer is still unread", () => {
    expect(canDig([read(0, 0), unread(1, 1)])).toBe(false);
  });

  it("refuses a dig once the hunt is over", () => {
    expect(canDig([{ tile: { x: 2, y: 2 }, temperature: 0 }])).toBe(false);
    expect(canDig([read(0, 0), read(1, 0), read(2, 0), read(3, 0), read(4, 0), read(5, 0)])).toBe(false);
  });

  it("allows the first dig of the day", () => {
    expect(canDig([])).toBe(true);
  });

  it("does not offer a sealed guess until every answer has been read", () => {
    const five = [read(0, 0), read(1, 0), read(2, 0), read(3, 0), read(4, 0)];
    expect(canSeal([...five, unread(5, 0)], false)).toBe(false);
    expect(canSeal([...five, read(5, 0)], false)).toBe(true);
  });
});
