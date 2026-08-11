export const FIELD = 11;
export const DIGS = 6;

export interface Tile {
  x: number;
  y: number;
}

export type Temperature = 0 | 1 | 2 | 3 | 4 | 5;

export interface TemperatureStyle {
  label: string;
  emoji: string;
  share: string;
  tone: string;
  fill: string;
}

export const TEMPERATURES: Record<Temperature, TemperatureStyle> = {
  0: { label: "Found", emoji: "💎", share: "💎", tone: "text-teal", fill: "var(--color-teal-bright)" },
  1: { label: "Burning", emoji: "🔥", share: "🟥", tone: "text-warmer", fill: "var(--color-warmer)" },
  2: { label: "Hot", emoji: "🌡", share: "🟧", tone: "text-warmer", fill: "var(--color-amber-deep)" },
  3: { label: "Warm", emoji: "🌤", share: "🟨", tone: "text-ink", fill: "var(--color-amber)" },
  4: { label: "Cold", emoji: "❄️", share: "🟦", tone: "text-colder", fill: "var(--color-colder)" },
  5: { label: "Freezing", emoji: "🥶", share: "⬜", tone: "text-colder", fill: "var(--color-paper-sunk)" },
};

export const chebyshev = (a: Tile, b: Tile) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// The same ladder the contract computes: (distance + 1) / 2, which lands on
// zero when you are standing on the treasure.
export function temperatureAt(guess: Tile, treasure: Tile): Temperature {
  return Math.floor((chebyshev(guess, treasure) + 1) / 2) as Temperature;
}

export interface Dig {
  tile: Tile;
  temperature: Temperature;
}

export function digsLeft(digs: Dig[]): number {
  return Math.max(0, DIGS - digs.length);
}

export function isFound(digs: Dig[]): boolean {
  return digs.some((dig) => dig.temperature === 0);
}

export function isOver(digs: Dig[]): boolean {
  return isFound(digs) || digs.length >= DIGS;
}

export function alreadyDug(digs: Dig[], tile: Tile): boolean {
  return digs.some((dig) => dig.tile.x === tile.x && dig.tile.y === tile.y);
}

// Day zero is the first day this game could have run. Kept here so the label a
// player shares matches the day index the contract used.
export const DAY_SECONDS = 86_400;
export const FIRST_DAY = 20_676;

export function dayIndex(nowSeconds: number): number {
  return Math.floor(nowSeconds / DAY_SECONDS);
}

export function huntNumber(day: number): number {
  return day - FIRST_DAY + 1;
}

// A shared result must never give away where the treasure is, or the first
// person to post their grid ends the day for everyone. Temperatures alone say
// how the hunt went without saying where anything was.
export function shareText(day: number, digs: Dig[]): string {
  const found = isFound(digs);
  const score = found ? `${digs.length}/${DIGS}` : `X/${DIGS}`;
  const trail = digs.map((dig) => TEMPERATURES[dig.temperature].share).join("");
  return `AZIMUTH #${huntNumber(day)} ${score}\n${trail}\n\nThe chain knows. You don't.`;
}

export function secondsUntilNextDay(nowSeconds: number): number {
  return DAY_SECONDS - (nowSeconds % DAY_SECONDS);
}

export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
