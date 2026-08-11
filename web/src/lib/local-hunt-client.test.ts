import { describe, expect, it } from "vitest";
import { bearingBetween, squaredDistance } from "@/lib/hunt-client";
import { LocalHuntClient } from "@/lib/local-hunt-client";
import type { Vault } from "@/lib/types";

const vault: Vault = {
  id: 1,
  name: "FIRST SIGNAL",
  difficulty: "beginner",
  status: "active",
  bounty: 500,
  hunters: 0,
  probes: 0,
  scansPurchased: 0,
  createdAt: 0,
  expiresAt: 9_999_999_999,
  maxProbesPerHunter: 3,
  maxScansPerHunter: 1,
  round: 0,
};

describe("bearing geometry matches the contract's octant rule", () => {
  const secret = { x: 32, y: 32 };
  const cases: [number, number, string][] = [
    [32, 38, "N"],
    [26, 38, "NE"],
    [26, 32, "E"],
    [26, 26, "SE"],
    [32, 26, "S"],
    [38, 26, "SW"],
    [38, 32, "W"],
    [38, 38, "NW"],
  ];

  for (const [x, y, expected] of cases) {
    it(`reads ${expected} from (${x}, ${y})`, () => {
      expect(bearingBetween({ x, y }, secret)).toBe(expected);
    });
  }

  it("reports AT_TARGET rather than a compass direction on the exact cell", () => {
    expect(bearingBetween(secret, secret)).toBe("AT_TARGET");
  });

  it("uses squared distance, never a square root", () => {
    expect(squaredDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
  });
});

describe("local hunt client enforces the vault's budget", () => {
  it("charges credits and decrements the probe allowance", async () => {
    const client = new LocalHuntClient(vault);
    const before = client.snapshot();
    const after = await client.probe({ x: 1, y: 1 });

    expect(after.probesLeft).toBe(before.probesLeft - 1);
    expect(after.credits).toBe(before.credits - 2);
  });

  it("ignores a repeat probe on a cell already tried", async () => {
    const client = new LocalHuntClient(vault);
    await client.probe({ x: 5, y: 5 });
    const first = client.snapshot();
    const second = await client.probe({ x: 5, y: 5 });

    expect(second.probesLeft).toBe(first.probesLeft);
    expect(second.credits).toBe(first.credits);
  });

  it("stops accepting probes once the allowance is spent", async () => {
    const client = new LocalHuntClient(vault);
    for (const cell of [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ]) {
      await client.probe(cell);
    }
    expect(client.snapshot().probesLeft).toBe(0);

    const blocked = await client.probe({ x: 4, y: 4 });
    expect(blocked.probes).toHaveLength(3);
  });

  it("caps bearings independently of probes", async () => {
    const client = new LocalHuntClient(vault);
    await client.buyBearing({ x: 10, y: 10 });
    expect(client.snapshot().bearingsLeft).toBe(0);

    await client.buyBearing({ x: 11, y: 11 });
    expect(client.snapshot().bearings).toHaveLength(1);
  });

  it("marks the first probe warmer because there is no previous best", async () => {
    const client = new LocalHuntClient(vault);
    const snapshot = await client.probe({ x: 0, y: 0 });
    expect(["warmer", "found"]).toContain(snapshot.probes[0].outcome);
  });

  it("never reveals coordinates before the vault is found", async () => {
    const client = new LocalHuntClient(vault);
    await client.probe({ x: 7, y: 7 });
    const snapshot = client.snapshot();
    if (!snapshot.found) expect(snapshot.revealed).toBeNull();
  });
});
