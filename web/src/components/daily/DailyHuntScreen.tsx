"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { baseSepolia } from "@reown/appkit/networks";
import { useAccount, useWalletClient } from "wagmi";
import { DailyMap } from "@/components/daily/DailyMap";
import { DigResult } from "@/components/daily/DigResult";
import { HuntStatus } from "@/components/daily/HuntStatus";
import { SoundToggle } from "@/components/daily/SoundToggle";
import { RevealCountdown } from "@/components/daily/RevealCountdown";
import { VictoryOverlay } from "@/components/daily/VictoryOverlay";
import { ConnectButton } from "@/components/ConnectButton";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { keeperStateFor } from "@/components/mascot/keeper-state";
import { LockIcon } from "@/components/marks/Icons";
import { TemperatureGlyph, UnreadGlyph } from "@/components/marks/TemperatureGlyph";
import { DailyClient, type DigPhase } from "@/lib/chain/daily-client";
import { loadDayStats, loadPlacings, type DayStats, type Placing } from "@/lib/chain/daily-stats";
import { shortenAddress } from "@/lib/chain/callsigns";
import { describeFailure } from "@/lib/failure-copy";
import { play, startListening } from "@/lib/sound";
import { shouldCelebrate } from "@/lib/victory";
import {
  DIGS,
  TEMPERATURES,
  alreadyDug,
  huntNumber,
  isOver,
  type Dig,
  type Tile,
} from "@/lib/daily";

// What the player is told while a dig is in flight. The hunt is the story, not
// the machinery underneath it — no chain names, no signals, no contracts.
const PHASE_COPY: Record<DigPhase, string> = {
  idle: "",
  signing: "Approve the dig to break ground.",
  confirming: "Breaking ground…",
  reading: "The Keeper is listening. Only you will hear the answer.",
};

interface DailyHuntScreenProps {
  day: number;
}

