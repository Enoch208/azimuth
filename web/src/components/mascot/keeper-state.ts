import { isFound, isOver, type Dig, type Temperature } from "@/lib/daily";

// Every mood the Keeper can hold. Game code never picks one of these by hand —
// it calls keeperStateFor() so the rules live in exactly one place.
export type KeeperState =
  | "idle"
  | "searching"
  | "freezing"
  | "cold"
  | "warm"
  | "hot"
  | "burning"
  | "found"
  | "outOfDigs"
  | "sealed"
  | "error";

export const KEEPER_STATES: KeeperState[] = [
  "idle",
  "searching",
  "freezing",
  "cold",
  "warm",
  "hot",
  "burning",
  "found",
  "outOfDigs",
  "sealed",
  "error",
];

// The contract a future keeper.riv must satisfy. Two inputs instead of one per
// mood: a Number addresses the state, and a Trigger re-plays it so two burning
// digs in a row both get a reaction instead of the second one sitting still.
//
//   State machine: "Keeper"
//     Number  state   0..10   (the indices below)
//     Trigger pulse           re-plays the current state's reaction
//
// KeeperMascot owns this mapping, so no caller ever learns the numbers.
export const KEEPER_RIVE_STATE: Record<KeeperState, number> = {
  idle: 0,
  searching: 1,
  freezing: 2,
  cold: 3,
  warm: 4,
  hot: 5,
  burning: 6,
  found: 7,
  outOfDigs: 8,
  sealed: 9,
  error: 10,
};

const BY_TEMPERATURE: Record<Temperature, KeeperState> = {
  0: "found",
  1: "burning",
  2: "hot",
  3: "warm",
  4: "cold",
  5: "freezing",
};

export interface KeeperInput {
  digs: Dig[];
  // A dig is in flight: signed, or on chain but not yet answered.
  pending?: boolean;
  // The last action failed. Outranks everything so the Keeper never celebrates
  // on top of an error.
  failed?: boolean;
  // The hunt is done and the result is being held back until the reveal.
  sealed?: boolean;
}

// Resolution order is deliberate and total: error beats an in-flight dig, an
// in-flight dig beats any result, a win beats running out, and only then does
// the last temperature decide the mood.
export function keeperStateFor({
  digs,
  pending = false,
  failed = false,
  sealed = false,
}: KeeperInput): KeeperState {
  if (failed) return "error";
  if (pending) return "searching";

  const latest = digs[digs.length - 1];
  const answer = latest ? latest.temperature : undefined;

  // A dig whose confidential answer has not arrived yet is still a question,
  // not an answer. It must never borrow a temperature it was never given —
  // showing "Freezing" for an unread dig is a lie the player would act on.
  if (answer === null) return "searching";

  if (isFound(digs)) return sealed ? "sealed" : "found";
  // isOver() also covers a win, which the line above already returned, so
  // reaching here means the six digs ran out.
  if (isOver(digs)) return "outOfDigs";
  if (answer !== undefined) return BY_TEMPERATURE[answer];
  return "idle";
}

// Spoken by screen readers in place of the animation.
export const KEEPER_LABEL: Record<KeeperState, string> = {
  idle: "The Keeper waits, dial steady, watching the map",
  searching: "The Keeper listens beneath the map, dial turning",
  freezing: "The Keeper shivers — that dig was nowhere near",
  cold: "The Keeper looks unimpressed — that dig was cold",
  warm: "The Keeper perks up — that dig was warm",
  hot: "The Keeper's eyes widen — that dig was hot",
  burning: "The Keeper shakes with excitement — that dig was burning",
  found: "The Keeper bursts open in celebration — the treasure is found",
  outOfDigs: "The Keeper slumps — the digs have run out",
  sealed: "The Keeper locks itself shut, guarding your result until the reveal",
  error: "The Keeper tilts, confused — something went wrong",
};
