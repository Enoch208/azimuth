"use client";

import { useEffect } from "react";

export function KeeperPing({ activeVaults }: { activeVaults: number }) {
  useEffect(() => {
    if (activeVaults >= 5) return;
    const controller = new AbortController();
    fetch("/api/keeper", { method: "POST", signal: controller.signal })
      .then((response) => response.json())
      .then((result) => {
        if (Array.isArray(result.respawned) && result.respawned.length > 0) {
          window.location.reload();
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [activeVaults]);

  return null;
}
