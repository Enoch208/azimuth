// What does a hunter actually get for their money?
//
// Public probes are visible to everyone, so a hunter may fold in every rival's
// probe as well as their own. Bearings are sealed to the buyer, so only the
// hunter's own bearings constrain their view. This models one hunter's
// perspective honestly and prices the result in AZ.

const TAN_N = 41n;
const TAN_D = 17n;
const PROBE_COST = 2;
const BEARING_COST = 20;

const sq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

function octant(origin, target) {
  const east = target.x > origin.x;
  const north = target.y < origin.y;
  const dx = BigInt(Math.abs(target.x - origin.x));
  const dy = BigInt(Math.abs(target.y - origin.y));
  if (dx + dy === 0n) return "AT_TARGET";
  if (dx * TAN_D >= dy * TAN_N) return east ? "E" : "W";
  if (dy * TAN_D >= dx * TAN_N) return north ? "N" : "S";
  return north ? (east ? "NE" : "NW") : east ? "SE" : "SW";
}

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bestFor = (cell, hunter) => cell.best.get(hunter) ?? Infinity;

function chooseProbe(live, hunter, rng) {
  if (live.length <= 2) return live[0];
  const step = live.length > 400 ? Math.ceil(live.length / 400) : 1;
  const sample = live.filter((_, i) => i % step === 0);
  let choice = null;
  let bestScore = Infinity;
  for (const guess of sample) {
    let closer = 0;
    for (const c of live) if (sq(guess, c) < bestFor(c, hunter)) closer += 1;
    const score = Math.abs(closer - live.length / 2);
    if (score < bestScore) {
      bestScore = score;
      choice = guess;
    }
  }
  return choice ?? live[Math.floor(rng() * live.length)];
}

function coarseCompare(distance, runningBest, shaping, spentSoFar) {
  if (shaping.coarsenAfter !== null && spentSoFar >= shaping.coarsenAfter) {
    return Math.floor(distance / shaping.bucket) < Math.floor(runningBest / shaping.bucket);
  }
  return distance < runningBest;
}

function runHunt({ size, probesEach, rivals, myBearings, shaping, seed }) {
  const rng = mulberry(seed);
  const secret = { x: Math.floor(rng() * size), y: Math.floor(rng() * size) };

  let live = [];
  for (let x = 0; x < size; x += 1)
    for (let y = 0; y < size; y += 1) live.push({ x, y, best: new Map() });

  const tried = new Set();
  const runningBest = new Map();
  const spent = new Map();
  const everyone = ["me", ...Array.from({ length: rivals }, (_, i) => `r${i}`)];
  for (const h of everyone) {
    runningBest.set(h, Infinity);
    spent.set(h, 0);
  }

  // my own bearings, sealed to me, applied before I start probing
  for (let b = 0; b < myBearings; b += 1) {
    const origin = { x: Math.floor(rng() * size), y: Math.floor(rng() * size) };
    const said = octant(origin, secret);
    live = live.filter((c) => octant(origin, c) === said);
  }

  let winner = null;
  let exhausted = false;

  while (!exhausted && winner === null) {
    exhausted = true;
    for (const h of everyone) {
      if (spent.get(h) >= probesEach) continue;
      exhausted = false;

      const guess = chooseProbe(live, h, rng);
      if (!guess) return { winner: null, mine: spent.get("me"), remaining: 0 };

      const distance = sq(guess, secret);
      const closer = coarseCompare(distance, runningBest.get(h), shaping, spent.get(h));
      runningBest.set(h, Math.min(runningBest.get(h), distance));
      spent.set(h, spent.get(h) + 1);

      if (distance === 0) {
        winner = h;
        break;
      }

      tried.add(`${guess.x},${guess.y}`);
      live = live.filter((c) => (sq(guess, c) < bestFor(c, h)) === closer);
      live = live.filter((c) => !tried.has(`${c.x},${c.y}`));
      for (const c of live) c.best.set(h, Math.min(bestFor(c, h), sq(guess, c)));

      if (live.length === 0) return { winner: null, mine: spent.get("me"), remaining: 0 };
      if (live.length === 1) {
        // whoever moves next takes it; that is me only if it is my turn
        const next = everyone.find((x) => spent.get(x) < probesEach);
        winner = next ?? null;
        if (winner === "me") spent.set("me", spent.get("me") + 1);
        break;
      }
    }
  }

  return { winner, mine: spent.get("me"), remaining: live.length };
}

function trial(config, rivals, myBearings, trials = 80) {
  const wins = [];
  let iWon = 0;
  for (let t = 0; t < trials; t += 1) {
    const r = runHunt({ ...config, rivals, myBearings, seed: t * 7919 + 13 });
    if (r.winner === "me") {
      iWon += 1;
      wins.push(r.mine);
    }
  }
  wins.sort((a, b) => a - b);
  const median = wins.length ? wins[Math.floor(wins.length / 2)] : null;
  return {
    winRate: iWon / trials,
    medianProbes: median,
    az: median === null ? null : median * PROBE_COST + myBearings * BEARING_COST,
  };
}

const BASE = { coarsenAfter: null, bucket: 1 };

const CONFIGS = [
  { label: "current   64x64, 20 probes", size: 64, probesEach: 20, shaping: BASE },
  { label: "tighter   64x64, 12 probes", size: 64, probesEach: 12, shaping: BASE },
  { label: "tighter   64x64,  8 probes", size: 64, probesEach: 8, shaping: BASE },
  { label: "bigger  128x128, 20 probes", size: 128, probesEach: 20, shaping: BASE },
  { label: "bigger  128x128, 12 probes", size: 128, probesEach: 12, shaping: BASE },
  { label: "blurred   64x64, 20p after 6", size: 64, probesEach: 20, shaping: { coarsenAfter: 6, bucket: 64 } },
  { label: "blurred  128x128, 16p after 6", size: 128, probesEach: 16, shaping: { coarsenAfter: 6, bucket: 256 } },
];

const fmt = (r) =>
  r.medianProbes === null
    ? "   never    "
    : `${String(r.medianProbes).padStart(2)}p ${String(r.az).padStart(3)}AZ ${String(Math.round(r.winRate * 100)).padStart(3)}%`;

console.log("One hunter's view. Median own-probes to win / AZ spent / share of hunts won.");
console.log("A bearing costs 20 AZ, the same as ten probes, so it must save more than ten probes to pay.\n");
console.log("configuration                  alone no intel  alone 1 bearing  vs 2 rivals    vs 2 rivals +1");
console.log("-".repeat(100));

for (const config of CONFIGS) {
  const a = trial(config, 0, 0);
  const b = trial(config, 0, 1);
  const c = trial(config, 2, 0);
  const d = trial(config, 2, 1);
  const saved = a.medianProbes !== null && b.medianProbes !== null ? a.medianProbes - b.medianProbes : null;
  const verdict =
    saved === null ? "" : saved * PROBE_COST > BEARING_COST ? `  bearing pays (+${saved}p)` : `  bearing loses (${saved}p saved, needs 11)`;
  console.log(`${config.label.padEnd(30)} ${fmt(a)}  ${fmt(b)}  ${fmt(c)}  ${fmt(d)}${verdict}`);
}
