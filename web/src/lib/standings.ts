import { DIGS, chebyshev, type Temperature, type Tile } from "@/lib/daily";

// Everything here reads REVEALED data only. A standing needs the treasure's real
// coordinates, which do not exist until the map opens after midnight — so there
// is no path by which this can leak a live day's secret.

export interface RevealedDig {
  tile: Tile;
  temperature: Temperature | null;
}

export interface RevealedTrail {
  hunter: string;
  callsign: string | null;
  digs: RevealedDig[];
}

export interface Standing {
  rank: number;
  hunter: string;
  callsign: string | null;
  found: boolean;
  // For a finder: the dig number the treasure landed on. For everyone else:
  // how many digs they spent.
  digsUsed: number;
  // Closest a hunter ever got, in tiles. Zero for a finder, null if they have
  // no digs at all.
  closest: number | null;
  // Every dig's distance, ascending. This is the tiebreaker ladder.
  distances: number[];
  // The dig number on which they first touched `closest`. Earlier is better.
  closestOn: number;
  score: number;
}

// Found: each extra dig costs 5. Missed: each extra tile of distance costs 7,
// so the best possible miss (70) always sits below the worst possible find (75).
const FOUND_BASE = 105;
const FOUND_STEP = 5;
const MISS_BASE = 77;
const MISS_STEP = 7;

export function foundScore(digsUsed: number): number {
  const digs = Math.min(DIGS, Math.max(1, digsUsed));
  return FOUND_BASE - FOUND_STEP * digs;
}

// Chebyshev distance on an 11x11 board tops out at 10, which scores 7. A hunter
// who never dug at all has no distance and scores nothing.
export function missScore(closest: number | null): number {
  if (closest === null) return 0;
  const distance = Math.min(10, Math.max(1, closest));
  return MISS_BASE - MISS_STEP * distance;
}

export function huntScore(found: boolean, digsUsed: number, closest: number | null): number {
  return found ? foundScore(digsUsed) : missScore(closest);
}

// A standing before it knows where it placed.
type Measured = Omit<Standing, "rank">;

function measure(treasure: Tile, trail: RevealedTrail): Measured {
  const distances = trail.digs.map((dig) => chebyshev(dig.tile, treasure));
  const foundIndex = distances.findIndex((distance) => distance === 0);
  const found = foundIndex >= 0;

  const sorted = [...distances].sort((a, b) => a - b);
  const closest = sorted.length > 0 ? sorted[0] : null;
  // Which dig first reached that best distance. 1-indexed; 0 means no digs.
  const closestOn = closest === null ? 0 : distances.indexOf(closest) + 1;

  return {
    hunter: trail.hunter,
    callsign: trail.callsign,
    found,
    digsUsed: found ? foundIndex + 1 : trail.digs.length,
    closest,
    distances: sorted,
    closestOn,
    score: huntScore(found, found ? foundIndex + 1 : trail.digs.length, closest),
  };
}

// Ranking is deliberately kept apart from scoring: two hunters can tie on score
// and still have a strict, reproducible order.
function compare(a: Measured, b: Measured): number {
  // A find always beats a miss, however close the miss came.
  if (a.found !== b.found) return a.found ? -1 : 1;

  if (a.found && b.found) {
    if (a.digsUsed !== b.digsUsed) return a.digsUsed - b.digsUsed;
    return a.hunter.toLowerCase() < b.hunter.toLowerCase() ? -1 : 1;
  }

  // A hunter with no digs ranks below anyone who actually played.
  if (a.closest === null || b.closest === null) {
    if (a.closest === b.closest) return a.hunter.toLowerCase() < b.hunter.toLowerCase() ? -1 : 1;
    return a.closest === null ? 1 : -1;
  }

  // Closest approach first.
  if (a.distances[0] !== b.distances[0]) return a.distances[0] - b.distances[0];
  // Then whoever got there in fewer digs — reaching one tile away on dig two is
  // a better hunt than reaching it on dig six.
  if (a.closestOn !== b.closestOn) return a.closestOn - b.closestOn;

  // Then the rest of the sorted trail, lexicographically: a hunter who was
  // consistently near beats one who got lucky once.
  const depth = Math.min(a.distances.length, b.distances.length);
  for (let i = 1; i < depth; i += 1) {
    if (a.distances[i] !== b.distances[i]) return a.distances[i] - b.distances[i];
  }
  if (a.distances.length !== b.distances.length) return a.distances.length - b.distances.length;

  // Wallet order, only so the list can never shuffle between renders.
  return a.hunter.toLowerCase() < b.hunter.toLowerCase() ? -1 : 1;
}

export function standingsFor(treasure: Tile, trails: RevealedTrail[]): Standing[] {
  return trails
    .map((trail) => measure(treasure, trail))
    .sort(compare)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

// Copy for a hunter who missed, once the map is open and the number is real.
export function missLine(closest: number): string {
  return closest === 1 ? "1 tile away" : `${closest} tiles away`;
}
