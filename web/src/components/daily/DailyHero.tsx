import Link from "next/link";
import { PracticeHunt } from "@/components/daily/PracticeHunt";
import { SketchUnderline } from "@/components/marks/SketchUnderline";

export function DailyHero() {
  return (
    <section id="top" className="grid-field relative overflow-hidden border-b-2 border-ink">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-3 py-12 sm:px-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)] lg:gap-14 lg:py-16">
        <div className="animate-rise">
          <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] font-medium leading-[0.92] tracking-[-0.045em]">
            The chain knows.
            <br />
            <span className="relative inline-block">
              You don&apos;t.
              <SketchUnderline className="absolute -bottom-3 left-0 h-3.5 w-full text-amber sm:-bottom-4 sm:h-5" />
            </span>
          </h1>

          <p className="mt-9 max-w-md text-lg leading-relaxed text-ink-soft sm:mt-10">
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
