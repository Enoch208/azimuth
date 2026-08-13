"use client";

import { useQuery } from "@tanstack/react-query";
import { loadDayRecords } from "@/lib/chain/player-record";
import { playerRecord, type PlayerRecord } from "@/lib/streak";

export function recordKey(address: string, day: number) {
  return ["record", address.toLowerCase(), day] as const;
}

export function usePlayerRecord(address?: string, today?: number | null): PlayerRecord | null {
  const query = useQuery({
    queryKey: recordKey(address ?? "none", today ?? 0),
    queryFn: async () => {
      const records = await loadDayRecords(address!, today!);
      return playerRecord(today!, records);
    },
    enabled: !!address && !!today,
    staleTime: 60_000,
  });

  return address && today && query.data ? query.data : null;
}
