import { describe, expect, it } from "vitest";
import { huntStreak, playerRecord, streakLine, type DayRecord } from "@/lib/streak";

const TODAY = 20_677;

const day = (
  offset: number,
  digs: number,
  found = false,
  foundOn = 0,
): DayRecord => ({ day: TODAY - offset, digs, found, foundOn });

describe("huntStreak", () => {
  it("is zero with no history", () => {
    expect(huntStreak(TODAY, [])).toBe(0);
  });

  it("counts today when today has been played", () => {
    expect(huntStreak(TODAY, [day(0, 1)])).toBe(1);
  });

  it("counts consecutive days back from today", () => {
    expect(huntStreak(TODAY, [day(0, 6), day(1, 3), day(2, 1)])).toBe(3);
  });

  it("does not require finding the treasure", () => {
    const records = [day(0, 6), day(1, 6), day(2, 6)];
    expect(records.every((r) => !r.found)).toBe(true);
    expect(huntStreak(TODAY, records)).toBe(3);
  });

  it("survives today not being played yet", () => {
    // 00:30 UTC: yesterday's streak is still alive until the day is missed.
    expect(huntStreak(TODAY, [day(1, 6), day(2, 6), day(3, 6)])).toBe(3);
  });

  it("breaks on a missed day", () => {
    expect(huntStreak(TODAY, [day(0, 6), day(1, 6), day(3, 6), day(4, 6)])).toBe(2);
  });

  it("is zero when the last play was two days ago", () => {
    expect(huntStreak(TODAY, [day(2, 6), day(3, 6)])).toBe(0);
  });

  it("ignores a day the wallet opened but never dug", () => {
    expect(huntStreak(TODAY, [day(0, 0), day(1, 6), day(2, 6)])).toBe(2);
  });

  it("does not care what order records arrive in", () => {
    const shuffled = [day(2, 1), day(0, 6), day(1, 3)];
    expect(huntStreak(TODAY, shuffled)).toBe(3);
  });
});

describe("playerRecord", () => {
  it("reports nothing rather than zeroes when there is no history", () => {
    const record = playerRecord(TODAY, []);
    expect(record).toEqual({
      streak: 0,
      daysPlayed: 0,
      treasures: 0,
      bestFind: null,
      bestRank: null,
    });
  });

  it("counts only days with real digs", () => {
    expect(playerRecord(TODAY, [day(0, 6), day(1, 0), day(2, 2)]).daysPlayed).toBe(2);
  });

  it("counts registered treasures and keeps the best find", () => {
    const record = playerRecord(TODAY, [
      day(0, 6),
      day(1, 4, true, 4),
      day(2, 3, true, 3),
      day(3, 6),
    ]);
    expect(record.treasures).toBe(2);
    expect(record.bestFind).toBe(3);
  });

  it("never invents a best find from an unclaimed day", () => {
    // found=false is a hunt that missed, or one whose score was never
    // registered. Neither is a treasure.
    expect(playerRecord(TODAY, [day(0, 6), day(1, 6)]).bestFind).toBeNull();
  });

  it("keeps the best rank across ranked days only", () => {
    const ranks = new Map([
      [TODAY - 1, 4],
      [TODAY - 2, 2],
    ]);
    expect(playerRecord(TODAY, [day(1, 6), day(2, 6)], ranks).bestRank).toBe(2);
  });

  it("leaves best rank null when no day has been ranked", () => {
    expect(playerRecord(TODAY, [day(1, 6)]).bestRank).toBeNull();
  });
});

describe("streakLine", () => {
  it("says nothing at zero rather than boasting a zero streak", () => {
    expect(streakLine(0)).toBeNull();
  });

  it("reads as a count of days", () => {
    expect(streakLine(5)).toBe("5 day streak");
  });
});
