"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { loadCallsign } from "@/lib/chain/callsigns";

interface Resolved {
  for: string;
  callsign: string | null;
}

// Who the connected player is, as a result card needs them: an address to mask
// and a callsign if they have claimed one.
//
// The resolved name is stored against the address it belongs to and compared
// during render, rather than cleared from an effect. Switching wallets then
// shows no callsign immediately instead of briefly showing the previous one.
export function useHunter(): { address?: string; callsign: string | null } {
  const { address } = useAccount();
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    if (!address) return;
    let live = true;
    loadCallsign(address)
      .then((callsign) => live && setResolved({ for: address, callsign }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [address]);

  return {
    address,
    callsign: resolved && resolved.for === address ? resolved.callsign : null,
  };
}
