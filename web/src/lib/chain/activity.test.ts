import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicEntry } from "@/lib/chain/activity";

const getEventsChunked = vi.fn();
const attestedReveal = vi.fn();
const loadCallsigns = vi.fn();

vi.mock("@/lib/chain/logs", () => ({
  getEventsChunked: (...args: unknown[]) => getEventsChunked(...args),
  roundStartBlock: async () => BigInt(0),
}));
vi.mock("@/lib/chain/inco", () => ({
  getLightning: async () => ({ attestedReveal: (...a: unknown[]) => attestedReveal(...a) }),
}));
vi.mock("@/lib/chain/callsigns", () => ({
  loadCallsigns: (...args: unknown[]) => loadCallsigns(...args),
}));

const { loadVaultActivity } = await import("@/lib/chain/activity");

const ALICE = "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa";
const BOB = "0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb";

let handleSeed = 0;
const truth = new Map<string, boolean>();

const probeLog = (
  hunter: string,
  x: number,
  y: number,
  block: number,
  says: { closer: boolean; hit: boolean } = { closer: true, hit: false },
  round = 0,
) => {
  handleSeed += 1;
  const closerHandle = `0xc${handleSeed}`;
  const hitHandle = `0xh${handleSeed}`;
  truth.set(closerHandle, says.closer);
  truth.set(hitHandle, says.hit);
  return { args: { hunter, x, y, round, closerHandle, hitHandle }, blockNumber: BigInt(block) };
};

function answerFromTruth() {
  attestedReveal.mockImplementation(async (handles: string[]) =>
    handles.map((handle) => ({ plaintext: { value: truth.get(handle) ?? false } })),
  );
}

describe("public activity is multi-hunter and round-scoped", () => {
  beforeEach(() => {
    getEventsChunked.mockReset();
    attestedReveal.mockReset();
    loadCallsigns.mockReset().mockResolvedValue(new Map());
  });

  it("includes every hunter, not just the viewer", async () => {
    getEventsChunked
      .mockResolvedValueOnce([probeLog(ALICE, 1, 1, 10, { closer: true, hit: false }), probeLog(BOB, 2, 2, 11, { closer: false, hit: false })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    answerFromTruth();

    const entries = await loadVaultActivity(1, 0, 0);
    const hunters = new Set(entries.map((entry) => entry.hunter));

    expect(hunters.has(ALICE)).toBe(true);
    expect(hunters.has(BOB)).toBe(true);
  });

  it("labels the winning probe FOUND rather than WARMER", async () => {
    getEventsChunked
      .mockResolvedValueOnce([probeLog(ALICE, 1, 1, 10, { closer: true, hit: false }), probeLog(ALICE, 35, 14, 12, { closer: true, hit: true })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    answerFromTruth();

    const entries = await loadVaultActivity(1, 0, 0);
    expect(entries.find((entry) => entry.x === 35)?.outcome).toBe("found");
    expect(entries.find((entry) => entry.x === 1)?.outcome).toBe("warmer");
  });

  it("marks only the probe that first hit, not every probe after it", async () => {
    getEventsChunked
      .mockResolvedValueOnce([
        probeLog(ALICE, 1, 1, 10, { closer: true, hit: false }),
        probeLog(ALICE, 35, 14, 12, { closer: true, hit: true }),
        probeLog(ALICE, 36, 14, 14, { closer: false, hit: true }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    answerFromTruth();

    const entries = await loadVaultActivity(1, 0, 0);
    expect(entries.find((entry) => entry.x === 35)?.outcome).toBe("found");
    expect(entries.find((entry) => entry.x === 36)?.outcome).toBe("colder");
  });

  it("drops events from a previous round", async () => {
    getEventsChunked
      .mockResolvedValueOnce([probeLog(ALICE, 1, 1, 10, { closer: true, hit: false }, 0), probeLog(BOB, 2, 2, 20, { closer: true, hit: false }, 1)])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    answerFromTruth();

    const entries = await loadVaultActivity(1, 1, 0);
    expect(entries).toHaveLength(1);
    expect(entries[0].hunter).toBe(BOB);
  });

  it("never carries a bearing direction into the public feed", async () => {
    getEventsChunked
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { args: { hunter: ALICE, x: 24, y: 26, round: 0 }, blockNumber: BigInt(15) },
      ])
      .mockResolvedValueOnce([]);

    const entries = await loadVaultActivity(1, 0, 0);
    const scan = entries.find((entry) => entry.kind === "bearing");

    expect(scan).toBeDefined();
    expect(scan?.outcome).toBeNull();
    expect(JSON.stringify(entries)).not.toMatch(/"(N|NE|E|SE|S|SW|W|NW)"/);
  });
});

describe("the feed renders before the covalidator answers", () => {
  beforeEach(() => {
    getEventsChunked.mockReset();
    attestedReveal.mockReset();
    loadCallsigns.mockReset().mockResolvedValue(new Map());
  });

  it("emits every move unresolved first, then fills outcomes in", async () => {
    getEventsChunked
      .mockResolvedValueOnce([probeLog(ALICE, 1, 1, 10, { closer: true, hit: false }), probeLog(BOB, 2, 2, 11, { closer: false, hit: false })])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    answerFromTruth();

    const frames: PublicEntry[][] = [];
    await loadVaultActivity(1, 0, 0, (partial) => frames.push(partial));

    expect(frames.length).toBeGreaterThan(1);
    expect(frames[0]).toHaveLength(2);
    expect(frames[0].every((entry) => !entry.resolved)).toBe(true);
    expect(frames.at(-1)?.every((entry) => entry.resolved)).toBe(true);
  });

  it("keeps a probe listed when its attestation fails, marked resolved with no outcome", async () => {
    getEventsChunked
      .mockResolvedValueOnce([probeLog(ALICE, 1, 1, 10)])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    attestedReveal.mockRejectedValue(new Error("covalidator unavailable"));

    const entries = await loadVaultActivity(1, 0, 0);
    expect(entries).toHaveLength(1);
    expect(entries[0].resolved).toBe(true);
    expect(entries[0].outcome).toBeNull();
  });

  it("reveals each handle pair once and reuses the answer on reload", async () => {
    const logs = [probeLog(ALICE, 1, 1, 10)];
    answerFromTruth();

    getEventsChunked.mockResolvedValueOnce(logs).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await loadVaultActivity(1, 0, 0);
    const afterFirst = attestedReveal.mock.calls.length;

    getEventsChunked.mockResolvedValueOnce(logs).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const second = await loadVaultActivity(1, 0, 0);

    expect(attestedReveal.mock.calls.length).toBe(afterFirst);
    expect(second[0].outcome).toBe("warmer");
  });
});
