import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { LockIcon } from "@/components/marks/Icons";
import { DAILY_ADDRESS, explorerAddress } from "@/lib/chain/config";

const SEALED = [
  {
    label: "The treasure",
    line: "Generated encrypted. Nobody can read it while the hunt runs — not other players, not us.",
  },
  {
    label: "Your clue",
    line: "Every temperature is decrypted to your wallet alone. The board shows where people dug, never what they learned.",
  },
  {
    label: "Who found it",
    line: "Sealed until midnight. Naming a winner during the day would point at the treasure — it is their last dug tile.",
  },
];

export function WhyHidden() {
  return (
    <section id="why" className="grid-field border-b-2 border-ink bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-8 sm:py-20">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold">
              Why is it hidden?
            </p>
            <h2 className="mt-2 max-w-3xl font-display text-[clamp(1.9rem,4.6vw,3.2rem)] font-medium leading-[0.98] tracking-[-0.035em]">
              Take confidentiality away and the hunt ends before the first dig.
            </h2>
          </div>
          <KeeperMascot state="sealed" size="md" className="hidden shrink-0 lg:block" />
        </div>

        <ul className="mt-10 grid gap-3 lg:grid-cols-3">
          {SEALED.map((item) => (
            <li
              key={item.label}
              className="rounded-card border-2 border-paper/25 bg-paper/[0.07] p-5"
            >
              <h3 className="flex items-center gap-2 font-display text-lg font-medium tracking-tight text-gold">
                <LockIcon className="size-4 shrink-0" strokeWidth={2.4} />
                {item.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-paper/70">{item.line}</p>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <p className="min-w-0 max-w-2xl flex-1 text-sm leading-relaxed text-paper/70">
            Public temperatures would let anyone read another hunter&apos;s progress and walk to the
            treasure without earning it. Keeping the answers private is what makes six digs a game
            rather than a race to copy.
          </p>
          {/* The technical detail lives behind this, not inside the game. */}
          <a
            href={explorerAddress(DAILY_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex min-h-11 shrink-0 items-center gap-2 rounded-chip border-2 border-ink bg-gold px-5 text-xs font-semibold uppercase tracking-[0.12em] text-ink shadow-hard-xs"
          >
            Verify onchain
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
