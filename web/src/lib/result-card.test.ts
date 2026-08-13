import { describe, expect, it } from "vitest";
import { DIGS, type Temperature } from "@/lib/daily";
import {
  FORBIDDEN_SEALED_KEYS,
  maskWallet,
  revealedCard,
  revealedHeadline,
  scoreLine,
  sealedCard,
  sealedLeaks,
} from "@/lib/result-card";

const DAY = 20_679;
const WALLET = "0x095a4C1d4F7e3666b1842d7DAaf9C01fea4CA211";
const OTHER = "0x149CAc7e03b1842d7DAaf9C01fea4C1d4F7e3666";

const WON: (Temperature | null)[] = [4, 2, 1, 0];
const LOST: (Temperature | null)[] = [5, 4, 3, 2, 1, 1];

const sealedWin = (callsign: string | null = "enoch") =>
  sealedCard({
    day: DAY,
    address: WALLET,
    callsign,
    found: true,
    digsUsed: 4,
    trail: WON,
    secondsToReveal: 6_600,
  });

const sealedLoss = (callsign: string | null = "enoch") =>
  sealedCard({
    day: DAY,
    address: WALLET,
    callsign,
    found: false,
    digsUsed: DIGS,
    trail: LOST,
    secondsToReveal: 6_600,
  });

describe("maskWallet", () => {
  it("masks to the house format", () => {
    expect(maskWallet(WALLET)).toBe("0x095a…A211");
  });

  it("never returns the whole address", () => {
    expect(maskWallet(WALLET)).not.toContain(WALLET);
    expect(maskWallet(WALLET).length).toBeLessThan(WALLET.length);
  });

  it("leaves something too short to mask alone", () => {
    expect(maskWallet("0x1234")).toBe("0x1234");
  });
});

describe("sealed card", () => {
  it("carries identity, result, digs and countdown", () => {
    const card = sealedWin();
    expect(card.kind).toBe("sealed");
    expect(card.huntNumber).toBe(2);
    expect(card.identity).toEqual({ callsign: "enoch", wallet: "0x095a…A211" });
    expect(card.headline).toBe("Treasure found");
    expect(card.digsUsed).toBe(4);
    expect(card.countdown).toBe("1h 50m");
    expect(scoreLine(card)).toBe("4 / 6 digs");
  });

  it("says digs spent when the hunt was lost", () => {
    expect(sealedLoss().headline).toBe("Digs spent");
  });

  it("works with a wallet and no callsign", () => {
    const card = sealedWin(null);
    expect(card.identity.callsign).toBeNull();
    expect(card.identity.wallet).toBe("0x095a…A211");
  });

  it("copies the trail rather than aliasing the caller's array", () => {
    const trail: (Temperature | null)[] = [4, 2];
    const card = sealedCard({
      day: DAY,
      address: WALLET,
      callsign: null,
      found: false,
      digsUsed: 2,
      trail,
      secondsToReveal: 60,
    });
    trail.push(0);
    expect(card.trail).toEqual([4, 2]);
  });

  it("keeps an unread answer unread instead of inventing one", () => {
    const card = sealedCard({
      day: DAY,
      address: WALLET,
      callsign: null,
      found: false,
      digsUsed: 2,
      trail: [3, null],
      secondsToReveal: 60,
    });
    expect(card.trail).toEqual([3, null]);
  });
});

// The hard gate. A sealed card is posted while other people are still hunting,
// so anything in it that localises the treasure ends the day for everyone.
describe("sealed card leaks nothing about a live hunt", () => {
  const SECTOR = "E1";

  for (const [label, card] of [
    ["winner with callsign", sealedWin()],
    ["winner wallet only", sealedWin(null)],
    ["loser with callsign", sealedLoss()],
    ["loser wallet only", sealedLoss(null)],
  ] as const) {
    it(`${label}: no forbidden field`, () => {
      // Secrets are checked separately below; here we only assert on shape.
      expect(sealedLeaks(card, [])).toEqual([]);
    });

    it(`${label}: never carries the full wallet or another hunter`, () => {
      const serialised = JSON.stringify(card);
      expect(serialised).not.toContain(WALLET);
      expect(serialised).not.toContain(OTHER);
    });

    it(`${label}: no coordinate, sector, rank, score or distance key`, () => {
      const keys = new Set<string>();
      const walk = (value: unknown) => {
        if (value && typeof value === "object") {
          for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            keys.add(key);
            walk(entry);
          }
        }
      };
      walk(card);
      for (const forbidden of FORBIDDEN_SEALED_KEYS) {
        expect(keys.has(forbidden)).toBe(false);
      }
    });
  }

  it("detects a leak if one is ever introduced", () => {
    // Guard against the guard: a scanner that always passes is worthless.
    const poisoned = { ...sealedWin(), rank: 3 };
    expect(sealedLeaks(poisoned, [])).toContain("card.rank");
  });

  it("detects a treasure sector smuggled into a string", () => {
    const poisoned = { ...sealedWin(), headline: `Treasure found at ${SECTOR}` };
    expect(sealedLeaks(poisoned, [SECTOR]).length).toBeGreaterThan(0);
  });

  it("detects another hunter's address smuggled in", () => {
    const poisoned = { ...sealedWin(), identity: { callsign: OTHER, wallet: "0x095a…A211" } };
    expect(sealedLeaks(poisoned, [OTHER]).length).toBeGreaterThan(0);
  });
});

describe("revealed card", () => {
  const revealedWin = (callsign: string | null = "enoch") =>
    revealedCard({
      day: DAY,
      address: WALLET,
      callsign,
      found: true,
      digsUsed: 4,
      trail: WON,
      rank: 3,
      score: 85,
      closest: 0,
      streak: 5,
    });

  const revealedLoss = (closest: number, callsign: string | null = "enoch") =>
    revealedCard({
      day: DAY,
      address: WALLET,
      callsign,
      found: false,
      digsUsed: DIGS,
      trail: LOST,
      rank: 8,
      score: 70,
      closest,
      streak: 5,
    });

  it("shows rank, score and streak for a winner", () => {
    const card = revealedWin();
    expect(card.headline).toBe("Treasure found");
    expect(card.rank).toBe(3);
    expect(card.score).toBe(85);
    expect(card.streak).toBe(5);
    expect(card.closestLine).toBeNull();
  });

  it("frames a near miss as so close", () => {
    const card = revealedLoss(1);
    expect(card.headline).toBe("So close");
    expect(card.closestLine).toBe("1 tile away");
  });

  it("frames a distant miss as a cold trail", () => {
    expect(revealedLoss(7).headline).toBe("The trail went cold");
    expect(revealedLoss(7).closestLine).toBe("7 tiles away");
  });

  it("works wallet-only", () => {
    expect(revealedWin(null).identity.callsign).toBeNull();
    expect(revealedLoss(2, null).identity.callsign).toBeNull();
  });

  it("never carries the full wallet", () => {
    expect(JSON.stringify(revealedWin())).not.toContain(WALLET);
    expect(JSON.stringify(revealedLoss(2))).not.toContain(WALLET);
  });
});

describe("revealedHeadline", () => {
  it("treats two tiles as still so close", () => {
    expect(revealedHeadline(false, 2)).toBe("So close");
  });
  it("treats three tiles as a cold trail", () => {
    expect(revealedHeadline(false, 3)).toBe("The trail went cold");
  });
  it("has no miss framing for a find", () => {
    expect(revealedHeadline(true, null)).toBe("Treasure found");
  });
});
