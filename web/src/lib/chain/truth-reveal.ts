import { bearingBetween } from "@/lib/hunt-client";
import { annotateAsymmetry } from "@/lib/chain/asymmetry";
import type { PublicEntry } from "@/lib/chain/activity";
import { cellLabel, type Bearing, type Coordinate } from "@/lib/types";

export const BASE_BLOCK_SECONDS = 2;

export type TruthTone = "warmer" | "colder" | "found" | "sealed" | "neutral";

export interface TruthEntry {
  elapsedSeconds: number;
  actor: string;
  isYou: boolean;
  kind: "probe" | "intel" | "found";
  headline: string;
  detail: string;
  tone: TruthTone;
  cell: Coordinate | null;
  origin: Coordinate | null;
  reconstructed: Bearing | null;
}

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

export function buildTruthReveal(
  entries: PublicEntry[],
  revealed: Coordinate,
  you?: string,
): TruthEntry[] {
  if (entries.length === 0) return [];

  const annotated = annotateAsymmetry(entries);
  const ordered = [...annotated].sort((a, b) => a.block - b.block);
  const firstBlock = ordered[0].block;

  const named = (hunter: string, callsign?: string | null) =>
    you && hunter.toLowerCase() === you.toLowerCase() ? "You" : (callsign ?? shorten(hunter));

  return ordered.map((entry) => {
    const actor = named(entry.hunter, entry.callsign);
    const isYou = Boolean(you && entry.hunter.toLowerCase() === you.toLowerCase());
    const elapsedSeconds = (entry.block - firstBlock) * BASE_BLOCK_SECONDS;
    const cell = { x: entry.x, y: entry.y };

    if (entry.kind === "bearing") {
      return {
        elapsedSeconds,
        actor,
        isYou,
        kind: "intel",
        headline: `${actor} bought a private bearing at ${cellLabel(cell)}`,
        detail: "PRIVATE DURING HUNT",
        tone: "sealed",
        cell: null,
        origin: cell,
        reconstructed: bearingBetween(cell, revealed),
      };
    }

    if (entry.kind === "settled") {
      return {
        elapsedSeconds,
        actor,
        isYou,
        kind: "found",
        headline: `${actor} settled the vault`,
        detail: `COORDINATES ${revealed.x}, ${revealed.y}`,
        tone: "found",
        cell: revealed,
        origin: null,
        reconstructed: null,
      };
    }

    const drift = entry.driftFromIntel;
    return {
      elapsedSeconds,
      actor,
      isYou,
      kind: "probe",
      headline: `${actor} probed ${cellLabel(cell)}`,
      detail:
        entry.outcome === "found"
          ? "VAULT FOUND"
          : drift
            ? `${(entry.outcome ?? "colder").toUpperCase()} · moving ${drift} of their pin`
            : (entry.outcome ?? "colder").toUpperCase(),
      tone: entry.outcome ?? "colder",
      cell,
      origin: entry.intelOrigin,
      reconstructed: null,
    };
  });
}
