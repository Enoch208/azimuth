"use client";

import { useCallback, useSyncExternalStore } from "react";
import { play, setSoundEnabled, soundEnabled, warmSound } from "@/lib/sound";

// Read as an external store so the first paint matches what is stored and the
// server render has a defined answer.
function subscribe(onChange: () => void) {
  window.addEventListener("azimuth:sound", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("azimuth:sound", onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function SoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribe, soundEnabled, () => false);

  const toggle = useCallback(() => {
    const next = !soundEnabled();
    setSoundEnabled(next);
    if (next) {
      // Inside the gesture, so the AudioContext is allowed to start, and the
      // confirmation doubles as a volume check.
      warmSound();
      play("reveal");
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      title={on ? "Sound on" : "Sound off"}
      className={`press inline-flex size-9 items-center justify-center rounded-chip border-2 border-ink bg-paper-raised shadow-hard-xs ${className ?? ""}`}
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9.5h3.4L12 5.4v13.2L7.4 14.5H4Z" />
        {on ? (
          <path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
        ) : (
          <path d="M16.2 9.8 20.6 14.2M20.6 9.8l-4.4 4.4" />
        )}
      </svg>
    </button>
  );
}