export function DailyHuntScreen({ day }: DailyHuntScreenProps) {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [phase, setPhase] = useState<DigPhase>("idle");
  const [digs, setDigs] = useState<Dig[]>([]);
  const [pending, setPending] = useState<Tile | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<DayStats | null>(null);
  const [yesterday, setYesterday] = useState<Placing[]>([]);
  // The celebration is a moment, not a mode — once dismissed it stays dismissed
  // and the Keeper settles into guarding the sealed result.
  const [dismissed, setDismissed] = useState(false);

  const ready = isConnected && chainId === baseSepolia.id && !!walletClient && !!address;

  const client = useMemo(
    () => (ready ? new DailyClient(day, walletClient, address, setPhase) : null),
    [ready, day, walletClient, address],
  );

  useEffect(() => {
    let live = true;
    loadDayStats(day)
      .then((next) => live && setStats(next))
      .catch(() => {});
    loadPlacings(day - 1).then((next) => live && setYesterday(next)).catch(() => {});
    return () => {
      live = false;
    };
  }, [day, digs.length]);

  useEffect(() => {
    if (!client) return;
    let live = true;
    client
      .load()
      .then((snapshot) => {
        if (!live) return;
        setDigs(snapshot.digs);
        setLoaded(true);
      })
      .catch((error) => {
        if (!live) return;
        setFailure(error instanceof Error ? error.message : String(error));
        setLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [client, day]);

  // The Keeper is audibly listening for as long as the answer is in flight.
  useEffect(() => {
    if (pending === null) return;
    return startListening();
  }, [pending]);

  const over = isOver(digs);
  const latest = digs[digs.length - 1];
  const failed = failure ? describeFailure(failure) : null;

  const handleDig = useCallback(
    async (tile: Tile) => {
      if (!client || pending || over || alreadyDug(digs, tile)) return;
      setPending(tile);
      setFailure(null);
      try {
        const snapshot = await client.dig(tile);
        setDigs(snapshot.digs);
        // The answer landing is the moment worth hearing.
        const answer = snapshot.digs[snapshot.digs.length - 1]?.temperature ?? null;
        play(answer === 0 ? "found" : answer !== null && answer <= 1 ? "burning" : "reveal");
      } catch (error) {
        setFailure(error instanceof Error ? error.message : String(error));
      } finally {
        setPhase("idle");
        setPending(null);
      }
    },
    [client, pending, over, digs],
  );

  // One call decides the Keeper's mood for the whole screen.
  const keeper = keeperStateFor({
    digs,
    pending: pending !== null,
    failed: failed !== null,
    sealed: dismissed,
  });

  const celebrating = shouldCelebrate(digs, pending !== null) && !dismissed;

  // An unread dig is a question, not an answer. It never borrows a temperature.
  const answered = latest && latest.temperature !== null ? latest.temperature : null;

  const headline = pending
    ? "Listening beneath the map…"
    : failed
      ? failed.title
      : answered !== null
        ? TEMPERATURES[answered].label
        : latest
          ? "Still arriving"
          : "Pick a tile";

  const note = pending
    ? PHASE_COPY[phase] || "Working."
    : failed
      ? failed.note
      : answered !== null
        ? answered <= 2
          ? "You are close. Search around this tile."
          : "Too far. Try a different part of the map."
        : latest
          ? "That dig is counted. Its answer is still on its way to you."
          : "A treasure is buried somewhere on today's map. Every dig tells you how close you are.";

  const tone = pending
    ? "text-ink-soft"
    : failed
      ? "text-warmer"
      : answered !== null
        ? TEMPERATURES[answered].tone
        : "text-ink";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      {celebrating ? (
        <VictoryOverlay day={day} digs={digs} onClose={() => setDismissed(true)} />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
            Azimuth #{huntNumber(day)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Find today&apos;s hidden treasure
          </h1>
        </div>
        <div className="num flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] lg:hidden">
          <span className="rounded-chip border-2 border-ink bg-paper-raised px-3 py-1.5 shadow-hard-xs">
            {DIGS - digs.length} digs left
          </span>
          <span className="rounded-chip border-2 border-ink bg-paper-raised px-3 py-1.5 shadow-hard-xs">
            {stats?.hunters ?? "—"} {stats?.hunters === 1 ? "hunter" : "hunters"}
          </span>
          <span className="rounded-chip border-2 border-ink bg-ink px-3 py-1.5 text-paper">
            <RevealCountdown />
          </span>
          <SoundToggle />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="flex flex-col gap-5">
          {!ready ? (
            <div className="rounded-panel border-2 border-ink bg-gold p-6 shadow-hard-sm">
              <h2 className="font-display text-2xl font-medium tracking-tight">
                Connect to dig on today&apos;s map
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed">
                Everyone plays the same board. Your six digs and what they tell you are yours alone
                until the map opens tonight.
              </p>
              <div className="mt-4">
                <ConnectButton />
              </div>
            </div>
          ) : null}

          {over && loaded ? (
            <DigResult day={day} digs={digs} />
          ) : null}

          <div className="w-full overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg lg:max-w-[38rem]">
            <div className="bg-paper-raised p-2 sm:p-4">
              <DailyMap
                digs={digs}
                pending={pending}
                treasure={null}
                disabled={!ready || over || pending !== null}
                onDig={handleDig}
              />
            </div>

            <div className="flex items-center gap-4 border-t-2 border-ink bg-paper-raised px-4 py-4">
              <KeeperMascot state={keeper} size="md" className="-my-3 -ml-1" />
              <div className="min-w-0 flex-1">
                <div
                  className={`flex items-center gap-2.5 font-display text-2xl font-medium leading-none tracking-tight sm:text-3xl ${tone} ${
                    latest && !pending ? "animate-land" : ""
                  }`}
                >
                  {!pending && !failed && latest ? (
                    answered !== null ? (
                      <TemperatureGlyph
                        temperature={answered}
                        className="size-7 shrink-0 sm:size-8"
                      />
                    ) : (
                      <UnreadGlyph className="size-7 shrink-0 opacity-60 sm:size-8" />
                    )
                  ) : null}
                  {/* Never truncated — this line is the suspense. */}
                  <span className="min-w-0 text-balance">{headline}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">{note}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <HuntStatus day={day} digs={digs} pending={pending !== null} hunters={stats?.hunters ?? null} />

          <section className="rounded-card border-2 border-ink bg-gold p-5 shadow-hard-sm">
            <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
              <LockIcon className="size-3.5 shrink-0" strokeWidth={2.4} />
              Sealed until reveal
            </h2>
            <p className="mt-2 text-xs leading-relaxed">
              Nobody knows who has found it, including us. A public winner would point straight at
              the treasure — it would be their last dug tile.
            </p>
          </section>

          <section className="rounded-card border-2 border-ink bg-ink p-5 text-paper shadow-hard-sm">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-paper/70">
              Yesterday
            </h2>
            {yesterday.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-paper/60">
                No scores registered yet. Yesterday&apos;s hunters can claim once the map opens.
              </p>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {yesterday.slice(0, 5).map((placing, index) => (
                  <li key={placing.hunter} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="num flex min-w-0 items-baseline gap-2">
                      <span className="shrink-0 text-[11px] font-semibold text-gold">
                        #{index + 1}
                      </span>
                      <span className="truncate">
                        {placing.callsign ?? shortenAddress(placing.hunter)}
                      </span>
                    </span>
                    <span className="num font-semibold text-gold">
                      {placing.digs}/{DIGS}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
