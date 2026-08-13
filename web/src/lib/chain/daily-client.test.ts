import { beforeEach, describe, expect, it, vi } from "vitest";

// The chain and the covalidator are the two things this class coordinates, so
// both are stubbed and the class is left real.
const readContract = vi.fn();
const waitForTransactionReceipt = vi.fn();
const writeContract = vi.fn();
const attestedDecrypt = vi.fn();

vi.mock("@/lib/chain/config", () => ({
  DAILY_ADDRESS: "0x0000000000000000000000000000000000000001",
  publicClient: {
    readContract: (...args: unknown[]) => readContract(...args),
    waitForTransactionReceipt: (...args: unknown[]) => waitForTransactionReceipt(...args),
  },
}));

vi.mock("@/lib/chain/inco", () => ({
  getLightning: async () => ({ attestedDecrypt: (...a: unknown[]) => attestedDecrypt(...a) }),
}));

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    // The receipt is a stub, so the event it "contains" is stubbed with it.
    parseEventLogs: () => [{ args: { x: 3, y: 4, digNumber: 1, temperature: "0xdead" } }],
  };
});

const { DailyClient } = await import("@/lib/chain/daily-client");

const wallet = {
  account: { address: "0xhunter" },
  chain: { id: 84532 },
  writeContract: (...args: unknown[]) => writeContract(...args),
} as never;

function client() {
  return new DailyClient(20_678, wallet, "0xhunter", () => {});
}

beforeEach(() => {
  vi.clearAllMocks();
  writeContract.mockResolvedValue("0xhash");
  waitForTransactionReceipt.mockResolvedValue({ logs: [] });
  vi.useFakeTimers();
});

describe("a dig that landed is never taken off the board", () => {
  it("keeps the spent tile when the answer never arrives", async () => {
    // The transaction confirms. The covalidator refuses, every time.
    attestedDecrypt.mockRejectedValue(new Error("not ready"));
    const subject = client();

    const dig = subject.dig({ x: 3, y: 4 }).catch((error: Error) => error);
    await vi.runAllTimersAsync();
    const outcome = await dig;

    expect(outcome).toBeInstanceOf(Error);
    expect(String(outcome)).toContain("DIG_LANDED_UNREAD");

    // The tile is spent and the board must say so, with no temperature invented
    // for it. This is the whole point: it cost one of six either way.
    const snapshot = subject.snapshot();
    expect(snapshot.digs).toHaveLength(1);
    expect(snapshot.digs[0]).toEqual({ tile: { x: 3, y: 4 }, temperature: null });
    expect(snapshot.digsLeft).toBe(5);
  });

  it("fills the temperature in when the answer does arrive", async () => {
    attestedDecrypt.mockResolvedValue([{ plaintext: { value: 1n } }]);
    const subject = client();

    const snapshot = await subject.dig({ x: 3, y: 4 });

    expect(snapshot.digs).toEqual([{ tile: { x: 3, y: 4 }, temperature: 1 }]);
    expect(snapshot.digsLeft).toBe(5);
  });

  it("recovers the answer on a later attempt without spending a second dig", async () => {
    attestedDecrypt
      .mockRejectedValueOnce(new Error("not ready"))
      .mockResolvedValue([{ plaintext: { value: 0n } }]);
    const subject = client();

    const dig = subject.dig({ x: 3, y: 4 });
    await vi.runAllTimersAsync();
    const snapshot = await dig;

    expect(snapshot.digs).toEqual([{ tile: { x: 3, y: 4 }, temperature: 0 }]);
    expect(snapshot.digs).toHaveLength(1);
  });
});
