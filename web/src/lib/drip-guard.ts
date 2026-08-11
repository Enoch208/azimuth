const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP_PER_HOUR = 3;
const MAX_TOTAL_PER_HOUR = 25;

const byClient = new Map<string, number[]>();
let global: number[] = [];

function prune(stamps: number[], now: number): number[] {
  return stamps.filter((stamp) => now - stamp < WINDOW_MS);
}

export type DripVerdict = { allowed: true } | { allowed: false; reason: string };

export function checkDripAllowance(client: string): DripVerdict {
  const now = Date.now();

  global = prune(global, now);
  if (global.length >= MAX_TOTAL_PER_HOUR) {
    return { allowed: false, reason: "The faucet is rate limited right now. Try again shortly." };
  }

  const stamps = prune(byClient.get(client) ?? [], now);
  if (stamps.length >= MAX_PER_IP_PER_HOUR) {
    return { allowed: false, reason: "This connection has already funded 3 wallets this hour." };
  }

  byClient.set(client, stamps);
  return { allowed: true };
}

export function recordDrip(client: string): void {
  const now = Date.now();
  byClient.set(client, [...prune(byClient.get(client) ?? [], now), now]);
  global = [...prune(global, now), now];
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

let pending: Promise<unknown> = Promise.resolve();

export function serializeDrip<T>(run: () => Promise<T>): Promise<T> {
  const next = pending.then(run, run);
  pending = next.catch(() => undefined);
  return next;
}
