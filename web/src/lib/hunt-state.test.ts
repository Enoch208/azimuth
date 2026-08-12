import { describe, expect, it } from "vitest";
import { DIGS, type Dig, type Temperature } from "@/lib/daily";
import { HUNT_STATE_LABEL, digsRemaining, huntStateFor, isSealed } from "@/lib/hunt-state";

const dig = (temperature: Temperature | null, x = 0, y = 0): Dig => ({
  tile: { x, y },
  temperature,
});

const spent = (): Dig[] => Array.from({ length: DIGS }, (_, i) => dig(4, i, 0));

describe("huntStateFor", () => {
  it("has not started on an untouched board", () => {
    expect(huntStateFor([])).toBe("not-started");
  });

  it("is hunting part way through", () => {
    expect(huntStateFor([dig(4), dig(2)])).toBe("hunting");
  });

  it("is found when a dig landed on the treasure", () => {
    expect(huntStateFor([dig(3), dig(0)])).toBe("found");
  });

  it("is digs spent when six ran out without a find", () => {
    expect(huntStateFor(spent())).toBe("digs-spent");
  });

  it("prefers found over digs spent on a last-dig win", () => {
    const digs = [...spent().slice(0, DIGS - 1), dig(0, 9, 9)];
    expect(huntStateFor(digs)).toBe("found");
  });

  it("is still hunting while an answer is on its way", () => {
    expect(huntStateFor([dig(null)])).toBe("hunting");
  });
});

describe("isSealed", () => {
  it("seals both endings", () => {
    expect(isSealed("found")).toBe(true);
    expect(isSealed("digs-spent")).toBe(true);
  });

  it("does not seal a hunt still in play", () => {
    expect(isSealed("hunting")).toBe(false);
    expect(isSealed("not-started")).toBe(false);
  });
});

describe("digsRemaining", () => {
  it("counts down from six", () => {
    expect(digsRemaining([])).toBe(DIGS);
    expect(digsRemaining([dig(4), dig(4)])).toBe(DIGS - 2);
  });

  it("never goes below zero", () => {
    expect(digsRemaining([...spent(), dig(1, 10, 10)])).toBe(0);
  });
});

describe("labels", () => {
  it("names every state", () => {
    for (const state of ["not-started", "hunting", "found", "digs-spent"] as const) {
      expect(HUNT_STATE_LABEL[state]).toBeTruthy();
    }
  });
});
