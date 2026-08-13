"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { CALLSIGNS_ABI } from "@/lib/chain/callsigns-abi";
import { CALLSIGNS_ADDRESS, publicClient } from "@/lib/chain/config";
import {
  CALLSIGN_PATTERN,
  encodeCallsign,
  isCallsignAvailable,
  loadCallsign,
  shortenAddress,
} from "@/lib/chain/callsigns";

type Status = "idle" | "checking" | "taken" | "free" | "saving";

export function CallsignPrompt() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [existing, setExisting] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const checked = loadedFor === address;

  useEffect(() => {
    if (!address || loadedFor === address) return;
    let live = true;
    loadCallsign(address)
      .then((name) => {
        if (!live) return;
        setExisting(name);
        setLoadedFor(address);
      })
      .catch(() => {
        if (live) setLoadedFor(address);
      });
    return () => {
      live = false;
    };
  }, [address, loadedFor]);

  useEffect(() => {
    const name = draft.trim().toLowerCase();
    if (!address || !CALLSIGN_PATTERN.test(name)) return;
    let live = true;
    const timer = setTimeout(() => {
      if (!live) return;
      setStatus("checking");
      isCallsignAvailable(name, address)
        .then((free) => live && setStatus(free ? "free" : "taken"))
        .catch(() => live && setStatus("idle"));
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [draft, address]);

  const save = useCallback(async () => {
    if (!walletClient || !address) return;
    const name = draft.trim().toLowerCase();
    setStatus("saving");
    setError(null);
    try {
      const hash = await walletClient.writeContract({
        address: CALLSIGNS_ADDRESS,
        abi: CALLSIGNS_ABI,
        functionName: "setCallsign",
        args: [encodeCallsign(name)],
        chain: walletClient.chain,
        account: walletClient.account,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setExisting(name);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message.includes("User rejected") ? "You rejected the signature." : message.split("\n")[0]);
      setStatus("free");
    }
  }, [walletClient, address, draft]);

  if (!isConnected || !address || !checked || existing || dismissed) return null;

  const name = draft.trim().toLowerCase();
  const valid = CALLSIGN_PATTERN.test(name);

  return (
    <div className="border-b-2 border-ink bg-gold">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            Claim a callsign so the daily standings show a name, not a hex string.
          </p>
          <p className="num mt-1 text-xs text-ink-soft">
            {shortenAddress(address)} · one signature, stored onchain
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="callsign">
            Callsign
          </label>
          <input
            id="callsign"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="david0x"
            maxLength={16}
            spellCheck={false}
            className="num min-h-11 w-44 rounded-chip border-2 border-ink bg-paper-raised px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ink"
          />
          <button
            type="button"
            onClick={save}
            disabled={!valid || status === "taken" || status === "saving" || status === "checking"}
            className="press inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] text-paper shadow-hard-xs disabled:opacity-40"
          >
            {status === "saving" ? "Signing…" : "Claim"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="min-h-11 px-2 text-xs uppercase tracking-[0.12em] text-ink-soft hover:text-ink"
          >
            Later
          </button>
        </div>
      </div>

      {(draft.length > 0 && !valid) || status === "taken" || error ? (
        <p className="mx-auto max-w-7xl px-5 pb-3 text-xs text-ink-soft sm:px-8">
          {error
            ? error
            : status === "taken"
              ? `"${name}" is taken. Pick another.`
              : "3–16 characters: lowercase letters, numbers, dash or underscore."}
        </p>
      ) : null}
    </div>
  );
}
