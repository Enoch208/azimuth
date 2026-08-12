"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { currentDay, huntSummary } from "@/lib/chain/daily-client";
import type { Dig } from "@/lib/daily";

// One live picture of today, shared by the board and the status rail. The board
// publishes as it plays, so digs remaining in the rail counts down with the
// tiles rather than lagging behind its own copy of the chain.
export interface HuntStatus {
  day: number | null;
  digs: Dig[];
  pending: boolean;
  hunters: number | null;
  loaded: boolean;
}

const EMPTY: HuntStatus = {
  day: null,
  digs: [],
  pending: false,
  hunters: null,
  loaded: false,
};

interface Store {
  status: HuntStatus;
  publish: (patch: Partial<HuntStatus>) => void;
}

const HuntStatusContext = createContext<Store>({ status: EMPTY, publish: () => {} });

export function HuntStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<HuntStatus>(EMPTY);

  const publish = useCallback((patch: Partial<HuntStatus>) => {
    setStatus((current) => ({ ...current, ...patch }));
  }, []);

  // Pages other than the board never publish a day, so the rail would have
  // nothing to show on the recap. Fill in what is public either way.
  useEffect(() => {
    let live = true;
    currentDay()
      .then(async (day) => {
        if (!live) return;
        const summary = await huntSummary(day);
        if (!live) return;
        setStatus((current) => ({
          ...current,
          day: current.day ?? day,
          hunters: current.hunters ?? summary.hunters,
        }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const value = useMemo(() => ({ status, publish }), [status, publish]);
  return <HuntStatusContext.Provider value={value}>{children}</HuntStatusContext.Provider>;
}

export function useHuntStatus(): Store {
  return useContext(HuntStatusContext);
}
