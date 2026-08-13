import { describe, expect, it } from "vitest";
import { allTimeTable, type DayStandings } from "@/lib/all-time";
import type { Standing } from "@/lib/standings";

const row = (over: Partial<Standing> & { hunter: string }): Standing => ({
  rank: 1,
  callsign: null,
  found: false,
  digsUsed: 6,
  closest: 3,
  distances: [3],
  closestOn: 1,
  score: 56,
  ...over,
});

const day = (day: number, standings: Standing[]): DayStandings => ({ day, standings });

describe("allTimeTable", () => {
  it("is empty with no revealed days", () => {
    expect(allTimeTable([])).toEqual([]);
  });

  it("sums points across days", () => {
    const table = allTimeTable([
      day(1, [row({ hunter: "0xaa", score: 70 })]),
      day(2, [row({ hunter: "0xaa", score: 56 })]),
    ]);
    expect(table[0].points).toBe(126);
    expect(table[0].daysPlayed).toBe(2);
  });

  it("ranks by points", () => {
    const table = allTimeTable([
      day(1, [row({ hunter: "0xaa", score: 40 }), row({ hunter: "0xbb", score: 90 })]),
    ]);
    expect(table.map((r) => r.hunter)).toEqual(["0xbb", "0xaa"]);
    expect(table.map((r) => r.rank)).toEqual([1, 2]);
  });

  it("rewards turning up: two ordinary days can beat one great one", () => {
    const table = allTimeTable([
      day(1, [row({ hunter: "0xaa", score: 56 }), row({ hunter: "0xbb", score: 100, found: true, digsUsed: 1 })]),
      day(2, [row({ hunter: "0xaa", score: 56 })]),
    ]);
    expect(table[0].hunter).toBe("0xaa");
  });

  it("counts treasures and keeps the best find", () => {
    const table = allTimeTable([
      day(1, [row({ hunter: "0xaa", found: true, digsUsed: 4, score: 85 })]),
      day(2, [row({ hunter: "0xaa", found: true, digsUsed: 2, score: 95 })]),
      day(3, [row({ hunter: "0xaa", score: 56 })]),
    ]);
    expect(table[0].treasures).toBe(2);
    expect(table[0].bestFind).toBe(2);
  });

  it("leaves best find null for someone who never found one", () => {
    expect(allTimeTable([day(1, [row({ hunter: "0xaa" })])])[0].bestFind).toBeNull();
  });

  it("keeps the best daily placement", () => {
    const table = allTimeTable([
      day(1, [row({ hunter: "0xaa", rank: 5 })]),
      day(2, [row({ hunter: "0xaa", rank: 2 })]),
    ]);
    expect(table[0].bestRank).toBe(2);
  });

  it("keeps a callsign claimed after earlier days", () => {
    const table = allTimeTable([
      day(1, [row({ hunter: "0xaa", callsign: null })]),
      day(2, [row({ hunter: "0xaa", callsign: "enoch" })]),
    ]);
    expect(table[0].callsign).toBe("enoch");
  });

  it("treats a wallet as one hunter regardless of case", () => {
    const table = allTimeTable([
      day(1, [row({ hunter: "0xAA" })]),
      day(2, [row({ hunter: "0xaa" })]),
    ]);
    expect(table).toHaveLength(1);
    expect(table[0].daysPlayed).toBe(2);
  });

  describe("ties", () => {
    it("breaks equal points by treasures", () => {
      const table = allTimeTable([
        day(1, [
          row({ hunter: "0xaa", score: 75, found: true, digsUsed: 6 }),
          row({ hunter: "0xbb", score: 75 }),
        ]),
      ]);
      expect(table[0].hunter).toBe("0xaa");
    });

    it("prefers fewer days for the same points and treasures", () => {
      const table = allTimeTable([
        day(1, [row({ hunter: "0xaa", score: 100 }), row({ hunter: "0xbb", score: 50 })]),
        day(2, [row({ hunter: "0xbb", score: 50 })]),
      ]);
      expect(table.map((r) => r.hunter)).toEqual(["0xaa", "0xbb"]);
    });

    it("is stable when hunts are genuinely identical", () => {
      const forward = allTimeTable([day(1, [row({ hunter: "0xbb" }), row({ hunter: "0xaa" })])]);
      const backward = allTimeTable([day(1, [row({ hunter: "0xaa" }), row({ hunter: "0xbb" })])]);
      expect(forward.map((r) => r.hunter)).toEqual(backward.map((r) => r.hunter));
    });
  });
});
