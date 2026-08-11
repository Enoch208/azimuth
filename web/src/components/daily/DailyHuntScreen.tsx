"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { baseSepolia } from "@reown/appkit/networks";
import { useAccount, useWalletClient } from "wagmi";
import { DailyMap } from "@/components/daily/DailyMap";
import { DigResult } from "@/components/daily/DigResult";
import { RevealCountdown } from "@/components/daily/RevealCountdown";
import { ConnectButton } from "@/components/ConnectButton";
import { DailyClient, type DigPhase } from "@/lib/chain/daily-client";
import { loadDayStats, loadPlacings, type DayStats, type Placing } from "@/lib/chain/daily-stats";
import { describeFailure } from "@/lib/failure-copy";
import {
  DIGS,
  TEMPERATURES,
  alreadyDug,
  huntNumber,
  isOver,
  type Dig,
  type Tile,
} from "@/lib/daily";

const PHASE_COPY: Record<DigPhase, string> = {
  idle: "",
  signing: "Approve the dig in your wallet.",
  confirming: "Breaking ground. Base is recording where you dug.",
  reading: "Reading the signal. Only your wallet can hear this one.",
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

  const ready = isConnected && chainId === baseSepolia.id && !!walletClient && !!address;

  const client = useMemo(
    () => (ready ? new DailyClient(day, walletClient, address, setPhase) : null),
    [ready, day, walletClient, address],
  );

  useEffect(() => {
    let live = true;
    loadDayStats(day).then((next) => live && setStats(next)).catch(() => {});
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
  }, [client]);

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
      } catch (error) {
        setFailure(error instanceof Error ? error.message : String(error));
      } finally {
        setPhase("idle");
        setPending(null);
      }
    },
    [client, pending, over, digs],
  );

  const headline = pending
    ? "Searching beneath the chain"
    : failed
      ? failed.title
      : latest
        ? `${TEMPERATURES[latest.temperature ?? 5].emoji} ${TEMPERATURES[latest.temperature ?? 5].label}`
        : "Pick a tile";

  const note = pending
    ? PHASE_COPY[phase] || "Working."
    : failed
      ? failed.note
      : latest
        ? (latest.temperature ?? 5) <= 2
          ? "You are close. Search around this tile."
          : "Too far. Try a different part of the map."
        : "A treasure is buried somewhere on today's map. Every dig tells you how close you are.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-ink-faint">
            Azimuth #{huntNumber(day)}
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Find today&apos;s hidden treasure
          </h1>
        </div>
        <div className="num flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
          <span className="rounded-chip border-2 border-ink bg-paper-raised px-3 py-1.5 shadow-hard-xs">
            {DIGS - digs.length} digs left
          </span>
          <span className="rounded-chip border-2 border-ink bg-paper-raised px-3 py-1.5 shadow-hard-xs">
            {stats?.hunters ?? "—"} hunters
          </span>
          <span className="rounded-chip border-2 border-ink bg-ink px-3 py-1.5 text-paper">
            <RevealCountdown />
          </span>
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

          <div className="overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg">
            <div className="bg-paper-raised p-2 sm:p-4">
              <DailyMap
                digs={digs}
                pending={pending}
                treasure={null}
                disabled={!ready || over || pending !== null}
                onDig={handleDig}
              />
            </div>

            <div className="border-t-2 border-ink bg-paper-raised px-4 py-4">
              <div
                className={`font-display text-2xl font-medium leading-none tracking-tight sm:text-3xl ${
                  pending ? "text-ink-soft" : failed ? "text-warmer" : latest ? TEMPERATURES[latest.temperature ?? 5].tone : "text-ink"
                } ${latest && !pending ? "animate-land" : ""}`}
              >
                {headline}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-soft">{note}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-card border-2 border-ink bg-paper-raised p-5 shadow-hard-sm">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              Today
            </h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">Hunters</dt>
                <dd className="num font-medium">{stats?.hunters ?? "—"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">Digs placed</dt>
                <dd className="num font-medium">{stats?.digs ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-chip border-2 border-ink bg-gold px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
              🔒 Results sealed until reveal
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
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
                    <span className="num truncate">
                      {["🥇", "🥈", "🥉"][index] ?? "  "}{" "}
                      {placing.callsign ?? `${placing.hunter.slice(0, 6)}…${placing.hunter.slice(-4)}`}
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
