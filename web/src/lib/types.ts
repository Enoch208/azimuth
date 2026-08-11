export const FIELD_SIZE = 64;
export const SECTOR_SIZE = 8;

export type VaultId = number;

export type Difficulty = "beginner" | "standard" | "hard";

export type VaultStatus = "active" | "found" | "expired";

export type ProbeOutcome = "warmer" | "colder" | "found";

export type Bearing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | "AT_TARGET";

export interface Coordinate {
  x: number;
  y: number;
}

export interface Vault {
  id: VaultId;
  name: string;
  difficulty: Difficulty;
  status: VaultStatus;
  bounty: number;
  hunters: number;
  probes: number;
  scansPurchased: number;
  createdAt: number;
  expiresAt: number;
  maxProbesPerHunter: number;
  maxScansPerHunter: number;
  round: number;
}

export interface ProbeRecord {
  vaultId: VaultId;
  hunter: string;
  at: Coordinate;
  outcome: ProbeOutcome;
  timestamp: number;
}

export interface ScanRecord {
  vaultId: VaultId;
  hunter: string;
  origin: Coordinate;
  timestamp: number;
}

export type ActivityEntry =
  | { kind: "probe"; record: ProbeRecord }
  | { kind: "scan"; record: ScanRecord }
  | { kind: "join"; vaultId: VaultId; hunter: string; timestamp: number };

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  beginner: "BEGINNER",
  standard: "STANDARD",
  hard: "HARD",
};

export function sectorLabel({ x, y }: Coordinate): string {
  const column = String.fromCharCode(65 + Math.floor(x / SECTOR_SIZE));
  const row = Math.floor(y / SECTOR_SIZE) + 1;
  return `${column}${row}`;
}

export function formatCoordinate({ x, y }: Coordinate): string {
  return `${x}, ${y}`;
}

export const SECTOR_COLUMNS = Array.from({ length: FIELD_SIZE / SECTOR_SIZE }, (_, index) =>
  String.fromCharCode(65 + index),
);

export const SECTOR_ROWS = Array.from({ length: FIELD_SIZE / SECTOR_SIZE }, (_, index) =>
  String(index + 1),
);

export function cellLabel(cell: Coordinate): string {
  return `${sectorLabel(cell)} · ${cell.x}, ${cell.y}`;
}

export const BEARING_ARROW: Record<Bearing, string> = {
  N: "↑",
  NE: "↗",
  E: "→",
  SE: "↘",
  S: "↓",
  SW: "↙",
  W: "←",
  NW: "↖",
  AT_TARGET: "◎",
};

export const BEARING_WORD: Record<Bearing, string> = {
  N: "North",
  NE: "Northeast",
  E: "East",
  SE: "Southeast",
  S: "South",
  SW: "Southwest",
  W: "West",
  NW: "Northwest",
  AT_TARGET: "You are on it",
};

export function formatRemaining(expiresAt: number, now: number): string {
  const seconds = Math.max(0, expiresAt - now);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}
