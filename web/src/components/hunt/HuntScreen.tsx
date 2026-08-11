"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { baseSepolia } from "@reown/appkit/networks";
import { useAccount, useWalletClient } from "wagmi";
import { ChainHuntClient, type HuntPhase } from "@/lib/chain/chain-hunt-client";
import { loadVaultActivity, type PublicEntry } from "@/lib/chain/activity";
import { loadRevealedCoordinates } from "@/lib/chain/vault-source";
import { ActivityRail } from "@/components/hunt/ActivityRail";
import { HuntBoard } from "@/components/hunt/HuntBoard";
import { HuntHud } from "@/components/hunt/HuntHud";
import { TruthReveal } from "@/components/hunt/TruthReveal";
import { IntelDrawer } from "@/components/hunt/IntelDrawer";
import { KeeperReaction } from "@/components/KeeperReaction";
import { LocalHuntClient } from "@/lib/local-hunt-client";
import type { HuntSnapshot } from "@/lib/hunt-client";
import type { KeeperMood } from "@/lib/hunt-script";
import { describeFailure } from "@/lib/failure-copy";
import { FIELD_CELLS, survivingCells } from "@/lib/candidates";
import { cellLabel, formatCoordinate, formatRemaining, type Coordinate, type Vault } from "@/lib/types";

const RESULT_COPY = {
  warmer: { title: "Warmer", note: "Closer than your own closest probe so far.", tone: "text-warmer" },
  colder: { title: "Colder", note: "Further than your own closest probe so far.", tone: "text-colder" },
  found: { title: "Vault found", note: "Exact cell. The coordinates are readable now.", tone: "text-teal" },
} as const;

const FIRST_PROBE_NOTE =
  "That is your baseline. Every later probe reads warmer or colder against your own closest one — not against anyone else's.";

const WAIT_STEPS: { phase: HuntPhase; label: string }[] = [
  { phase: "signing", label: "Sign" },
  { phase: "confirming", label: "Signal locked" },
  { phase: "attesting", label: "Verifying" },
  { phase: "settling", label: "Revealing" },
];

interface HuntScreenProps {
  vault: Vault;
  referenceNow: number;
}

const PHASE_COPY: Record<HuntPhase, string> = {
  idle: "",
  signing: "Approve it in your wallet. Nothing is sent until you do.",
  confirming: "Base has your transaction. The cell you picked is locked in.",
  attesting: "The covalidator is comparing ciphertexts. This is the 8-to-11 second part.",
  settling: "Exact hit. Settling onchain and unsealing the coordinates.",
};

