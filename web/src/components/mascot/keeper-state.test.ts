import { describe, expect, it } from "vitest";
import { KEEPER_LABEL, KEEPER_RIVE_STATE, KEEPER_STATES, keeperStateFor } from "./keeper-state";
import { DIGS, type Dig, type Temperature } from "@/lib/daily";

const dig = (temperature: Temperature | null, x = 0, y = 0): Dig => ({
  tile: { x, y },
  temperature,
});

// Six digs that never find anything, so the hunt ends by exhaustion.
const spent = (): Dig[] => Array.from({ length: DIGS }, (_, i) => dig(4, i, 0));

describe("keeperStateFor", () => {
  it("idles before the first dig", () => {
    expect(keeperStateFor({ digs: [] })).toBe("idle");
  });

  it("maps each temperature to its own mood", () => {
    const expected: Record<Temperature, string> = {
      0: "found",
      1: "burning",
      2: "hot",
      3: "warm",
      4: "cold",
      5: "freezing",
    };
    for (const [temperature, mood] of Object.entries(expected)) {
      const t = Number(temperature) as Temperature;
      expect(keeperStateFor({ digs: [dig(t)] })).toBe(mood);
    }
  });

  it("reads the latest dig, not the first", () => {
    expect(keeperStateFor({ digs: [dig(5, 0, 0), dig(1, 1, 1)] })).toBe("burning");
  });

  describe("an unread answer is never a temperature", () => {
    // The bug this guards: null used to be coerced to 5, so a dig whose
    // confidential answer had not arrived rendered as a confident "Freezing".
    it("searches while the latest answer is still arriving", () => {
      expect(keeperStateFor({ digs: [dig(null)] })).toBe("searching");
    });

    it("does not borrow freezing for an unread dig", () => {
      expect(keeperStateFor({ digs: [dig(null)] })).not.toBe("freezing");
    });

    it("keeps searching when the unread dig is the last of six", () => {
      const digs = [...spent().slice(0, DIGS - 1), dig(null, 5, 5)];
      expect(keeperStateFor({ digs })).toBe("searching");
    });

    it("still reads an earlier unread dig as history, not the current mood", () => {
      expect(keeperStateFor({ digs: [dig(null, 0, 0), dig(2, 1, 1)] })).toBe("hot");
    });
  });

  describe("end of hunt", () => {
    it("celebrates when a dig lands on the treasure", () => {
      expect(keeperStateFor({ digs: [dig(0)] })).toBe("found");
    });

    it("locks up instead of celebrating once the result is sealed", () => {
      expect(keeperStateFor({ digs: [dig(0)], sealed: true })).toBe("sealed");
    });

    it("slumps when all six digs are spent without a find", () => {
      expect(keeperStateFor({ digs: spent() })).toBe("outOfDigs");
    });

    it("keeps slumping even when sealed — losing is not a locked win", () => {
      expect(keeperStateFor({ digs: spent(), sealed: true })).toBe("outOfDigs");
    });

    it("celebrates a win found on the very last dig", () => {
      const digs = [...spent().slice(0, DIGS - 1), dig(0, 5, 5)];
      expect(keeperStateFor({ digs })).toBe("found");
    });
  });

  describe("precedence", () => {
    it("puts failure above everything", () => {
      expect(keeperStateFor({ digs: [dig(0)], failed: true, pending: true })).toBe("error");
    });

    it("puts an in-flight dig above the previous result", () => {
      expect(keeperStateFor({ digs: [dig(1)], pending: true })).toBe("searching");
    });

    it("puts an in-flight dig above a finished hunt", () => {
      expect(keeperStateFor({ digs: spent(), pending: true })).toBe("searching");
    });

    it("searches on an empty board when a dig is in flight", () => {
      expect(keeperStateFor({ digs: [], pending: true })).toBe("searching");
    });
  });
});

describe("Rive contract", () => {
  it("covers every state exactly once", () => {
    const numbers = KEEPER_STATES.map((state) => KEEPER_RIVE_STATE[state]);
    expect(new Set(numbers).size).toBe(KEEPER_STATES.length);
  });

  it("stays a contiguous range so the state machine can switch on it", () => {
    const numbers = Object.values(KEEPER_RIVE_STATE).sort((a, b) => a - b);
    expect(numbers).toEqual(numbers.map((_, i) => i));
  });

  it("describes every state for screen readers", () => {
    for (const state of KEEPER_STATES) {
      expect(KEEPER_LABEL[state]).toBeTruthy();
    }
  });
});
