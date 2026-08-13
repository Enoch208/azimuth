"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { publicClient } from "@/lib/chain/config";

type State = "offer" | "sending" | "sent" | "failed";

// The balance is stored against the wallet it was read for and compared during
// render, rather than cleared from an effect. Switching wallets then re-checks
// instead of briefly offering a drip to an account that does not need one.
interface Checked {
  for: string;
  empty: boolean;
}

// A hunter cannot dig without gas, and a testnet faucet elsewhere is a detour
// that loses people before their first move. The drip endpoint already existed;
// this is the button that reaches it. It appears only for a wallet that is
// actually empty, so a funded player never sees it.
export function GetTestEth() {
  const { address, isConnected } = useAccount();
  const [checked, setChecked] = useState<Checked | null>(null);
  const [state, setState] = useState<State>("offer");
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) return;
    let live = true;
    publicClient
      .getBalance({ address })
      .then((balance) => {
        if (live) setChecked({ for: address, empty: balance === BigInt(0) });
      })
      .catch(() => {
        if (live) setChecked({ for: address, empty: false });
      });
    return () => {
      live = false;
    };
  }, [address, isConnected]);

  const known = address && checked?.for === address ? checked : null;

  const drip = useCallback(async () => {
    if (!address) return;
    setState("sending");
    setProblem(null);
    try {
      const response = await fetch("/api/drip", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The faucet turned that down");
      setState("sent");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
      setState("failed");
    }
  }, [address]);

  // Only an empty wallet is offered a drip, and only once it is known to be
  // empty. A funded hunter never sees this.
  if (!known?.empty) return null;

  return (
    <section className="rounded-card border-2 border-ink bg-gold p-5 shadow-hard-sm">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em]">
        You need a little Base Sepolia ETH
      </h2>

      {state === "sent" ? (
        <p className="mt-3 text-sm text-ink-soft">
          Sent. It lands in a few seconds — enough for a full hunt and a sealed guess. Dig when
          your wallet shows it.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-ink-soft">
            Six digs cost about 0.000016 test ETH. Take some from this project&apos;s faucet and
            start hunting — no other site, no waiting.
          </p>
          {state === "failed" && problem ? (
            <p className="mt-3 text-sm">
              {problem}{" "}
              <a
                className="underline"
                href="https://docs.base.org/base-chain/tools/network-faucets"
                target="_blank"
                rel="noreferrer"
              >
                Try a public Base Sepolia faucet.
              </a>
            </p>
          ) : null}
          <button
            type="button"
            disabled={state === "sending"}
            onClick={drip}
            className="mt-4 w-full rounded-chip border-2 border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-paper shadow-hard-xs disabled:opacity-40"
          >
            {state === "sending" ? "Sending…" : "Get test ETH"}
          </button>
        </>
      )}
    </section>
  );
}
