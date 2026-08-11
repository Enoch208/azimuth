// Each hunter keeps their own view: their probes land immediately, rivals'
// probes arrive after a publication delay, and their bearings are theirs alone.
// This is the model that can tell delayed publication apart from free-riding.

const TAN_N = 41n;
const TAN_D = 17n;
const PROBE_COST = 2;

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

function ring(origin, target, size, bands) {
  const d = Math.sqrt(sq(origin, target));
  const max = size * Math.SQRT2;
  return Math.min(bands - 1, Math.floor((d / max) * bands));
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

class View {
  constructor(size) {
    this.live = [];
    for (let x = 0; x < size; x += 1)
      for (let y = 0; y < size; y += 1) this.live.push({ x, y, best: new Map() });
    this.tried = new Set();
  }
  bestFor(cell, who) {
    return cell.best.get(who) ?? Infinity;
  }
  absorbProbe(who, guess, closer) {
    this.tried.add(`${guess.x},${guess.y}`);
    this.live = this.live.filter((c) => (sq(guess, c) < this.bestFor(c, who)) === closer);
    this.live = this.live.filter((c) => !this.tried.has(`${c.x},${c.y}`));
    for (const c of this.live) c.best.set(who, Math.min(this.bestFor(c, who), sq(guess, c)));
  }
  absorbBearing(origin, said) {
    this.live = this.live.filter((c) => octant(origin, c) === said);
  }
  absorbRing(origin, band, size, bands) {
    this.live = this.live.filter((c) => ring(origin, c, size, bands) === band);
  }
  pick(who, rng) {
    if (this.live.length <= 2) return this.live[0];
    const step = this.live.length > 400 ? Math.ceil(this.live.length / 400) : 1;
    const sample = this.live.filter((_, i) => i % step === 0);
    let choice = null;
    let bestScore = Infinity;
    for (const guess of sample) {
      let closer = 0;
      for (const c of this.live) if (sq(guess, c) < this.bestFor(c, who)) closer += 1;
      const score = Math.abs(closer - this.live.length / 2);
      if (score < bestScore) {
        bestScore = score;
        choice = guess;
      }
    }
    return choice ?? this.live[Math.floor(rng() * this.live.length)];
  }
}

function runHunt({ size, probesEach, rivals, myBearings, bearingBands, publicDelay, seed }) {
  const rng = mulberry(seed);
  const secret = { x: Math.floor(rng() * size), y: Math.floor(rng() * size) };
  const everyone = ["me", ...Array.from({ length: rivals }, (_, i) => `r${i}`)];
  for (let i = everyone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [everyone[i], everyone[j]] = [everyone[j], everyone[i]];
  }

  const views = new Map(everyone.map((h) => [h, new View(size)]));
  const runningBest = new Map(everyone.map((h) => [h, Infinity]));
  const spent = new Map(everyone.map((h) => [h, 0]));

  for (let b = 0; b < myBearings; b += 1) {
    const origin = { x: Math.floor(rng() * size), y: Math.floor(rng() * size) };
    views.get("me").absorbBearing(origin, octant(origin, secret));
    if (bearingBands > 1) {
      views.get("me").absorbRing(origin, ring(origin, secret, size, bearingBands), size, bearingBands);
    }
  }

  const pending = [];
  let tick = 0;
  let winner = null;
  let exhausted = false;

  while (!exhausted && winner === null) {
    exhausted = true;
    for (const h of everyone) {
      if (spent.get(h) >= probesEach) continue;
      exhausted = false;

      for (const item of pending) {
        if (!item.delivered && tick - item.at >= publicDelay) {
          for (const [who, view] of views) {
            if (who !== item.by) view.absorbProbe(item.by, item.guess, item.closer);
          }
          item.delivered = true;
        }
      }

      const view = views.get(h);
      const guess = view.pick(h, rng);
      if (!guess) return { winner: null, mine: spent.get("me") };

      const distance = sq(guess, secret);
      const closer = distance < runningBest.get(h);
      runningBest.set(h, Math.min(runningBest.get(h), distance));
      spent.set(h, spent.get(h) + 1);
      tick += 1;

      if (distance === 0) {
        winner = h;
        break;
      }
      view.absorbProbe(h, guess, closer);
      pending.push({ by: h, guess, closer, at: tick, delivered: false });

      if (view.live.length === 1 && spent.get(h) < probesEach) {
        winner = h;
        spent.set(h, spent.get(h) + 1);
        break;
      }
      if (view.live.length === 0) return { winner: null, mine: spent.get("me") };
    }
  }
  return { winner, mine: spent.get("me") };
}

function trial(config, rivals, myBearings, bearingCost, trials = 140) {
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
    probes: median,
    az: median === null ? null : median * PROBE_COST + myBearings * bearingCost,
  };
}

const fmt = (r) =>
  r.probes === null ? "  never   " : `${String(r.probes).padStart(2)}p ${String(r.az).padStart(3)}AZ ${String(Math.round(r.winRate * 100)).padStart(3)}%`;

const LEVERS = [
  { label: "current  64x64 20p, octant, 20AZ, no delay", size: 64, probesEach: 20, bearingBands: 1, publicDelay: 0, cost: 20 },
  { label: "cheap    64x64 20p, octant,  6AZ, no delay", size: 64, probesEach: 20, bearingBands: 1, publicDelay: 0, cost: 6 },
  { label: "richer   64x64 20p, oct+4ring, 20AZ", size: 64, probesEach: 20, bearingBands: 4, publicDelay: 0, cost: 20 },
  { label: "richer   64x64 20p, oct+8ring, 20AZ", size: 64, probesEach: 20, bearingBands: 8, publicDelay: 0, cost: 20 },
  { label: "delayed  64x64 20p, octant, 20AZ, lag 4", size: 64, probesEach: 20, bearingBands: 1, publicDelay: 4, cost: 20 },
  { label: "combo    64x64 16p, oct+4ring, 10AZ, lag 4", size: 64, probesEach: 16, bearingBands: 4, publicDelay: 4, cost: 10 },
  { label: "combo   128x128 16p, oct+4ring, 10AZ, lag 4", size: 128, probesEach: 16, bearingBands: 4, publicDelay: 4, cost: 10 },
];

console.log("One hunter's view. median own-probes / AZ spent / share of hunts won, 70 trials.\n");
console.log("configuration                                alone        alone +1     vs 2 rivals  vs2 +1 bearing   verdict");
console.log("-".repeat(118));

for (const lv of LEVERS) {
  const cfg = { size: lv.size, probesEach: lv.probesEach, bearingBands: lv.bearingBands, publicDelay: lv.publicDelay };
  const a = trial(cfg, 0, 0, lv.cost);
  const b = trial(cfg, 0, 1, lv.cost);
  const c = trial(cfg, 2, 0, lv.cost);
  const d = trial(cfg, 2, 1, lv.cost);

  let verdict = "";
  if (a.az !== null && b.az !== null) {
    const delta = a.az - b.az;
    verdict = delta > 0 ? `bearing pays, saves ${delta}AZ` : `bearing costs ${-delta}AZ extra`;
  }
  if (c.winRate > 0 && d.winRate > c.winRate + 0.08) verdict += ` | +${Math.round((d.winRate - c.winRate) * 100)}pt win rate`;
  console.log(`${lv.label.padEnd(44)} ${fmt(a)}  ${fmt(b)}  ${fmt(c)}  ${fmt(d)}   ${verdict}`);
}
