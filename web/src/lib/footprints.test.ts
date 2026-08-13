import { describe, expect, it } from "vitest";
import { footprintAt, footprintsFrom, type RawDig } from "@/lib/footprints";

const ADA = "0xAda0000000000000000000000000000000000000";
const BEN = "0xBen0000000000000000000000000000000000000";
const ME = "0xMe00000000000000000000000000000000000000";

const dug = (hunter: string, x: number, y: number): RawDig => ({ hunter, x, y });

describe("footprints show where rivals dug and nothing else", () => {
  it("marks a tile a rival opened", () => {
    const marks = footprintsFrom([dug(ADA, 3, 4)], ME);
    expect(marks).toEqual([{ tile: { x: 3, y: 4 }, hunters: 1 }]);
  });

  it("leaves the hunter's own digs off their own board", () => {
    const marks = footprintsFrom([dug(ME, 1, 1), dug(ADA, 2, 2)], ME);
    expect(marks).toHaveLength(1);
    expect(marks[0].tile).toEqual({ x: 2, y: 2 });
  });

  it("ignores case when deciding whose dig it is", () => {
    expect(footprintsFrom([dug(ME.toUpperCase(), 1, 1)], ME.toLowerCase())).toEqual([]);
  });

  it("counts distinct rivals on a shared tile", () => {
    const marks = footprintsFrom([dug(ADA, 5, 5), dug(BEN, 5, 5)], ME);
    expect(marks).toEqual([{ tile: { x: 5, y: 5 }, hunters: 2 }]);
  });

  it("shows every rival to a visitor with no wallet", () => {
    const marks = footprintsFrom([dug(ADA, 0, 0), dug(BEN, 1, 1)], null);
    expect(marks).toHaveLength(2);
  });

  it("carries no temperature of any kind", () => {
    const [mark] = footprintsFrom([dug(ADA, 3, 4)], ME);
    expect(Object.keys(mark)).toEqual(["tile", "hunters"]);
  });

  it("finds a mark by tile and reports none where nobody dug", () => {
    const marks = footprintsFrom([dug(ADA, 3, 4)], ME);
    expect(footprintAt(marks, { x: 3, y: 4 })?.hunters).toBe(1);
    expect(footprintAt(marks, { x: 9, y: 9 })).toBe(null);
  });
});
