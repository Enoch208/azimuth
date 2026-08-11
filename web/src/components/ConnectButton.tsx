"use client";

import { useAppKit } from "@reown/appkit/react";
import { baseSepolia } from "@reown/appkit/networks";
import { useAccount, useSwitchChain } from "wagmi";

function shorten(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function ConnectButton({ className = "" }: { className?: string }) {
  const { open } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== baseSepolia.id;

  if (wrongNetwork) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        disabled={isPending}
        className={`press inline-flex min-h-11 items-center justify-center rounded-chip border-2 border-ink bg-warmer px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-paper shadow-hard-xs disabled:opacity-60 ${className}`}
      >
        {isPending ? "Switching…" : "Switch to Base Sepolia"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => open()}
      className={`press inline-flex min-h-11 items-center justify-center rounded-chip border-2 border-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs ${
        isConnected ? "bg-paper-raised" : "bg-ink text-paper"
      } ${className}`}
    >
      {isConnected && address ? (
        <span className="num flex items-center gap-2 normal-case tracking-normal">
          <span className="size-2 rounded-full bg-teal-bright" />
          {shorten(address)}
        </span>
      ) : (
        "Connect wallet"
      )}
    </button>
  );
}
