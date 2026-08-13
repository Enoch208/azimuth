"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { baseSepolia } from "@reown/appkit/networks";
import { useAccount, useWalletClient } from "wagmi";
import { DailyMap } from "@/components/daily/DailyMap";
import { DigResult } from "@/components/daily/DigResult";
import { HuntStatus } from "@/components/daily/HuntStatus";
import { SealedGuess } from "@/components/daily/SealedGuess";
import { SoundToggle } from "@/components/daily/SoundToggle";
import { RevealCountdown } from "@/components/daily/RevealCountdown";
import { VictoryOverlay } from "@/components/daily/VictoryOverlay";
import { ConnectButton } from "@/components/ConnectButton";
import { KeeperMascot } from "@/components/mascot/KeeperMascot";
import { keeperStateFor } from "@/components/mascot/keeper-state";
import { LockIcon } from "@/components/marks/Icons";
import { TemperatureGlyph, UnreadGlyph } from "@/components/marks/TemperatureGlyph";
import { DailyClient, type DigPhase } from "@/lib/chain/daily-client";
import { type Placing } from "@/lib/chain/daily-stats";
import { shortenAddress } from "@/lib/chain/callsigns";
import { describeFailure } from "@/lib/failure-copy";
import { play, startListening } from "@/lib/sound";
import { footprintsFrom, type RawDig } from "@/lib/footprints";
import { recordKey } from "@/lib/use-player-record";
import { shouldCelebrate } from "@/lib/victory";
import {
  DIGS,
  TEMPERATURES,
  alreadyDug,
  canSeal,
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

// One stable empty board, so a disconnected wallet does not churn callbacks.
const EMPTY_DIGS: Dig[] = [];

interface DailyHuntScreenProps {
  day: number;
  hunters: number;
  yesterday: Placing[];
  // Every dig on today's board, rivals included. Public chain data: the tile,
  // never the answer.
  digs: RawDig[];
}

export function DailyHuntScreen({ day, hunters, yesterday, digs: allDigs }: DailyHuntScreenProps) {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<DigPhase>("idle");
  const [pending, setPending] = useState<Tile | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const ready = isConnected && chainId === baseSepolia.id && !!walletClient && !!address;

  // Declared after the state it captures: the memo factory runs during this
  // render, so reading setPhase from above would hit its temporal dead zone.
  const client = useMemo(
    () => (ready ? new DailyClient(day, walletClient, address, setPhase) : null),
    [ready, day, walletClient, address],
  );

  // The board is stored against the client that produced it and compared during
  // render, rather than cleared from an effect. Switching wallets then shows an
  // empty board immediately instead of the previous wallet's digs.
  const [board, setBoard] = useState<{
    for: DailyClient | null;
    digs: Dig[];
    loaded: boolean;
    failure: string | null;
    sealed: boolean;
    guessedTile: Tile | null;
    guessRight: boolean | null;
  }>({
    for: null,
    digs: [],
    loaded: false,
    failure: null,
    sealed: false,
    guessedTile: null,
    guessRight: null,
  });

  // The tile lined up for a sealed guess, before it is sealed.
  const [aiming, setAiming] = useState<Tile | null>(null);
  const [sealing, setSealing] = useState(false);

  const mine = board.for === client;
  // Memoised so the empty fallback keeps one identity; a fresh array each
  // render would rebuild every callback that depends on it.
  const digs = useMemo(() => (mine ? board.digs : EMPTY_DIGS), [mine, board.digs]);
  const loaded = mine ? board.loaded : false;
  const failure = mine ? board.failure : null;
  const sealed = mine ? board.sealed : false;
  const guessedTile = mine ? board.guessedTile : null;
  const guessRight = mine ? board.guessRight : null;

  useEffect(() => {
    if (!client) return;
    let live = true;
    client
      .load()
      .then((snapshot) => {
        if (live) {
          setBoard({
            for: client,
            digs: snapshot.digs,
            loaded: true,
            failure: null,
            sealed: snapshot.sealed,
            guessedTile: snapshot.guessedTile,
            guessRight: snapshot.guessRight,
          });
        }
      })
      .catch((error) => {
        if (!live) return;
        const message = error instanceof Error ? error.message : String(error);
        setBoard({
          for: client,
          digs: [],
          loaded: true,
          failure: message,
          sealed: false,
          guessedTile: null,
          guessRight: null,
        });
      });
    return () => {
      live = false;
    };
  }, [client]);

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
      if (!client || !loaded || pending || over || alreadyDug(digs, tile)) return;
      const first = digs.length === 0;
      setPending(tile);
      setBoard({ for: client, digs, loaded: true, failure: null, sealed, guessedTile, guessRight });
      try {
        const snapshot = await client.dig(tile);
        setBoard({
          for: client,
          digs: snapshot.digs,
          loaded: true,
          failure: null,
          sealed: snapshot.sealed,
          guessedTile: snapshot.guessedTile,
          guessRight: snapshot.guessRight,
        });
        const answer = snapshot.digs[snapshot.digs.length - 1]?.temperature ?? null;
        play(answer === 0 ? "found" : answer !== null && answer <= 1 ? "burning" : "reveal");
        if (first && address) {
          void queryClient.invalidateQueries({ queryKey: recordKey(address, day) });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setBoard({ for: client, digs, loaded: true, failure: message, sealed, guessedTile, guessRight });
      } finally {
        setPhase("idle");
        setPending(null);
      }
    },
    [client, loaded, pending, over, digs, address, day, queryClient, sealed, guessedTile, guessRight],
  );

  // Rivals' moves, with the hunter's own removed so the board reads as "mine
  // and theirs" rather than doubling up.
  const footprints = useMemo(() => footprintsFrom(allDigs, address ?? null), [allDigs, address]);

  const offering = canSeal(digs, sealed);

  // While a last word is on offer the board reopens, but a click now names a
  // tile instead of spending a dig there are none left to spend.
  const handleTile = useCallback(
    (tile: Tile) => {
      if (offering) {
        setAiming(tile);
        return;
      }
      void handleDig(tile);
    },
    [offering, handleDig],
  );

  const handleSeal = useCallback(async () => {
    if (!client || !aiming || sealing) return;
    setSealing(true);
    try {
      const snapshot = await client.sealGuess(aiming);
      setBoard({
        for: client,
        digs: snapshot.digs,
        loaded: true,
        failure: null,
        sealed: snapshot.sealed,
        guessedTile: snapshot.guessedTile,
        guessRight: snapshot.guessRight,
      });
      play(snapshot.guessRight ? "found" : "reveal");
      setAiming(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setBoard({ for: client, digs, loaded: true, failure: message, sealed, guessedTile, guessRight });
    } finally {
      setPhase("idle");
      setSealing(false);
    }
  }, [client, aiming, sealing, digs, sealed, guessedTile, guessRight]);

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
            {hunters} {hunters === 1 ? "hunter" : "hunters"}
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
                disabled={!ready || !loaded || pending !== null || (over && !offering) || sealing}
                onDig={handleTile}
                selected={offering ? aiming : null}
                intent={offering ? "seal" : "dig"}
                footprints={footprints}
              />
            </div>

            {footprints.length > 0 ? (
              <p className="border-t-2 border-ink bg-paper-deep px-4 py-2.5 text-xs leading-relaxed text-ink-soft">
                <span className="num font-semibold text-ink">·</span> marks a tile another hunter
                has already opened — {footprints.length}{" "}
                {footprints.length === 1 ? "tile" : "tiles"} so far. You can watch every move
                anyone makes. What those tiles told them is readable by nobody but them until
                midnight.
              </p>
            ) : null}

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
          {offering || sealed ? (
            <SealedGuess
              state={sealed ? "sealed" : sealing ? "sealing" : "choosing"}
              selected={aiming}
              right={guessRight}
              guessed={guessedTile}
              onSeal={handleSeal}
            />
          ) : null}

          <HuntStatus day={day} digs={digs} pending={pending !== null} hunters={hunters} />

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
