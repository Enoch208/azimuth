"use client";

import { useCallback, useState } from "react";
import { cardFilename, renderResultCard } from "@/lib/result-card-image";
import type { ResultCard } from "@/lib/result-card";

type Status = "idle" | "working" | "shared" | "saved" | "failed";

interface ShareResultProps {
  // Built on click rather than passed in: the reveal countdown on a sealed card
  // should be true at the moment it is shared, not whenever the screen rendered.
  makeCard: () => ResultCard;
  // Text sharing stays a separate action; the image is not a replacement for it.
  onCopyText?: () => void;
  copied?: boolean;
  className?: string;
  tone?: "gold" | "paper";
}

function canShareImage(files: File[]): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files })
  );
}

export function ShareResult({
  makeCard,
  onCopyText,
  copied,
  className,
  tone = "gold",
}: ShareResultProps) {
  const [status, setStatus] = useState<Status>("idle");

  const share = useCallback(async () => {
    setStatus("working");
    try {
      const card = makeCard();
      const blob = await renderResultCard(card);
      const file = new File([blob], cardFilename(card), { type: "image/png" });

      if (canShareImage([file])) {
        try {
          await navigator.share({ files: [file], title: `AZIMUTH #${card.huntNumber}` });
          setStatus("shared");
          return;
        } catch (error) {
          // A dismissed share sheet is a choice, not a failure. Anything else
          // falls through to a download so the player still gets their card.
          if (error instanceof DOMException && error.name === "AbortError") {
            setStatus("idle");
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = cardFilename(card);
      link.click();
      URL.revokeObjectURL(url);
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }, [makeCard]);

  const label =
    status === "working"
      ? "Drawing…"
      : status === "shared"
        ? "Shared"
        : status === "saved"
          ? "Saved"
          : status === "failed"
            ? "Try again"
            : "Share result";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ""}`}>
      <button
        type="button"
        onClick={share}
        disabled={status === "working"}
        className={`press inline-flex min-h-11 items-center rounded-chip border-2 border-ink px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs disabled:opacity-70 ${
          tone === "gold" ? "bg-gold text-ink" : "bg-paper-raised text-ink"
        }`}
      >
        {label}
      </button>

      {onCopyText ? (
        <button
          type="button"
          onClick={onCopyText}
          className="press inline-flex min-h-11 items-center rounded-chip border-2 border-ink bg-paper-raised px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] shadow-hard-xs"
        >
          {copied ? "Copied" : "Copy text"}
        </button>
      ) : null}
    </div>
  );
}
