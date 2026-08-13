"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { baseSepolia } from "@reown/appkit/networks";
import { useAccount, useWalletClient } from "wagmi";
import { DailyClient } from "@/lib/chain/daily-client";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { describeFailure } from "@/lib/failure-copy";
import { getLightning } from "@/lib/chain/inco";
import type { Hex } from "viem";

type State = "hidden" | "offer" | "working" | "done" | "failed";

// A score can only register once the map is open, so the recap is the natural
// place to ask. Nobody should have to remember to come back for this.
export function ClaimYesterday({ day }: { day: number }) {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>("hidden");
  const [failure, setFailure] = useState<string | null>(null);

  const ready = isConnected && chainId === baseSepolia.id && !!walletClient && !!address;

  useEffect(() => {
    if (!ready || !address) return;
    let live = true;
    publicClient
      .readContract({
        address: DAILY_ADDRESS,
        abi: DAILY_ABI,
        functionName: "playerState",
        args: [BigInt(day), address],
      })
      .then(async (state_) => {
        if (!live) return;
        const digs = Number(state_[0]);
        const finished = state_[2];
        if (digs === 0 || finished) {
          setState("hidden");
          return;
        }
        // Having dug is not the same as having won. claimTreasure verifies the
        // encrypted found flag and reverts otherwise, so offering this to a
        // hunter who missed would promise a score that cannot register. Read
        // their own flag first — only they can.
        try {
          const lightning = await getLightning();
          const [proof] = await lightning.attestedDecrypt(walletClient!, [state_[4] as Hex]);
          if (!live) return;
          setState(Number(proof.plaintext.value) === 1 ? "offer" : "hidden");
        } catch {
          if (live) setState("hidden");
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ready, address, day, walletClient]);

  const register = useCallback(async () => {
    if (!walletClient || !address) return;
    setState("working");
    setFailure(null);
    try {
      const client = new DailyClient(day, walletClient, address, () => {});
      await client.claim(day);
      setState("done");
      void queryClient.invalidateQueries({ queryKey: ["record", address.toLowerCase()] });
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
      setState("failed");
    }
  }, [walletClient, address, day, queryClient]);

  if (state === "hidden") return null;

  const failed = failure ? describeFailure(failure) : null;

  return (
    <section className="mt-6 rounded-panel border-2 border-ink bg-gold p-5 shadow-hard-sm">
      {state === "done" ? (
        <p className="text-sm font-semibold">Your score is on the board.</p>
      ) : (
        <>
          <h2 className="font-display text-xl font-medium tracking-tight">
            You hunted yesterday but never registered a score
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed">
            Scores can only be registered once the map opens, because a winner named during the day
            would have pointed straight at the treasure. One signature does it.
          </p>
          <button
            type="button"
            onClick={register}
            disabled={state === "working"}
            className="press mt-4 inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] text-paper shadow-hard-xs disabled:opacity-60"
          >
            {state === "working" ? "Registering…" : "Register yesterday's score"}
          </button>
          {failed ? <p className="mt-3 text-xs leading-relaxed">{failed.note}</p> : null}
        </>
      )}
    </section>
  );
}
