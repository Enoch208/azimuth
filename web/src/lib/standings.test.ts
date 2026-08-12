import { describe, expect, it } from "vitest";
import type { Tile } from "@/lib/daily";
import {
  foundScore,
  huntScore,
  missLine,
  missScore,
  standingsFor,
  type RevealedTrail,
} from "@/lib/standings";

const TREASURE: Tile = { x: 5, y: 5 };

// Build a trail whose digs sit at the given Chebyshev distances from TREASURE.
// Offsetting along x keeps the maths obvious and stays on an 11x11 board.
function trailAt(hunter: string, distances: number[]): RevealedTrail {
  return {
    hunter,
    callsign: null,
    digs: distances.map((d) => ({
      tile: { x: TREASURE.x + d, y: TREASURE.y },
      temperature: null,
    })),
  };
}

describe("scoring", () => {
  it("pays a find on the ladder in the brief", () => {
    expect([1, 2, 3, 4, 5, 6].map(foundScore)).toEqual([100, 95, 90, 85, 80, 75]);
  });

  it("pays a miss on the ladder in the brief", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(missScore)).toEqual([
      70, 63, 56, 49, 42, 35, 28, 21, 14, 7,
    ]);
  });

  it("always puts the worst find above the best miss", () => {
    expect(foundScore(6)).toBeGreaterThan(missScore(1));
  });

  it("scores a hunter who never dug at zero", () => {
    expect(missScore(null)).toBe(0);
  });

  it("clamps a distance beyond the board instead of going negative", () => {
    expect(missScore(99)).toBe(missScore(10));
    expect(missScore(99)).toBeGreaterThan(0);
  });

  it("routes through huntScore by outcome", () => {
    expect(huntScore(true, 4, 0)).toBe(85);
    expect(huntScore(false, 6, 1)).toBe(70);
  });
});

