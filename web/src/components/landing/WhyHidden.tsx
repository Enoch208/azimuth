import { LockIcon } from "@/components/marks/Icons";
import { DAILY_ADDRESS, explorerAddress } from "@/lib/chain/config";
import { DIGS, FIELD } from "@/lib/daily";

// Both taken from AzimuthDaily.sol, minus the parts that do not make the point.
const TRANSPARENT_SOURCE = `struct Hunt {
    uint8 x;
    uint8 y;
}`;

const CONFIDENTIAL_SOURCE = `struct Hunt {
    euint256 x;
    euint256 y;
}

hunt.x = e.randBounded(FIELD);
hunt.y = e.randBounded(FIELD);`;

const SEALED = [
  {
    label: "The treasure",
    line: "Generated encrypted, on chain. No deployer key holds the plaintext, so nobody can read it while the hunt runs — including us.",
  },
  {
    label: "Your clue",
    line: "Each temperature is decrypted to the wallet that dug for it. The board shows where people dug, never what they learned.",
  },
  {
    label: "Who found it",
    line: "Sealed until midnight. Naming a winner during the day would point straight at the treasure — it is their last dug tile.",
  },
];

export function WhyHidden() {
  return (
    <section id="why" className="border-b-2 border-ink bg-paper-deep">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="max-w-3xl font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-4xl">
          Take confidentiality away and the hunt is{" "}
          <span className="relative inline-block">
            <span className="absolute inset-x-[-6px] bottom-[3px] top-[38%] -rotate-[0.6deg] bg-gold" />
            <span className="relative">over before the first dig.</span>
          </span>
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div className="rounded-card border-2 border-ink bg-paper-raised shadow-hard-sm">
            <div className="border-b-2 border-ink px-5 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                Any ordinary EVM contract
              </span>
            </div>
            <div className="p-5">
              <pre className="overflow-x-auto rounded-chip border-2 border-paper-sunk bg-paper p-4 font-mono text-[13px] leading-relaxed">
                {TRANSPARENT_SOURCE}
              </pre>
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                The treasure sits in public storage. One{" "}
                <span className="font-mono text-[13px]">eth_getStorageAt</span> call reads it. There
                is no hunt, only a lookup — and the first person to run it ends the day for
                everyone.
              </p>
            </div>
          </div>

          <div className="rounded-card border-2 border-ink bg-paper-raised shadow-hard">
            <div className="flex items-center justify-between gap-4 border-b-2 border-ink bg-amber px-5 py-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                AZIMUTH on Inco Lightning
              </span>
              <span className="size-2.5 rounded-full border-2 border-ink bg-paper-raised" />
            </div>
            <div className="p-5">
              <pre className="overflow-x-auto rounded-chip border-2 border-paper-sunk bg-paper p-4 font-mono text-[13px] leading-relaxed">
                {CONFIDENTIAL_SOURCE}
              </pre>
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                The treasure is generated encrypted by the protocol. The contract still measures the
                distance to your dig and grades it — all against ciphertext — then hands the answer
                to one wallet.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12">
          <div>
            <h3 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
              What one private answer buys you
            </h3>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-soft">
              A temperature is distance in disguise. Made public, {FIELD * FIELD} tiles collapse to a
              handful the moment two hunters have dug — anyone could read the board and walk to the
              treasure without earning it. Kept private, {DIGS} digs stay a puzzle you have to solve
              yourself.
            </p>
            <p className="mt-8 -rotate-[0.4deg] rounded-card border-2 border-ink bg-gold p-6 text-base leading-relaxed shadow-hard">
              Everyone can see where you dug. Nobody can see what it told you. Your next move is a
              tell, and digging the wrong way on purpose is a bluff.
            </p>
            <a
              href={explorerAddress(DAILY_ADDRESS)}
              target="_blank"
              rel="noreferrer"
              className="press mt-8 inline-flex min-h-11 items-center gap-2 rounded-chip border-2 border-ink bg-paper-raised px-5 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
            >
              Verify onchain
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <ul className="flex flex-col gap-3">
            {SEALED.map((item) => (
              <li
                key={item.label}
                className="rounded-card border-2 border-ink bg-ink p-5 text-paper shadow-hard-sm"
              >
                <h4 className="flex items-center gap-2 font-display text-lg font-medium tracking-tight text-gold">
                  <LockIcon className="size-4 shrink-0" strokeWidth={2.4} />
                  {item.label}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-paper/70">{item.line}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
