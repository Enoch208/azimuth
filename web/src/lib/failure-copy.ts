export interface FailureCopy {
  title: string;
  note: string;
}

const PATTERNS: { match: RegExp; copy: FailureCopy }[] = [
  {
    match: /DIG_LANDED_UNREAD/,
    copy: {
      title: "Your dig landed, the answer has not",
      note: "It is recorded on Base and it counted, but the confidential result is still being signed. Reload in a moment and it will be waiting.",
    },
  },
  {
    match: /user rejected|user denied|rejected the request/i,
    copy: {
      title: "You cancelled it",
      note: "Nothing was sent and nothing was spent. Pick a tile whenever you are ready.",
    },
  },
  {
    match: /insufficient funds|exceeds the balance/i,
    copy: {
      title: "Not enough Base Sepolia ETH",
      note: "Your wallet cannot cover the gas for this move. Top up from a Base Sepolia faucet and try again.",
    },
  },
  // The contract's own reverts, each named as the hunt rather than as the
  // selector that carried it. These sit above the generic revert on purpose.
  {
    match: /NoDigsLeft|AlreadyFinished/,
    copy: {
      title: "Your six digs are spent",
      note: "Today's hunt is sealed for you. The map opens after midnight UTC, and a fresh treasure is buried for tomorrow.",
    },
  },
  {
    match: /AlreadyDug/,
    copy: {
      title: "You have already dug there",
      note: "That tile has told you everything it knows. Pick one you have not opened.",
    },
  },
  {
    match: /OffMap/,
    copy: {
      title: "That tile is off the map",
      note: "The hunt runs on an eleven by eleven field. Pick a tile inside it.",
    },
  },
  {
    match: /ClaimAfterMidnight|DayStillRunning/,
    copy: {
      title: "The day is still running",
      note: "Nothing about today can be settled until the map opens after midnight UTC. That wait is what keeps the treasure hidden.",
    },
  },
  {
    match: /NotYourTreasure/,
    copy: {
      title: "That claim did not verify",
      note: "The signatures did not prove a find on that day. If you did find it, reload and try the claim once more.",
    },
  },
  {
    match: /HuntNotOpen/,
    copy: {
      title: "That hunt is not open",
      note: "No treasure was buried that day, or its map has not opened yet.",
    },
  },
  {
    match: /execution reverted/i,
    copy: {
      title: "The contract turned that move down",
      note: "Its rules turned the move down — your digs may be spent, or that tile may already be open. Nothing was spent; reload to see the current state.",
    },
  },
  {
    match: /nonce|replacement transaction underpriced|already known/i,
    copy: {
      title: "Your wallet is still busy",
      note: "A previous transaction has not cleared yet. Wait for it to confirm, then try again.",
    },
  },
  {
    match: /timeout|timed out|took too long/i,
    copy: {
      title: "Base did not answer in time",
      note: "The move may still land. Reload in a moment to see whether it went through.",
    },
  },
  {
    match: /rpc|network|fetch failed|failed to fetch|connection/i,
    copy: {
      title: "Could not reach Base",
      note: "The network dropped the request before it was sent. Nothing was spent — try the tile again.",
    },
  },
];

export function describeFailure(raw: string): FailureCopy {
  for (const { match, copy } of PATTERNS) {
    if (match.test(raw)) return copy;
  }
  const firstLine = raw.split("\n")[0].trim();
  return {
    title: "That move did not go through",
    note: firstLine.length > 0 && firstLine.length <= 140
      ? `${firstLine} Nothing was spent — try the tile again.`
      : "Nothing was spent. Try the tile again.",
  };
}