describe("standings", () => {
  it("ranks every finder above every non-finder", () => {
    const rows = standingsFor(TREASURE, [
      trailAt("0xaa", [1, 1, 1]),
      { hunter: "0xbb", callsign: null, digs: [{ tile: TREASURE, temperature: 0 }] },
    ]);
    expect(rows[0].hunter).toBe("0xbb");
    expect(rows[0].found).toBe(true);
    expect(rows[1].hunter).toBe("0xaa");
  });

  it("orders finders by fewest digs", () => {
    const slow = trailAt("0xaa", [4, 3, 2]);
    slow.digs.push({ tile: TREASURE, temperature: 0 });
    const fast = trailAt("0xbb", [4]);
    fast.digs.push({ tile: TREASURE, temperature: 0 });

    const rows = standingsFor(TREASURE, [slow, fast]);
    expect(rows.map((r) => r.hunter)).toEqual(["0xbb", "0xaa"]);
    expect(rows[0].digsUsed).toBe(2);
    expect(rows[0].score).toBe(95);
    expect(rows[1].digsUsed).toBe(4);
  });

  it("counts a finder's digs to the winning dig, not the whole trail", () => {
    const trail = trailAt("0xaa", [3]);
    trail.digs.push({ tile: TREASURE, temperature: 0 });
    trail.digs.push({ tile: { x: 0, y: 0 }, temperature: null });
    expect(standingsFor(TREASURE, [trail])[0].digsUsed).toBe(2);
  });

  describe("non-finders", () => {
    it("ranks by closest approach", () => {
      const rows = standingsFor(TREASURE, [trailAt("0xaa", [3, 4]), trailAt("0xbb", [2, 9])]);
      expect(rows.map((r) => r.hunter)).toEqual(["0xbb", "0xaa"]);
      expect(rows[0].closest).toBe(2);
    });

    it("breaks a tie on closest by who reached it earlier", () => {
      const early = trailAt("0xaa", [2, 8, 8]);
      const late = trailAt("0xbb", [8, 8, 2]);
      const rows = standingsFor(TREASURE, [late, early]);
      expect(rows.map((r) => r.hunter)).toEqual(["0xaa", "0xbb"]);
      expect(rows[0].closestOn).toBe(1);
    });

    it("falls through to the rest of the sorted trail when best and arrival tie", () => {
      // Both reach 1 on dig one; A is nearer from then on.
      const a = trailAt("0xaa", [1, 2, 3, 5, 7, 8]);
      const b = trailAt("0xbb", [1, 3, 3, 4, 5, 7]);
      const rows = standingsFor(TREASURE, [b, a]);
      expect(rows.map((r) => r.hunter)).toEqual(["0xaa", "0xbb"]);
    });

    it("puts a hunter with no digs last", () => {
      const rows = standingsFor(TREASURE, [
        { hunter: "0xaa", callsign: null, digs: [] },
        trailAt("0xbb", [9]),
      ]);
      expect(rows.map((r) => r.hunter)).toEqual(["0xbb", "0xaa"]);
      expect(rows[1].closest).toBeNull();
      expect(rows[1].score).toBe(0);
    });

    it("prefers the shorter trail when every distance matches", () => {
      const rows = standingsFor(TREASURE, [trailAt("0xaa", [2, 2, 2]), trailAt("0xbb", [2, 2])]);
      expect(rows.map((r) => r.hunter)).toEqual(["0xbb", "0xaa"]);
    });

    it("is deterministic when hunts are genuinely identical", () => {
      const forward = standingsFor(TREASURE, [trailAt("0xbb", [3]), trailAt("0xaa", [3])]);
      const backward = standingsFor(TREASURE, [trailAt("0xaa", [3]), trailAt("0xbb", [3])]);
      expect(forward.map((r) => r.hunter)).toEqual(backward.map((r) => r.hunter));
      expect(forward[0].hunter).toBe("0xaa");
    });
  });

  it("numbers ranks from one with no gaps", () => {
    const rows = standingsFor(TREASURE, [
      trailAt("0xaa", [4]),
      trailAt("0xbb", [2]),
      trailAt("0xcc", [7]),
    ]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});

// Day 20676 as it actually settled on Base Sepolia: treasure E1, two hunters,
// nobody found it. Guards the ranking against the first real day of play.
describe("day 20676, from chain", () => {
  const E1: Tile = { x: 4, y: 0 };
  const enoch: RevealedTrail = {
    hunter: "0xA69C2e0000000000000000000000000000000000",
    callsign: "enoch",
    digs: [
      { tile: { x: 1, y: 1 }, temperature: 2 },
      { tile: { x: 9, y: 9 }, temperature: 5 },
      { tile: { x: 5, y: 2 }, temperature: 1 },
      { tile: { x: 4, y: 2 }, temperature: 1 },
      { tile: { x: 6, y: 3 }, temperature: 2 },
      { tile: { x: 5, y: 3 }, temperature: 2 },
    ],
  };
  const other: RevealedTrail = {
    hunter: "0x149CAc7e03b1842d7DAaf9C01fea4C1d4F7e3666",
    callsign: null,
    digs: [
      { tile: { x: 6, y: 1 }, temperature: 1 },
      { tile: { x: 5, y: 0 }, temperature: 1 },
      { tile: { x: 1, y: 0 }, temperature: 2 },
      { tile: { x: 5, y: 2 }, temperature: 1 },
      { tile: { x: 4, y: 1 }, temperature: 1 },
      { tile: { x: 5, y: 1 }, temperature: 1 },
    ],
  };

  it("measures the real distances", () => {
    const rows = standingsFor(E1, [enoch, other]);
    const byHunter = new Map(rows.map((r) => [r.callsign ?? "other", r]));
    expect(byHunter.get("other")!.distances).toEqual([1, 1, 1, 2, 2, 3]);
    expect(byHunter.get("enoch")!.distances).toEqual([2, 2, 3, 3, 3, 9]);
  });

  it("ranks the hunter who got within one tile first", () => {
    const rows = standingsFor(E1, [enoch, other]);
    expect(rows[0].hunter).toBe(other.hunter);
    expect(rows[0].closest).toBe(1);
    expect(rows[0].score).toBe(70);
    expect(rows[1].callsign).toBe("enoch");
    expect(rows[1].closest).toBe(2);
    expect(rows[1].score).toBe(63);
  });

  it("agrees with the temperatures the contract handed out", () => {
    // temperature === floor((distance + 1) / 2), so the revealed clues and the
    // revealed treasure must describe the same board.
    for (const trail of [enoch, other]) {
      for (const dig of trail.digs) {
        const distance = Math.max(
          Math.abs(dig.tile.x - E1.x),
          Math.abs(dig.tile.y - E1.y),
        );
        expect(Math.floor((distance + 1) / 2)).toBe(dig.temperature);
      }
    }
  });
});

describe("missLine", () => {
  it("says tile in the singular", () => {
    expect(missLine(1)).toBe("1 tile away");
  });
  it("says tiles in the plural", () => {
    expect(missLine(4)).toBe("4 tiles away");
  });
});
