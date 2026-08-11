import { bearingBetween } from "@/lib/hunt-client";
import type { PublicEntry } from "@/lib/chain/activity";
import type { Bearing, Coordinate } from "@/lib/types";

export interface AnnotatedEntry extends PublicEntry {
  intelPin: number | null;
  intelOrigin: Coordinate | null;
  driftFromIntel: Bearing | null;
}

export interface IntelHolder {
  hunter: string;
  callsign: string | null;
  pins: number;
  lastOrigin: Coordinate;
  lastDrift: Bearing | null;
  movesSinceIntel: number;
}

function chronological(entries: PublicEntry[]): PublicEntry[] {
  return [...entries].sort((a, b) => a.block - b.block);
}

export function annotateAsymmetry(entries: PublicEntry[]): AnnotatedEntry[] {
  const held = new Map<string, { pin: number; origin: Coordinate }>();
  let pinCounter = 0;
  const annotated = new Map<PublicEntry, AnnotatedEntry>();

  for (const entry of chronological(entries)) {
    const key = entry.hunter.toLowerCase();
    if (entry.kind === "bearing") {
      pinCounter += 1;
      held.set(key, { pin: pinCounter, origin: { x: entry.x, y: entry.y } });
      annotated.set(entry, {
        ...entry,
        intelPin: pinCounter,
        intelOrigin: { x: entry.x, y: entry.y },
        driftFromIntel: null,
      });
      continue;
    }

    const intel = entry.kind === "probe" ? held.get(key) : undefined;
    annotated.set(entry, {
      ...entry,
      intelPin: intel?.pin ?? null,
      intelOrigin: intel?.origin ?? null,
      driftFromIntel: intel ? bearingBetween(intel.origin, { x: entry.x, y: entry.y }) : null,
    });
  }

  return entries.map((entry) => annotated.get(entry) as AnnotatedEntry);
}

export function intelHolders(entries: PublicEntry[], you?: string): IntelHolder[] {
  const holders = new Map<string, IntelHolder>();

  for (const entry of chronological(entries)) {
    const key = entry.hunter.toLowerCase();
    if (you && key === you.toLowerCase()) continue;

    if (entry.kind === "bearing") {
      const existing = holders.get(key);
      holders.set(key, {
        hunter: entry.hunter,
        callsign: entry.callsign ?? null,
        pins: (existing?.pins ?? 0) + 1,
        lastOrigin: { x: entry.x, y: entry.y },
        lastDrift: null,
        movesSinceIntel: 0,
      });
      continue;
    }

    const holder = holders.get(key);
    if (holder && entry.kind === "probe") {
      holder.lastDrift = bearingBetween(holder.lastOrigin, { x: entry.x, y: entry.y });
      holder.movesSinceIntel += 1;
    }
  }

  return [...holders.values()].sort((a, b) => b.pins - a.pins);
}
