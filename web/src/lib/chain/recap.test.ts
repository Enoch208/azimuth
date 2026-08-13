import { describe, expect, it } from "vitest";
import { loadRecapOrLatest, type Recap } from "@/lib/chain/recap";

function recap(day: number, state: Partial<Recap>): Recap {
  return {
    day,
    requestedDay: day,
    revealed: false,
    readable: false,
    treasure: null,
    trails: [],
    ...state,
  };
}

const READABLE = { revealed: true, readable: true, treasure: { x: 4, y: 0 } };
const OPEN_BUT_SEALED = { revealed: true, readable: false };
const NEVER_OPENED = { revealed: false, readable: false };

// Days the loader is allowed to return, keyed by day number.
function loaderFor(days: Record<number, Recap>) {
  const asked: number[] = [];
  const load = async (day: number) => {
    asked.push(day);
    return days[day] ?? recap(day, NEVER_OPENED);
  };
  return { load, asked };
}

describe("the recap always shows a hunt somebody can actually read", () => {
  it("shows the asked day when its plaintext came back", async () => {
    const { load } = loaderFor({ 20: recap(20, READABLE) });
    const shown = await loadRecapOrLatest(20, load);
    expect(shown.day).toBe(20);
    expect(shown.requestedDay).toBe(20);
  });

  // The bug this file was written for: a day can be open on chain and still
  // refuse to decrypt. Returning it showed the player an apology while a real
  // revealed hunt sat one day back.
  it("passes over a day that opened on chain but will not decrypt", async () => {
    const { load } = loaderFor({
      20: recap(20, OPEN_BUT_SEALED),
      19: recap(19, READABLE),
    });
    const shown = await loadRecapOrLatest(20, load);
    expect(shown.day).toBe(19);
    expect(shown.readable).toBe(true);
    expect(shown.treasure).toEqual({ x: 4, y: 0 });
  });

  it("labels a fallback with the day that was asked for", async () => {
    const { load } = loaderFor({
      20: recap(20, OPEN_BUT_SEALED),
      19: recap(19, READABLE),
    });
    const shown = await loadRecapOrLatest(20, load);
    expect(shown.requestedDay).toBe(20);
    expect(shown.day).not.toBe(shown.requestedDay);
  });

  it("reaches past several unreadable days to the newest readable one", async () => {
    const { load, asked } = loaderFor({
      20: recap(20, OPEN_BUT_SEALED),
      19: recap(19, OPEN_BUT_SEALED),
      18: recap(18, READABLE),
      17: recap(17, READABLE),
    });
    const shown = await loadRecapOrLatest(20, load);
    expect(shown.day).toBe(18);
    expect(asked).not.toContain(17);
  });

  it("falls back for a day that never opened at all", async () => {
    const { load } = loaderFor({ 20: recap(20, NEVER_OPENED), 19: recap(19, READABLE) });
    expect((await loadRecapOrLatest(20, load)).day).toBe(19);
  });

  it("keeps the asked day when nothing within reach is readable", async () => {
    const { load } = loaderFor({ 20: recap(20, OPEN_BUT_SEALED) });
    const shown = await loadRecapOrLatest(20, load);
    expect(shown.day).toBe(20);
    expect(shown.revealed).toBe(true);
    expect(shown.readable).toBe(false);
  });

  it("survives a loader that throws on an older day", async () => {
    const load = async (day: number) => {
      if (day === 20) return recap(20, OPEN_BUT_SEALED);
      if (day === 19) throw new Error("rpc fell over");
      return recap(day, READABLE);
    };
    expect((await loadRecapOrLatest(20, load)).day).toBe(18);
  });
});
