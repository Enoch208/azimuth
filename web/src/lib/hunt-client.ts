import type { Bearing, Coordinate, ProbeOutcome } from "@/lib/types";

export interface ProbeRecord {
  cell: Coordinate;
  outcome: ProbeOutcome;
  at: number;
}

export interface BearingRecord {
  origin: Coordinate;
  bearing: Bearing;
  at: number;
}

export interface HuntSnapshot {
  probes: ProbeRecord[];
  bearings: BearingRecord[];
  probesLeft: number;
  bearingsLeft: number;
  credits: number;
  found: boolean;
  settled: boolean;
  revealed: Coordinate | null;
}

export type HuntAction = "probe" | "bearing";

export interface HuntClient {
  readonly settlementLabel: string;
  readonly onchain: boolean;
  snapshot(): HuntSnapshot;
  probe(cell: Coordinate): Promise<HuntSnapshot>;
  buyBearing(origin: Coordinate): Promise<HuntSnapshot>;
  settle(): Promise<HuntSnapshot>;
}

const TAN_67_5_NUMERATOR = 41;
const TAN_67_5_DENOMINATOR = 17;

export function bearingBetween(from: Coordinate, target: Coordinate): Bearing {
  if (from.x === target.x && from.y === target.y) return "AT_TARGET";
  const east = target.x > from.x;
  const north = target.y < from.y;
  const dx = Math.abs(target.x - from.x);
  const dy = Math.abs(target.y - from.y);

  if (dx * TAN_67_5_DENOMINATOR >= dy * TAN_67_5_NUMERATOR) return east ? "E" : "W";
  if (dy * TAN_67_5_DENOMINATOR >= dx * TAN_67_5_NUMERATOR) return north ? "N" : "S";
  if (north) return east ? "NE" : "NW";
  return east ? "SE" : "SW";
}

export function squaredDistance(a: Coordinate, b: Coordinate): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

export const BEARING_VECTORS: Record<Bearing, Coordinate> = {
  AT_TARGET: { x: 0, y: 0 },
  N: { x: 0, y: -1 },
  NE: { x: 1, y: -1 },
  E: { x: 1, y: 0 },
  SE: { x: 1, y: 1 },
  S: { x: 0, y: 1 },
  SW: { x: -1, y: 1 },
  W: { x: -1, y: 0 },
  NW: { x: -1, y: -1 },
};
