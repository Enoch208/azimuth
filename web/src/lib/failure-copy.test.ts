import { describe, expect, it } from "vitest";
import { describeFailure } from "@/lib/failure-copy";

const VIEM_RPC_DUMP = `An unknown RPC error occurred. Request Arguments: chain: Base Sepolia (id: 84532) from: 0xA69C2e36d7fd2e3834eE274Aa7B12bdBDA304b07 to: 0x60948d993B9c4F12982F155f36d049F995602a89 data: 0xf679028800000000000000000000000000000000000000000000000000000000`;

describe("failure copy never shows a player raw chain plumbing", () => {
  it("turns a viem RPC dump into one readable sentence", () => {
    const copy = describeFailure(VIEM_RPC_DUMP);
    expect(copy.title).toBe("Could not reach Base");
    expect(copy.note).not.toMatch(/0x[0-9a-f]{16}/i);
    expect(copy.note).not.toContain("Request Arguments");
  });

  it("never leaks calldata for any known failure", () => {
    const cases = [
      VIEM_RPC_DUMP,
      "User rejected the request.",
      "insufficient funds for gas * price + value",
      "nonce too low: next nonce 30, tx nonce 29",
      "execution reverted: NoDigsLeft",
      "execution reverted: AlreadyDug",
      "The request timed out.",
    ];
    for (const raw of cases) {
      const copy = describeFailure(raw);
      expect(copy.note).not.toMatch(/0x[0-9a-f]{20,}/i);
      expect(copy.title.length).toBeLessThan(60);
      expect(copy.note.length).toBeGreaterThan(0);
    }
  });

  it("tells a player who cancelled that nothing was spent", () => {
    const copy = describeFailure("User rejected the request.");
    expect(copy.title).toBe("You cancelled it");
    expect(copy.note).toMatch(/nothing was spent/i);
  });

  it("distinguishes running out of gas money from running out of digs", () => {
    expect(describeFailure("insufficient funds for gas").title).toMatch(/Base Sepolia ETH/);
    expect(describeFailure("execution reverted: NoDigsLeft").title).toBe("Your six digs are spent");
  });

  it("explains a busy wallet rather than repeating the nonce numbers", () => {
    const copy = describeFailure("nonce too low: next nonce 30, tx nonce 29");
    expect(copy.title).toBe("Your wallet is still busy");
  });

  it("explains a contract revert without echoing solidity", () => {
    const copy = describeFailure("Execution reverted with reason: Execution reverted for an unknown reason.");
    expect(copy.title).toBe("The contract turned that move down");
    expect(copy.note).not.toMatch(/revert/i);
  });

  it("keeps a short unrecognised message but still reassures", () => {
    const copy = describeFailure("Something odd happened.");
    expect(copy.title).toBe("That move did not go through");
    expect(copy.note).toContain("Something odd happened.");
    expect(copy.note).toMatch(/try the tile again/i);
  });

  it("drops an unrecognised message that is too long to read", () => {
    const copy = describeFailure("z".repeat(400));
    expect(copy.note).toBe("Nothing was spent. Try the tile again.");
  });
});

// The contract's own reverts are the failures a player is most likely to meet.
// Each one names what the hunt did, never the selector that carried it.
describe("every AzimuthDaily revert reads as the game, not as solidity", () => {
  const REVERTS: [string, string][] = [
    ["NoDigsLeft", "Your six digs are spent"],
    ["AlreadyFinished", "Your six digs are spent"],
    ["AlreadyDug", "You have already dug there"],
    ["OffMap", "That tile is off the map"],
    ["ClaimAfterMidnight", "The day is still running"],
    ["DayStillRunning", "The day is still running"],
    ["NotYourTreasure", "That claim did not verify"],
    ["HuntNotOpen", "That hunt is not open"],
  ];

  for (const [error, title] of REVERTS) {
    it(`explains ${error} without echoing it`, () => {
      const copy = describeFailure(`execution reverted: ${error}`);
      expect(copy.title).toBe(title);
      expect(copy.note).not.toContain(error);
      expect(copy.note).not.toMatch(/revert/i);
    });
  }

  it("keeps no copy from the retired vault game", () => {
    const everything = REVERTS.map(([error]) => describeFailure(`execution reverted: ${error}`))
      .concat(describeFailure("execution reverted"), describeFailure("Something odd happened."));
    for (const copy of everything) {
      expect(`${copy.title} ${copy.note}`).not.toMatch(/vault|probe|\bAZ\b|bounty|credits/i);
    }
  });
});

describe("a dig that landed must never be reported as a no-op", () => {
  it("tells the player it counted and to reload", () => {
    const copy = describeFailure("DIG_LANDED_UNREAD: your dig was recorded on Base, but its result has not arrived yet.");
    expect(copy.title).toBe("Your dig landed, the answer has not");
    expect(copy.note).not.toMatch(/nothing was spent/i);
    expect(copy.note).toMatch(/counted/i);
  });
});
