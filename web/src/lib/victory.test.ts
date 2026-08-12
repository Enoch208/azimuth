import { describe, expect, it } from "vitest";
import { DIGS, type Dig, type Temperature } from "@/lib/daily";
import { defeatLine, huntOutcome, shouldCelebrate, victoryLine } from "@/lib/victory";

const dig = (temperature: Temperature | null, x = 0, y = 0): Dig => ({
  tile: { x, y },
  temperature,
});

const spent = (): Dig[] => Array.from({ length: DIGS }, (_, i) => dig(4, i, 0));

describe("huntOutcome", () => {
  it("scores a win by digs spent, not digs allowed", () => {
    const outcome = huntOutcome([dig(5), dig(3), dig(1), dig(0)]);
    expect(outcome.found).toBe(true);
    expect(outcome.digsUsed).toBe(4);
    expect(outcome.score).toBe("4/6");
  });

  it("scores an exhausted hunt as X/6", () => {
    expect(huntOutcome(spent()).score).toBe("X/6");
  });

  it("keeps the trail in dig order", () => {
    expect(huntOutcome([dig(5), dig(2), dig(0)]).trail).toEqual([5, 2, 0]);
  });

  it("keeps unread answers as null rather than inventing a temperature", () => {
    expect(huntOutcome([dig(3), dig(null)]).trail).toEqual([3, null]);
  });

  it("seals a finished hunt", () => {
    expect(huntOutcome([dig(0)]).sealed).toBe(true);
    expect(huntOutcome(spent()).sealed).toBe(true);
  });

  it("leaves a hunt in progress unsealed", () => {
    expect(huntOutcome([dig(3)]).sealed).toBe(false);
  });
});

describe("shouldCelebrate", () => {
  it("fires on a settled win", () => {
    expect(shouldCelebrate([dig(2), dig(0)], false)).toBe(true);
  });

  it("does not fire while a dig is in flight", () => {
    expect(shouldCelebrate([dig(0)], true)).toBe(false);
  });

  it("does not fire while any answer is still arriving", () => {
    // The trail would change under the player mid-celebration.
    expect(shouldCelebrate([dig(null), dig(0)], false)).toBe(false);
  });

  it("does not fire when the hunt was lost", () => {
    expect(shouldCelebrate(spent(), false)).toBe(false);
  });

  it("does not fire on an untouched board", () => {
    expect(shouldCelebrate([], false)).toBe(false);
  });
});

describe("copy", () => {
  it("states the score the player earned", () => {
    expect(victoryLine([dig(2), dig(1), dig(0)])).toBe("You found it in 3/6 digs");
  });

  it("leaves the treasure secret when the digs run out", () => {
    expect(defeatLine()).toContain("stays buried");
  });
});
