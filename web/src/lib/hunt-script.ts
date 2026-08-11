import { sectorLabel, type Bearing, type Coordinate, type ProbeOutcome } from "@/lib/types";

export const DEMO_SECRET: Coordinate = { x: 35, y: 14 };

export interface TrailMark {
  at: Coordinate;
  outcome: ProbeOutcome;
}

export const DEMO_TRAIL: TrailMark[] = [
  { at: { x: 32, y: 32 }, outcome: "warmer" },
  { at: { x: 46, y: 44 }, outcome: "colder" },
  { at: { x: 24, y: 26 }, outcome: "warmer" },
  { at: { x: 31, y: 19 }, outcome: "warmer" },
  { at: { x: 35, y: 14 }, outcome: "found" },
];

export const DEMO_BEARING_ORIGIN: Coordinate = DEMO_TRAIL[2].at;
export const DEMO_BEARING: Bearing = "NE";

export type KeeperMood = ProbeOutcome | "idle" | "bearing" | "thinking";

export interface Frame {
  marks: number;
  bearing: boolean;
  revealed: boolean;
  mood: KeeperMood;
  title: string;
  note: string;
  outcome: ProbeOutcome | null;
  ms: number;
}

const probing = (index: number): Frame => ({
  marks: index,
  bearing: index > 3,
  revealed: false,
  mood: "thinking",
  title: `Probing ${sectorLabel(DEMO_TRAIL[index].at)}`,
  note: "Confidential compare against the ciphertext",
  outcome: null,
  ms: 680,
});

const result = (index: number, note: string, ms: number): Frame => ({
  marks: index + 1,
  bearing: index > 2,
  revealed: DEMO_TRAIL[index].outcome === "found",
  mood: DEMO_TRAIL[index].outcome,
  title:
    DEMO_TRAIL[index].outcome === "found"
      ? "Vault found"
      : DEMO_TRAIL[index].outcome === "warmer"
        ? "Warmer"
        : "Colder",
  note,
  outcome: DEMO_TRAIL[index].outcome,
  ms,
});

export const FRAMES: Frame[] = [
  probing(0),
  result(0, "First reading. Everything is measured against this now.", 1150),
  probing(1),
  result(1, "Further than the best distance so far.", 1150),
  probing(2),
  result(2, "Closer. Every hunter watching sees this too.", 1150),
  {
    marks: 3,
    bearing: false,
    revealed: false,
    mood: "thinking",
    title: "Buying an AZIMUTH scan",
    note: "20 AZ · one of eight compass directions",
    outcome: null,
    ms: 780,
  },
  {
    marks: 3,
    bearing: true,
    revealed: false,
    mood: "bearing",
    title: DEMO_BEARING,
    note: "Encrypted to this wallet. Rivals see the purchase, never the direction.",
    outcome: null,
    ms: 2000,
  },
  probing(3),
  result(3, "Inside the wedge the bearing left standing.", 1150),
  probing(4),
  result(4, "Exact cell. The coordinates become readable for the first time.", 2900),
  {
    marks: 0,
    bearing: false,
    revealed: false,
    mood: "idle",
    title: "New vault sealed",
    note: "Fresh coordinates generated encrypted onchain",
    outcome: null,
    ms: 1200,
  },
];

export const FOUND_FRAME = FRAMES.findIndex((frame) => frame.revealed);

export const LOOP_MS = FRAMES.reduce((total, frame) => total + frame.ms, 0);
