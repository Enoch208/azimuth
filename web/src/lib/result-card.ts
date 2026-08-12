import { DIGS, formatCountdown, huntNumber, type Temperature } from "@/lib/daily";
import { missLine } from "@/lib/standings";

// The share card is the only part of AZIMUTH a stranger sees, and during a live
// day it can be posted while other people are still hunting. So the sealed card
// is a SEPARATE TYPE, not a flag on a richer one: there is no field on it that
// could hold a coordinate, a rank, a distance or another hunter. Privacy here
// is a property of the shape, not of the rendering.

export interface CardIdentity {
  callsign: string | null;
  // Always masked. The full address never enters a card.
  wallet: string;
}

export interface SealedCard {
  kind: "sealed";
  huntNumber: number;
  identity: CardIdentity;
  found: boolean;
  digsUsed: number;
  digsAllowed: number;
  // Temperatures only — never the tiles they came from. A temperature without
  // its coordinate says how the hunt felt without saying where anything is.
  trail: (Temperature | null)[];
  headline: string;
  countdown: string;
}

export interface RevealedCard {
  kind: "revealed";
  huntNumber: number;
  identity: CardIdentity;
  found: boolean;
  digsUsed: number;
  digsAllowed: number;
  trail: (Temperature | null)[];
  headline: string;
  rank: number;
  score: number;
  // Once the map is open this is public knowledge, so it can be shown.
  closest: number | null;
  closestLine: string | null;
  streak: number;
}

export type ResultCard = SealedCard | RevealedCard;

export function maskWallet(address: string): string {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function identityFor(address: string, callsign: string | null): CardIdentity {
  return { callsign, wallet: maskWallet(address) };
}

export function sealedHeadline(found: boolean): string {
  return found ? "Treasure found" : "Digs spent";
}

// After the reveal a miss earns a real reaction instead of the same flat line.
export function revealedHeadline(found: boolean, closest: number | null): string {
  if (found) return "Treasure found";
  if (closest !== null && closest <= 2) return "So close";
  return "The trail went cold";
}

export function sealedCard(input: {
  day: number;
  address: string;
  callsign: string | null;
  found: boolean;
  digsUsed: number;
  trail: (Temperature | null)[];
  secondsToReveal: number;
}): SealedCard {
  return {
    kind: "sealed",
    huntNumber: huntNumber(input.day),
    identity: identityFor(input.address, input.callsign),
    found: input.found,
    digsUsed: input.digsUsed,
    digsAllowed: DIGS,
    trail: [...input.trail],
    headline: sealedHeadline(input.found),
    countdown: formatCountdown(input.secondsToReveal),
  };
}

export function revealedCard(input: {
  day: number;
  address: string;
  callsign: string | null;
  found: boolean;
  digsUsed: number;
  trail: (Temperature | null)[];
  rank: number;
  score: number;
  closest: number | null;
  streak: number;
}): RevealedCard {
  return {
    kind: "revealed",
    huntNumber: huntNumber(input.day),
    identity: identityFor(input.address, input.callsign),
    found: input.found,
    digsUsed: input.digsUsed,
    digsAllowed: DIGS,
    trail: [...input.trail],
    headline: revealedHeadline(input.found, input.closest),
    rank: input.rank,
    score: input.score,
    closest: input.closest,
    closestLine: input.found || input.closest === null ? null : missLine(input.closest),
    streak: input.streak,
  };
}

export function scoreLine(card: ResultCard): string {
  return `${card.digsUsed} / ${card.digsAllowed} digs`;
}

// Keys that must never appear anywhere inside a sealed card, at any depth.
// Kept here so the guard and the test agree on one list.
export const FORBIDDEN_SEALED_KEYS = [
  "tile",
  "tiles",
  "x",
  "y",
  "treasure",
  "sector",
  "rank",
  "score",
  "closest",
  "closestLine",
  "distance",
  "distances",
  "hunter",
  "hunters",
  "trails",
  "standings",
];

// Walks a value and reports anything that would leak a live hunt. Used by the
// test, and by the exporter as a last line of defence before a PNG is produced.
export function sealedLeaks(card: unknown, secrets: string[] = []): string[] {
  const found: string[] = [];

  const walk = (value: unknown, path: string) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`));
      return;
    }
    if (typeof value === "object") {
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (FORBIDDEN_SEALED_KEYS.includes(key)) found.push(`${path}.${key}`);
        walk(entry, `${path}.${key}`);
      }
      return;
    }
    const text = String(value);
    for (const secret of secrets) {
      if (secret && text.toLowerCase().includes(secret.toLowerCase())) {
        found.push(`${path} contains "${secret}"`);
      }
    }
  };

  walk(card, "card");
  return found;
}
