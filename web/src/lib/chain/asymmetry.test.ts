import { describe, expect, it } from "vitest";
import { annotateAsymmetry, intelHolders } from "@/lib/chain/asymmetry";
import type { PublicEntry } from "@/lib/chain/activity";

const RIVAL = "0x1111111111111111111111111111111111111111";
const YOU = "0x2222222222222222222222222222222222222222";

const probe = (hunter: string, x: number, y: number, block: number): PublicEntry => ({
  kind: "probe",
  hunter,
  x,
  y,
  outcome: "warmer",
  resolved: true,
  block,
  callsign: null,
});

const bearing = (hunter: string, x: number, y: number, block: number): PublicEntry => ({
  kind: "bearing",
  hunter,
  x,
  y,
  outcome: null,
  resolved: true,
  block,
  callsign: null,
});

const newestFirst = (entries: PublicEntry[]) => [...entries].sort((a, b) => b.block - a.block);

describe("asymmetry is derived only from public moves", () => {
  it("marks a rival's probes with their direction from the pin they bought", () => {
    const feed = newestFirst([
      bearing(RIVAL, 30, 30, 10),
      probe(RIVAL, 38, 22, 11),
    ]);
    const annotated = annotateAsymmetry(feed);
    const after = annotated.find((entry) => entry.kind === "probe");

    expect(after?.driftFromIntel).toBe("NE");
    expect(after?.intelPin).toBe(1);
  });

  it("leaves probes made before any intel purchase unannotated", () => {
    const feed = newestFirst([probe(RIVAL, 38, 22, 9), bearing(RIVAL, 30, 30, 10)]);
    const annotated = annotateAsymmetry(feed);
    const before = annotated.find((entry) => entry.kind === "probe");

    expect(before?.driftFromIntel).toBeNull();
    expect(before?.intelPin).toBeNull();
  });

  it("does not attribute one hunter's pin to another hunter's probe", () => {
    const feed = newestFirst([bearing(RIVAL, 30, 30, 10), probe(YOU, 38, 22, 11)]);
    const annotated = annotateAsymmetry(feed);
    const mine = annotated.find((entry) => entry.hunter === YOU);

    expect(mine?.driftFromIntel).toBeNull();
  });

  it("preserves the order it was handed", () => {
    const feed = newestFirst([
      bearing(RIVAL, 30, 30, 10),
      probe(RIVAL, 38, 22, 11),
      probe(RIVAL, 40, 20, 12),
    ]);
    expect(annotateAsymmetry(feed).map((entry) => entry.block)).toEqual(
      feed.map((entry) => entry.block),
    );
  });

  it("never carries the bearing's actual answer, only the mover's own direction", () => {
    const feed = newestFirst([bearing(RIVAL, 30, 30, 10), probe(RIVAL, 38, 22, 11)]);
    const serialised = JSON.stringify(annotateAsymmetry(feed));

    expect(serialised).not.toContain("secret");
    expect(serialised).not.toContain("plaintext");
    expect(Object.keys(annotateAsymmetry(feed)[0])).not.toContain("bearing");
  });
});

describe("intel holders summarise who knows something you do not", () => {
  it("excludes you from the rival list", () => {
    const feed = newestFirst([bearing(YOU, 30, 30, 10), bearing(RIVAL, 20, 20, 11)]);
    const rivals = intelHolders(feed, YOU);

    expect(rivals).toHaveLength(1);
    expect(rivals[0].hunter).toBe(RIVAL);
  });

  it("counts repeat purchases and reports the latest drift", () => {
    const feed = newestFirst([
      bearing(RIVAL, 30, 30, 10),
      probe(RIVAL, 38, 22, 11),
      bearing(RIVAL, 40, 20, 12),
      probe(RIVAL, 40, 12, 13),
    ]);
    const [rival] = intelHolders(feed, YOU);

    expect(rival.pins).toBe(2);
    expect(rival.lastOrigin).toEqual({ x: 40, y: 20 });
    expect(rival.lastDrift).toBe("N");
    expect(rival.movesSinceIntel).toBe(1);
  });

  it("reports a holder who has not acted on their intel yet", () => {
    const [rival] = intelHolders(newestFirst([bearing(RIVAL, 30, 30, 10)]), YOU);

    expect(rival.lastDrift).toBeNull();
    expect(rival.movesSinceIntel).toBe(0);
  });

  it("returns nobody when only you have bought intel", () => {
    expect(intelHolders(newestFirst([bearing(YOU, 30, 30, 10)]), YOU)).toEqual([]);
  });
});
