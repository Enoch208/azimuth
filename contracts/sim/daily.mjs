// Is "9x9, six digs, five temperature bands" a good game?
// Absolute temperature is a very different signal from relative warmer/colder:
// every dig is self-contained, so it tells you more per dig.

const BANDS = ["BURNING", "HOT", "WARM", "COLD", "FREEZING"];

const dist = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

function temperature(guess, secret, size, bands) {
  const d = dist(guess, secret);
  if (d === 0) return 0;
  const reach = size - 1;
  const step = reach / (bands - 1);
  return Math.min(bands - 1, Math.max(1, Math.ceil(d / step)));
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

function play({ size, digs, bands, seed, smart }) {
  const rng = mulberry(seed);
  const secret = { x: Math.floor(rng() * size), y: Math.floor(rng() * size) };
  let live = [];
  for (let x = 0; x < size; x += 1) for (let y = 0; y < size; y += 1) live.push({ x, y });

  for (let dig = 1; dig <= digs; dig += 1) {
    let guess;
    if (!smart) {
      guess = live[Math.floor(rng() * live.length)];
    } else {
      // pick the cell whose answer splits the remaining set most evenly
      let bestScore = Infinity;
      for (const candidate of live) {
        const buckets = new Map();
        for (const c of live) {
          const t = temperature(candidate, c, size, bands);
          buckets.set(t, (buckets.get(t) ?? 0) + 1);
        }
        const worst = Math.max(...buckets.values());
        if (worst < bestScore) {
          bestScore = worst;
          guess = candidate;
        }
      }
    }
    if (guess.x === secret.x && guess.y === secret.y) return { found: dig, left: 1 };
    const said = temperature(guess, secret, size, bands);
    live = live.filter((c) => temperature(guess, c, size, bands) === said);
    live = live.filter((c) => !(c.x === guess.x && c.y === guess.y));
    if (live.length === 0) return { found: null, left: 0 };
  }
  return { found: null, left: live.length };
}

function evaluate(config, smart, trials = 400) {
  const found = [];
  let wins = 0;
  for (let t = 0; t < trials; t += 1) {
    const r = play({ ...config, smart, seed: t * 2654435761 + 7 });
    if (r.found) {
      wins += 1;
      found.push(r.found);
    }
  }
  found.sort((a, b) => a - b);
  return {
    rate: wins / trials,
    median: found.length ? found[Math.floor(found.length / 2)] : null,
  };
}

// `bands` counts FOUND plus the temperature levels, so bands: 6 is the
// five-name ladder FREEZING / COLD / WARM / HOT / BURNING.
const CONFIGS = [
  { label: "11x11, 6 digs, 4 temps", size: 11, digs: 6, bands: 5 },
  { label: "11x11, 6 digs, 5 temps", size: 11, digs: 6, bands: 6 },
  { label: "11x11, 5 digs, 5 temps", size: 11, digs: 5, bands: 6 },
  { label: "11x11, 7 digs, 5 temps", size: 11, digs: 7, bands: 6 },
  { label: "13x13, 6 digs, 5 temps", size: 13, digs: 6, bands: 6 },
  { label: "13x13, 7 digs, 5 temps", size: 13, digs: 7, bands: 6 },
  { label: "11x11, 6 digs, 6 temps", size: 11, digs: 6, bands: 7 },
];

console.log("Share of hunts solved and median digs. 400 hunts per row.\n");
console.log("configuration            careless player      thoughtful player     verdict");
console.log("-".repeat(92));
for (const config of CONFIGS) {
  const careless = evaluate(config, false);
  const smart = evaluate(config, true);
  const pc = (r) => `${String(Math.round(r.rate * 100)).padStart(3)}% in ${r.median ?? "—"} digs`;
  let verdict = "";
  if (smart.rate > 0.97 && careless.rate > 0.8) verdict = "too easy";
  else if (smart.rate < 0.7) verdict = "too hard";
  else if (smart.rate >= 0.8 && careless.rate < 0.75) verdict = "skill matters <-";
  else verdict = "playable";
  console.log(`${config.label.padEnd(24)} ${pc(careless).padEnd(20)} ${pc(smart).padEnd(21)} ${verdict}`);
}
