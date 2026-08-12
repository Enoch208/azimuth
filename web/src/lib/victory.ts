import { DIGS, anyUnread, isFound, isOver, type Dig, type Temperature } from "@/lib/daily";

export interface HuntOutcome {
  found: boolean;
  // Digs the player actually spent. A win on the fourth dig scores 4/6 even
  // though two digs were left unused.
  digsUsed: number;
  score: string;
  // Every dig in order. null entries are answers that have not arrived.
  trail: (Temperature | null)[];
  // Nothing about a finished hunt is public until the reveal.
  sealed: boolean;
}

export function huntOutcome(digs: Dig[]): HuntOutcome {
  const found = isFound(digs);
  return {
    found,
    digsUsed: digs.length,
    score: `${found ? digs.length : "X"}/${DIGS}`,
    trail: digs.map((entry) => entry.temperature),
    sealed: isOver(digs),
  };
}

// The overlay is the emotional climax, so it only fires on a settled win: the
// treasure is found, nothing is still in flight, and no answer is outstanding.
// Celebrating over a half-arrived board would undercut the moment and could
// show a trail that changes underneath the player.
export function shouldCelebrate(digs: Dig[], pending: boolean): boolean {
  if (pending) return false;
  if (anyUnread(digs)) return false;
  return isFound(digs);
}

export function victoryLine(digs: Dig[]): string {
  return `You found it in ${digs.length}/${DIGS} digs`;
}

// Shown when the six digs run out. Deliberately not a dead end — the treasure
// is still secret, which is the reason to come back tomorrow.
export function defeatLine(): string {
  return `You spent all ${DIGS} digs. The treasure stays buried until the map opens.`;
}
