import type { HunterStanding } from "@/lib/chain/leaderboard";

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

interface LeaderboardProps {
  standings: HunterStanding[];
}

export function Leaderboard({ standings }: LeaderboardProps) {
  return (
    <section id="leaderboard" className="border-b-2 border-ink bg-paper-deep">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Hunters who have found a vault
            </h2>
            <p className="mt-3 max-w-md text-sm text-ink-soft">
              Built from settlement events. A name only appears here after an exact hit was
              verified against the ciphertext onchain.
            </p>
          </div>
          <div className="num text-right">
            <div className="font-display text-2xl font-medium">{standings.length}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              hunters ranked
            </div>
          </div>
        </div>

        {standings.length === 0 ? (
          <p className="mt-10 rounded-card border-2 border-dashed border-paper-sunk p-6 text-sm text-ink-soft">
            No vault has been found yet. The first hunter to land an exact cell claims this list.
          </p>
        ) : (
          <ol className="mt-10 flex flex-col gap-3">
            {standings.map((standing, index) => (
              <li
                key={standing.hunter}
                className="flex items-center gap-5 rounded-card border-2 border-ink bg-paper-raised px-5 py-4 shadow-hard-xs"
              >
                <span className="num font-display text-2xl font-medium text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                  {standing.callsign ? (
                    <>
                      <span className="truncate font-display text-lg font-medium tracking-tight">
                        {standing.callsign}
                      </span>
                      <span className="num text-xs text-ink-faint">{shorten(standing.hunter)}</span>
                    </>
                  ) : (
                    <span className="num text-sm text-ink-soft">{shorten(standing.hunter)}</span>
                  )}
                </span>
                <span className="text-right">
                  <span className="num font-display text-xl font-medium">
                    {standing.vaultsFound}
                  </span>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    found
                  </span>
                </span>
                <span className="hidden text-right sm:block">
                  <span className="num font-display text-xl font-medium">
                    {standing.bountyWon.toLocaleString("en-US")}
                  </span>
                  <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    AZ
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
