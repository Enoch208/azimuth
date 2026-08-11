export interface FailureCopy {
  title: string;
  note: string;
}

const PATTERNS: { match: RegExp; copy: FailureCopy }[] = [
  {
    match: /user rejected|user denied|rejected the request/i,
    copy: {
      title: "You cancelled it",
      note: "Nothing was sent and nothing was spent. Pick a cell whenever you are ready.",
    },
  },
  {
    match: /insufficient funds|exceeds the balance/i,
    copy: {
      title: "Not enough Base Sepolia ETH",
      note: "Your wallet cannot cover the gas for this move. Top up from a Base Sepolia faucet and try again.",
    },
  },
  {
    match: /Not enough AZ credits/i,
    copy: {
      title: "Out of AZ",
      note: "You have spent your credits on this board. Find a vault to earn its bounty.",
    },
  },
  {
    match: /ProbeLimitReached|probe limit/i,
    copy: {
      title: "No probes left here",
      note: "You have used your whole allowance on this vault. Another vault is open.",
    },
  },
  {
    match: /VaultExpired|vault expired/i,
    copy: {
      title: "This vault closed",
      note: "It expired while you were deciding. The keeper will respawn it with fresh coordinates.",
    },
  },
  {
    match: /execution reverted/i,
    copy: {
      title: "The contract turned that move down",
      note: "Its rules rejected the move — the vault may have closed or your allowance may be spent. Nothing was spent; reload to see the current state.",
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
      note: "The network dropped the request before it was sent. Nothing was spent — try the cell again.",
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
      ? `${firstLine} Nothing was spent — try the cell again.`
      : "Nothing was spent. Try the cell again.",
  };
}
