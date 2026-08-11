import {
  bearingBetween,
  squaredDistance,
  type BearingRecord,
  type HuntClient,
  type HuntSnapshot,
  type ProbeRecord,
} from "@/lib/hunt-client";
import { FIELD_SIZE, type Coordinate, type ProbeOutcome, type Vault } from "@/lib/types";

const PROBE_COST = 2;
const BEARING_COST = 20;
const STARTER_CREDITS = 500;
const RESOLVE_DELAY_MS = 420;

const randomCell = (): Coordinate => ({
  x: Math.floor(Math.random() * FIELD_SIZE),
  y: Math.floor(Math.random() * FIELD_SIZE),
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class LocalHuntClient implements HuntClient {
  readonly settlementLabel = "Practice vault · secret generated in this browser";
  readonly onchain = false;

  private secret: Coordinate;
  private probes: ProbeRecord[] = [];
  private bearings: BearingRecord[] = [];
  private best: number | null = null;
  private credits = STARTER_CREDITS;
  private found = false;

  constructor(private readonly vault: Vault) {
    this.secret = randomCell();
  }

  snapshot(): HuntSnapshot {
    return {
      probes: [...this.probes],
      bearings: [...this.bearings],
      probesLeft: Math.max(0, this.vault.maxProbesPerHunter - this.probes.length),
      bearingsLeft: Math.max(0, this.vault.maxScansPerHunter - this.bearings.length),
      credits: this.credits,
      found: this.found,
      settled: this.found,
      revealed: this.found ? { ...this.secret } : null,
    };
  }

  async probe(cell: Coordinate): Promise<HuntSnapshot> {
    const snapshot = this.snapshot();
    if (this.found || snapshot.probesLeft === 0 || this.credits < PROBE_COST) return snapshot;
    if (this.probes.some((record) => record.cell.x === cell.x && record.cell.y === cell.y)) {
      return snapshot;
    }

    await wait(RESOLVE_DELAY_MS);

    const distance = squaredDistance(cell, this.secret);
    const outcome: ProbeOutcome =
      distance === 0 ? "found" : this.best === null || distance < this.best ? "warmer" : "colder";

    this.best = this.best === null ? distance : Math.min(this.best, distance);
    this.credits -= PROBE_COST;
    this.probes.push({ cell, outcome, at: Date.now() });
    if (outcome === "found") this.found = true;

    return this.snapshot();
  }

  async settle(): Promise<HuntSnapshot> {
    return this.snapshot();
  }

  async buyBearing(origin: Coordinate): Promise<HuntSnapshot> {
    const snapshot = this.snapshot();
    if (this.found || snapshot.bearingsLeft === 0 || this.credits < BEARING_COST) return snapshot;

    await wait(RESOLVE_DELAY_MS);

    this.credits -= BEARING_COST;
    this.bearings.push({ origin, bearing: bearingBetween(origin, this.secret), at: Date.now() });

    return this.snapshot();
  }
}
