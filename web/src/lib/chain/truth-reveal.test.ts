import { describe, expect, it } from "vitest";
import { buildTruthReveal, formatClock, BASE_BLOCK_SECONDS } from "@/lib/chain/truth-reveal";
import { bearingBetween } from "@/lib/hunt-client";
import type { PublicEntry } from "@/lib/chain/activity";

const RIVAL = "0x1111111111111111111111111111111111111111";
const YOU = "0x2222222222222222222222222222222222222222";
const VAULT = { x: 52, y: 25 };

const probe = (hunter: string, x: number, y: number, block: number, outcome: "warmer" | "colder" | "found" = "warmer"): PublicEntry => ({
  kind: "probe",
  hunter,
  x,
  y,
  outcome,
  resolved: true,
  block,
  callsign: hunter === RIVAL ? "shafe" : "enoch",
});

const bearing = (hunter: string, x: number, y: number, block: number): PublicEntry => ({
  kind: "bearing",
  hunter,
  x,
  y,
  outcome: null,
  resolved: true,
  block,
  callsign: hunter === RIVAL ? "shafe" : "enoch",
});

const settled = (hunter: string, block: number): PublicEntry => ({
  kind: "settled",
  hunter,
  x: 0,
  y: 0,
  outcome: "found",
  resolved: true,
  block,
  callsign: "enoch",
});

describe("the truth reveal reconstructs what was sealed during the hunt", () => {
  const feed = [
    probe(YOU, 14, 42, 100),
    bearing(RIVAL, 21, 36, 110),
    probe(RIVAL, 30, 30, 120),
    bearing(YOU, 40, 30, 130),
    probe(YOU, 52, 25, 140, "found"),
    settled(YOU, 150),
  ];

  it("orders the timeline chronologically regardless of input order", () => {
    const shuffled = [...feed].reverse();
    const clocks = buildTruthReveal(shuffled, VAULT, YOU).map((entry) => entry.elapsedSeconds);
    expect([...clocks].sort((a, b) => a - b)).toEqual(clocks);
  });

  it("starts the clock at zero and scales by Base's block cadence", () => {
    const timeline = buildTruthReveal(feed, VAULT, YOU);
    expect(timeline[0].elapsedSeconds).toBe(0);
    expect(timeline[1].elapsedSeconds).toBe(10 * BASE_BLOCK_SECONDS);
  });

  it("labels each sealed bearing as private during the hunt", () => {
    const intel = buildTruthReveal(feed, VAULT, YOU).filter((entry) => entry.kind === "intel");
    expect(intel).toHaveLength(2);
    for (const entry of intel) expect(entry.detail).toBe("PRIVATE DURING HUNT");
  });

  it("reconstructs each bearing to exactly what the octant rule would have said", () => {
    const intel = buildTruthReveal(feed, VAULT, YOU).filter((entry) => entry.kind === "intel");
    for (const entry of intel) {
      expect(entry.reconstructed).toBe(bearingBetween(entry.origin!, VAULT));
    }
  });

  it("reconstructs only from the public origin and the public coordinate", () => {
    const withoutOutcomes = feed.map((entry) => ({ ...entry, outcome: null }));
    const a = buildTruthReveal(feed, VAULT, YOU).filter((e) => e.kind === "intel");
    const b = buildTruthReveal(withoutOutcomes, VAULT, YOU).filter((e) => e.kind === "intel");
    expect(b.map((e) => e.reconstructed)).toEqual(a.map((e) => e.reconstructed));
  });

  it("names you distinctly from rivals", () => {
    const timeline = buildTruthReveal(feed, VAULT, YOU);
    expect(timeline[0].actor).toBe("You");
    expect(timeline[0].isYou).toBe(true);
    expect(timeline[1].actor).toBe("shafe");
    expect(timeline[1].isYou).toBe(false);
  });

  it("shows a rival's movement relative to the pin they bought", () => {
    const afterIntel = buildTruthReveal(feed, VAULT, YOU).find(
      (entry) => entry.kind === "probe" && entry.actor === "shafe",
    );
    expect(afterIntel?.detail).toContain("moving");
    expect(afterIntel?.origin).toEqual({ x: 21, y: 36 });
  });

  it("closes on the settlement carrying the revealed coordinate", () => {
    const last = buildTruthReveal(feed, VAULT, YOU).at(-1);
    expect(last?.kind).toBe("found");
    expect(last?.detail).toBe("COORDINATES 52, 25");
    expect(last?.cell).toEqual(VAULT);
  });

  it("returns nothing for a vault with no recorded moves", () => {
    expect(buildTruthReveal([], VAULT, YOU)).toEqual([]);
  });
});

describe("the clock reads as minutes and seconds", () => {
  it("pads both halves", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(31)).toBe("00:31");
    expect(formatClock(128)).toBe("02:08");
  });
});
