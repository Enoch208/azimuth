import { DIGS, isFound, type Dig } from "@/lib/daily";

// Where the player stands in today's hunt. One derivation, read by the status
// rail and anything else that needs to say what is happening.
export type HuntState = "not-started" | "hunting" | "found" | "digs-spent";

export function huntStateFor(digs: Dig[]): HuntState {
  if (digs.length === 0) return "not-started";
  if (isFound(digs)) return "found";
  if (digs.length >= DIGS) return "digs-spent";
  return "hunting";
}

// A finished hunt is a sealed hunt: nothing about it is public until the map
// opens, win or lose. The rail shows the outcome and this flag drives the seal.
export function isSealed(state: HuntState): boolean {
  return state === "found" || state === "digs-spent";
}

export const HUNT_STATE_LABEL: Record<HuntState, string> = {
  "not-started": "Not started",
  hunting: "Hunting",
  found: "Found",
  "digs-spent": "Digs spent",
};

export function digsRemaining(digs: Dig[]): number {
  return Math.max(0, DIGS - digs.length);
}
