"use client";

import { useEffect, useState } from "react";
import { loadDayRecords } from "@/lib/chain/player-record";
import { playerRecord, type PlayerRecord } from "@/lib/streak";

// The player's history, derived once and shared. The status rail and the
// revealed result card both read this rather than each deriving a streak.
export function usePlayerRecord(address?: string, today?: number | null): PlayerRecord | null {
  const [record, setRecord] = useState<{ for: string; day: number; value: PlayerRecord } | null>(
    null,
  );

  useEffect(() => {
    if (!address || !today) return;
    let live = true;
    loadDayRecords(address, today)
      .then((records) => {
        if (!live) return;
        // Ranked history needs every past day's full trail set, which is far
        // more chain than a sidebar should pull. bestRank stays unknown until
        // a revealed day supplies it, and the UI omits the row.
        setRecord({ for: address, day: today, value: playerRecord(today, records) });
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [address, today]);

  if (!record || !address || !today) return null;
  return record.for === address && record.day === today ? record.value : null;
}
