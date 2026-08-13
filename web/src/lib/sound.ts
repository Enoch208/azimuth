// A small sound layer for game feedback, not atmosphere. Every cue is under
// half a second and tied to something the player did or was told.
//
// Assets are Kenney's Interface Sounds (CC0, kenney.nl) transcoded to mp3 so
// Safari and iOS play them — Ogg Vorbis is unreliable there and would have
// failed silently on a large share of phones.

export type Cue = "press" | "listen" | "reveal" | "burning" | "found";

const FILES: Record<Cue, string> = {
  press: "/sfx/press.mp3",
  listen: "/sfx/listen.mp3",
  reveal: "/sfx/reveal.mp3",
  burning: "/sfx/burning.mp3",
  found: "/sfx/found.mp3",
};

// Quiet by default and never at full scale. A judge opening the page with
// headphones on should not be startled.
const GAIN: Record<Cue, number> = {
  press: 0.22,
  listen: 0.12,
  reveal: 0.3,
  burning: 0.38,
  found: 0.45,
};

const STORAGE_KEY = "azimuth:sound";

let context: AudioContext | null = null;
const buffers = new Map<Cue, AudioBuffer>();
const loading = new Map<Cue, Promise<AudioBuffer | null>>();

export function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Off unless the player asked for it. Audio that starts on its own is worse
  // than no audio at all.
  return window.localStorage.getItem(STORAGE_KEY) === "on";
}

export function setSoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  window.dispatchEvent(new CustomEvent("azimuth:sound", { detail: on }));
}

// Browsers refuse to start an AudioContext outside a user gesture, so this is
// only ever called from one.
function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === "suspended") void context.resume();
  return context;
}

async function bufferFor(cue: Cue): Promise<AudioBuffer | null> {
  const cached = buffers.get(cue);
  if (cached) return cached;

  const inFlight = loading.get(cue);
  if (inFlight) return inFlight;

  const ctx = ensureContext();
  if (!ctx) return null;

  const job = fetch(FILES[cue])
    .then((response) => response.arrayBuffer())
    .then((bytes) => ctx.decodeAudioData(bytes))
    .then((buffer) => {
      buffers.set(cue, buffer);
      return buffer;
    })
    .catch(() => null);

  loading.set(cue, job);
  return job;
}

// Fire and forget. A cue that cannot load or decode is silently skipped —
// missing audio must never interrupt a hunt.
export function play(cue: Cue): void {
  if (!soundEnabled()) return;
  void bufferFor(cue).then((buffer) => {
    const ctx = context;
    if (!buffer || !ctx) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = GAIN[cue];
    source.connect(gain).connect(ctx.destination);
    source.start();
  });
}

// The wait for a confidential answer runs eight to eleven seconds, which is a
// long time to sit in silence wondering whether anything is happening. A quiet
// tick every so often says the Keeper is still listening — slow enough to read
// as patience rather than as a progress bar. Returns a stop function.
const LISTEN_EVERY_MS = 1_600;

export function startListening(): () => void {
  if (!soundEnabled() || typeof window === "undefined") return () => {};
  play("listen");
  const id = window.setInterval(() => play("listen"), LISTEN_EVERY_MS);
  return () => window.clearInterval(id);
}

// Warm the cues a hunt will need, so the first dig is not the one that waits
// on a fetch. Called from a gesture, after sound is switched on.
export function warmSound(): void {
  if (!soundEnabled()) return;
  for (const cue of Object.keys(FILES) as Cue[]) void bufferFor(cue);
}
