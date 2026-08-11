import { BEARING_VECTORS, type BearingRecord, type ProbeRecord } from "@/lib/hunt-client";
import { FIELD_SIZE, type Bearing, type Coordinate } from "@/lib/types";

const TAN_NUMERATOR = 41;
const TAN_DENOMINATOR = 17;

const squared = (a: Coordinate, b: Coordinate) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

export function octantFrom(origin: Coordinate, target: Coordinate): Bearing {
  const east = target.x > origin.x;
  const north = target.y < origin.y;
  const dx = Math.abs(target.x - origin.x);
  const dy = Math.abs(target.y - origin.y);
  if (dx + dy === 0) return "AT_TARGET";
  if (dx * TAN_DENOMINATOR >= dy * TAN_NUMERATOR) return east ? "E" : "W";
  if (dy * TAN_DENOMINATOR >= dx * TAN_NUMERATOR) return north ? "N" : "S";
  return north ? (east ? "NE" : "NW") : east ? "SE" : "SW";
}

// Every cell the vault could still be sitting in, given only what this hunter
// has been told. It is bookkeeping the player could do on paper; doing it for
// them turns a pile of warmer/colder answers into a shrinking region.
export function survivingCells(probes: ProbeRecord[], bearings: BearingRecord[]): Coordinate[] {
  let live: Coordinate[] = [];
  for (let x = 0; x < FIELD_SIZE; x += 1) {
    for (let y = 0; y < FIELD_SIZE; y += 1) live.push({ x, y });
  }

  for (const scan of bearings) {
    if (scan.bearing === "AT_TARGET") {
      live = live.filter((cell) => cell.x === scan.origin.x && cell.y === scan.origin.y);
      continue;
    }
    if (!(scan.bearing in BEARING_VECTORS)) continue;
    live = live.filter((cell) => octantFrom(scan.origin, cell) === scan.bearing);
  }

  const best = new Map<string, number>();
  const key = (cell: Coordinate) => `${cell.x},${cell.y}`;

  for (const probe of probes) {
    if (probe.outcome === "found") {
      return [probe.cell];
    }
    const warmer = probe.outcome === "warmer";
    live = live.filter((cell) => {
      const previous = best.get(key(cell)) ?? Number.POSITIVE_INFINITY;
      return squared(probe.cell, cell) < previous === warmer;
    });
    live = live.filter((cell) => !(cell.x === probe.cell.x && cell.y === probe.cell.y));
    for (const cell of live) {
      const previous = best.get(key(cell)) ?? Number.POSITIVE_INFINITY;
      best.set(key(cell), Math.min(previous, squared(probe.cell, cell)));
    }
  }

  return live;
}

export function narrowing(total: number, remaining: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - remaining / total));
}

export const FIELD_CELLS = FIELD_SIZE * FIELD_SIZE;
