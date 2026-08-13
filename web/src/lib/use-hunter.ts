"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { loadCallsign } from "@/lib/chain/callsigns";

export function callsignKey(address: string) {
  return ["callsign", address.toLowerCase()] as const;
}

export function useHunter(): {
  address?: string;
  callsign: string | null;
  loaded: boolean;
} {
  const { address } = useAccount();
  const query = useQuery({
    queryKey: callsignKey(address ?? "none"),
    queryFn: () => loadCallsign(address!),
    enabled: !!address,
    staleTime: 60_000,
  });

  return {
    address,
    callsign: address && query.isSuccess ? (query.data ?? null) : null,
    loaded: !address || query.isFetched,
  };
}
