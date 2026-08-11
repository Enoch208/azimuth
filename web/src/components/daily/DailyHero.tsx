import Link from "next/link";
import { PracticeHunt } from "@/components/daily/PracticeHunt";
import { AzimuthMark } from "@/components/marks/AzimuthMark";

export function DailyHero() {
  return (
    <section id="top" className="grid-field relative overflow-hidden border-b-2 border-ink">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-3 py-12 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:gap-14 lg:py-16">
        <div className="animate-rise">
          <div className="flex items-center gap-3">
            <AzimuthMark className="size-7 text-ink" />
            <span className="font-display text-sm font-medium tracking-[0.34em]">AZIMUTH</span>
          </div>

          <h1 className="mt-7 font-display text-[clamp(2.5rem,7vw,5rem)] font-medium leading-[0.92] tracking-[-0.045em]">
            The chain knows.
            <br />
            You don&apos;t.
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
            A treasure is buried somewhere on today&apos;s map. You get six digs. Every dig tells
            you how close you are — and nothing else.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/app"
              className="press rounded-chip border-2 border-ink bg-amber px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] shadow-hard"
            >
              Start today&apos;s hunt
            </Link>
            <a
              href="#how"
              className="press inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-paper-raised px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
            >
              How is it hidden?
            </a>
          </div>

          <p className="mt-6 text-xs text-ink-faint">
            Everyone hunts the same treasure each day. Fewest digs wins.
          </p>
        </div>

        <PracticeHunt />
      </div>
    </section>
  );
}
