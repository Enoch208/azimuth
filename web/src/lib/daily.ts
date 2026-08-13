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
  // null while the confidential answer is still being signed. The dig itself is
  // already on chain and already counted.
  temperature: Temperature | null;
}

export function digsLeft(digs: Dig[]): number {
  return Math.max(0, DIGS - digs.length);
}

export function isFound(digs: Dig[]): boolean {
  return digs.some((dig) => dig.temperature === 0);
}

export function anyUnread(digs: Dig[]): boolean {
  return digs.some((dig) => dig.temperature === null);
}

export function isOver(digs: Dig[]): boolean {
  return isFound(digs) || digs.length >= DIGS;
}

export function alreadyDug(digs: Dig[], tile: Tile): boolean {
  return digs.some((dig) => dig.tile.x === tile.x && dig.tile.y === tile.y);
}

// A sealed guess travels to the contract as one number, x + FIELD * y, so the
// whole thing is a single ciphertext and a single comparison.
export function tileIndex(tile: Tile): number {
  return tile.x + FIELD * tile.y;
}

export function tileFromIndex(index: number): Tile {
  return { x: index % FIELD, y: Math.floor(index / FIELD) };
}

// A hunter's last word, once the map has opened enough to read it.
export interface Guess {
  // Null while the guess is still sealed to everyone but its owner.
  tile: Tile | null;
  right: boolean | null;
}

// The last word is offered only to a hunter who spent all six digs and never
// turned the treasure up. Finding it by digging ends the hunt on its own, and
// the contract allows only one guess a day.
export function canSeal(digs: Dig[], guessed: boolean): boolean {
  return !guessed && digs.length >= DIGS && !isFound(digs);
}

// The first day the contract now deployed could run. Hunt numbering is relative
// to the contract being played, so a shared "#1" means the first hunt this
// deployment ever held rather than a day it has no record of.
export const DAY_SECONDS = 86_400;
export const FIRST_DAY = 20_678;

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
  const trail = digs
    .map((dig) => (dig.temperature === null ? "⬛" : TEMPERATURES[dig.temperature].share))
    .join("");
  return `AZIMUTH #${huntNumber(day)} ${score}\n${trail}\n\nThe chain knows. You don't.`;
}

// Tiles read as a chess-style reference so a treasure can be named out loud.
export function sectorName(tile: Tile): string {
  return `${String.fromCharCode(65 + tile.x)}${tile.y + 1}`;
}

export function secondsUntilNextDay(nowSeconds: number): number {
  return DAY_SECONDS - (nowSeconds % DAY_SECONDS);
}

// How long until the map opens, read at the moment it is asked for. Lives here
// rather than in a component so the clock is never touched during a render.
export function secondsToReveal(): number {
  return secondsUntilNextDay(Math.floor(Date.now() / 1000));
}

export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