function WaitLadder({ phase }: { phase: HuntPhase }) {
  const reached = WAIT_STEPS.findIndex((step) => step.phase === phase);
  return (
    <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
      {WAIT_STEPS.map((step, index) => {
        const done = reached > index;
        const now = reached === index;
        return (
          <li key={step.phase} className="flex items-center gap-2">
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                now ? "text-ink" : done ? "text-teal" : "text-ink-faint"
              }`}
            >
              {done ? "✓ " : ""}
              {step.label}
            </span>
            {index < WAIT_STEPS.length - 1 ? (
              <span className={`h-px w-4 ${done ? "bg-teal" : "bg-paper-sunk"}`} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export function HuntScreen({ vault, referenceNow }: HuntScreenProps) {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [phase, setPhase] = useState<HuntPhase>("idle");

  const onchainReady = isConnected && chainId === baseSepolia.id && !!walletClient && !!address;

  const client = useMemo(
    () =>
      onchainReady
        ? new ChainHuntClient(vault, walletClient, address, setPhase)
        : new LocalHuntClient(vault),
    [onchainReady, vault, walletClient, address],
  );

  const [snapshot, setSnapshot] = useState<HuntSnapshot>(() => client.snapshot());
  const [mode, setMode] = useState<"probe" | "bearing">("probe");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [activeClient, setActiveClient] = useState(client);
  const [activity, setActivity] = useState<PublicEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [publicReveal, setPublicReveal] = useState<Coordinate | null>(null);
  const [settling, setSettling] = useState(false);
  const [pendingCell, setPendingCell] = useState<Coordinate | null>(null);

  const vaultIsFound = vault.status === "found";

  useEffect(() => {
    if (!vaultIsFound) return;
    let live = true;
    loadRevealedCoordinates(vault.id)
      .then((point) => { if (live) setPublicReveal(point); })
      .catch(() => {});
    return () => { live = false; };
  }, [vaultIsFound, vault.id]);

  if (activeClient !== client) {
    setActiveClient(client);
    setSnapshot(client.snapshot());
    setFailure(null);
  }

  useEffect(() => {
    if (!client.onchain) return;
    let live = true;
    loadVaultActivity(vault.id, vault.round, vault.createdAt, (partial) => {
      if (live) { setActivity(partial); setActivityLoading(false); }
    })
      .then((entries) => { if (live) { setActivity(entries); setActivityLoading(false); } })
      .catch(() => { if (live) setActivityLoading(false); });
    return () => { live = false; };
  }, [client.onchain, vault.id, vault.round, vault.createdAt, snapshot.probes.length, snapshot.bearings.length]);

  useEffect(() => {
    if (!(client instanceof ChainHuntClient)) return;
    let live = true;
    client
      .load()
      .then((next) => {
        if (live) setSnapshot(next);
      })
      .catch((error) => {
        if (live) setFailure(error instanceof Error ? error.message : String(error));
      });
    return () => {
      live = false;
    };
  }, [client]);

  const lastProbe = snapshot.probes[snapshot.probes.length - 1];
  const lastBearing = snapshot.bearings[snapshot.bearings.length - 1];
  const result = lastProbe ? RESULT_COPY[lastProbe.outcome] : null;

  const mood: KeeperMood = busy
    ? "thinking"
    : snapshot.found
      ? "found"
      : mode === "bearing" && lastBearing
        ? "bearing"
        : lastProbe
          ? lastProbe.outcome
          : "idle";

  const needsSettlement = snapshot.found && !snapshot.settled && client.onchain;

  const retrySettlement = useCallback(async () => {
    setSettling(true);
    setFailure(null);
    try {
      setSnapshot(await client.settle());
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setPhase("idle");
      setSettling(false);
    }
  }, [client]);

  const possible = useMemo(
    () => survivingCells(snapshot.probes, snapshot.bearings),
    [snapshot.probes, snapshot.bearings],
  );
  // A practice vault hides its own secret, so events from the real vault on
  // chain describe a different board and must not be shown beside it.
  const publicActivity = client.onchain ? activity : [];
  const publicActivityLoading = client.onchain ? activityLoading : false;
  const settledCoordinate = snapshot.revealed ?? publicReveal;
  const failed = failure ? describeFailure(failure) : null;
  const isFirstProbe = snapshot.probes.length === 1;
  const outOfProbes = snapshot.probesLeft === 0;
  const closed = !vaultIsFound && referenceNow >= vault.expiresAt;
  const boardDisabled =
    closed || snapshot.found || (mode === "probe" ? outOfProbes : snapshot.bearingsLeft === 0);

  const handleSelect = useCallback(
    async (cell: Coordinate) => {
      setBusy(true);
      setFailure(null);
      setPendingCell(cell);
      try {
        const next = mode === "probe" ? await client.probe(cell) : await client.buyBearing(cell);
        setSnapshot(next);
        if (mode === "bearing") setMode("probe");
      } catch (error) {
        setFailure(error instanceof Error ? error.message : String(error));
      } finally {
        setPhase("idle");
        setBusy(false);
        setPendingCell(null);
      }
    },
    [client, mode],
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/app" className="-ml-1 inline-flex min-h-11 items-center px-1 text-xs uppercase tracking-[0.16em] text-ink-faint hover:text-ink">
            ← All vaults
          </Link>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            {vault.name}
          </h1>
        </div>
        <span className={`rounded-chip border-2 border-ink px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-hard-xs ${client.onchain ? "bg-teal text-paper" : "bg-gold"}`}>
          {client.settlementLabel}
        </span>
      </div>

      <div className="mt-6">
        <HuntHud
          stats={[
            { label: "Bounty", value: `${vault.bounty.toLocaleString("en-US")} AZ`, emphasis: true },
            { label: "Probes left", value: String(snapshot.probesLeft) },
            { label: "Bearings left", value: String(snapshot.bearingsLeft) },
            {
              label: "Your AZ",
              value: String(snapshot.credits),
              hint:
                snapshot.credits === 0 && !snapshot.found
                  ? "500 arrives free, as one extra signature on your first probe"
                  : undefined,
            },
            { label: "Closes in", value: formatRemaining(vault.expiresAt, referenceNow) },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[max-content_minmax(18rem,22rem)] lg:items-start lg:justify-start">
        <div className="flex flex-col gap-5">
          {needsSettlement ? (
            <div className="rounded-card border-2 border-ink bg-warmer p-5 text-paper shadow-hard-sm">
              <div className="font-display text-xl font-medium tracking-tight">
                You hit the vault — settlement did not complete
              </div>
              <p className="mt-2 text-sm opacity-90">
                The bounty is unclaimed until the attestation is submitted onchain. Nothing is
                lost; you can submit it again.
              </p>
              <button
                type="button"
                onClick={retrySettlement}
                disabled={settling}
                className="press mt-4 inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-paper-raised px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink shadow-hard-xs disabled:opacity-60"
              >
                {settling ? "Submitting…" : "Retry settlement"}
              </button>
            </div>
          ) : null}

          {settledCoordinate ? (
            <TruthReveal entries={publicActivity} revealed={settledCoordinate} you={address} />
          ) : (
          <div className="w-full overflow-hidden rounded-panel border-2 border-ink bg-paper-deep shadow-hard-lg lg:max-w-[min(100%,calc(100dvh-29rem))]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink px-4 py-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("probe")}
                  disabled={closed}
                  className={`press inline-flex min-h-11 items-center rounded-chip border-2 border-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                    mode === "probe" ? "bg-amber shadow-hard-xs" : "bg-paper-raised"
                  }`}
                >
                  Probe · 2 AZ
                </button>
                <button
                  type="button"
                  onClick={() => setMode("bearing")}
                  disabled={closed || snapshot.bearingsLeft === 0 || snapshot.found}
                  className={`press inline-flex min-h-11 items-center rounded-chip border-2 border-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] disabled:opacity-40 ${
                    mode === "bearing" ? "bg-gold shadow-hard-xs" : "bg-paper-raised"
                  }`}
                >
                  Bearing · 20 AZ
                </button>
              </div>
              <span className="num hidden text-[10px] uppercase tracking-[0.16em] text-ink-faint sm:inline">
                {possible.length < FIELD_CELLS
                  ? `${possible.length.toLocaleString("en-US")} cells still possible`
                  : `${FIELD_CELLS.toLocaleString("en-US")} cells · one vault`}
              </span>
            </div>

            <div className="aspect-square w-full">
              <HuntBoard
                possible={possible.length < FIELD_CELLS ? possible : null}
                probes={snapshot.probes}
                bearings={snapshot.bearings}
                revealed={snapshot.revealed}
                pending={pendingCell}
                mode={mode}
                busy={busy}
                disabled={boardDisabled}
                onSelect={handleSelect}
              />
            </div>

            <div className="flex items-start gap-4 border-t-2 border-ink bg-paper-raised px-4 py-3">
              <KeeperReaction mood={mood} className="w-[4.5rem] shrink-0 sm:w-[5.5rem]" />
              <div className="min-w-0 flex-1">
                <div
                  className={`font-display text-xl font-medium leading-none tracking-tight sm:text-2xl ${
                    busy
                      ? "text-ink-soft"
                      : closed
                        ? "text-ink-soft"
                        : failed
                          ? "text-warmer"
                          : result
                            ? result.tone
                            : "text-ink"
                  }`}
                >
                  {busy
                    ? pendingCell
                      ? `${mode === "bearing" ? "Scanning from" : "Probing"} ${cellLabel(pendingCell)}`
                      : "Working"
                    : closed
                      ? "This vault has closed"
                      : failed
                      ? failed.title
                      : outOfProbes && !snapshot.found
                      ? "Hunt over"
                      : snapshot.found
                        ? "Vault found"
                        : result
                          ? result.title
                          : mode === "bearing"
                            ? "Pick a scan origin"
                            : "Pick a cell"}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  {busy
                    ? PHASE_COPY[phase] || "Confidential compare running against the ciphertext."
                    : closed
                      ? "Its clock ran out before anyone stood on it. The keeper respawns it with fresh coordinates — no move you make now would be accepted."
                      : failed
                      ? failed.note
                      : snapshot.revealed
                      ? `Coordinates were ${formatCoordinate(snapshot.revealed)}.`
                      : outOfProbes && !snapshot.found
                        ? "Out of probes on this vault."
                        : result
                          ? isFirstProbe
                            ? FIRST_PROBE_NOTE
                            : result.note
                          : mode === "bearing"
                            ? "Pick where to stand. The compass answer is encrypted to your wallet alone."
                            : "Pick any cell. Every probe is a transaction you sign, and everyone sees whether you ran warmer or colder — nobody sees how close."}
                </p>
                {busy ? <WaitLadder phase={phase} /> : null}
              </div>
            </div>
          </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <IntelDrawer bearings={snapshot.bearings} bearingsLeft={snapshot.bearingsLeft} />
          <ActivityRail entries={publicActivity} you={address} loading={publicActivityLoading} />
        </div>
      </div>
    </div>
  );
}
