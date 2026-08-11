"use client";

import { useEffect, useState } from "react";
import { formatCountdown, secondsUntilNextDay } from "@/lib/daily";

// Owns its own tick so the hunt screen is not re-rendered once a second. A
// re-render there rebuilt the chain client and cancelled an in-flight load.
export function RevealCountdown({ className = "" }: { className?: string }) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setSeconds(secondsUntilNextDay(Math.floor(Date.now() / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={className}>
      {seconds === null ? "…" : `${formatCountdown(seconds)} until reveal`}
    </span>
  );
}
