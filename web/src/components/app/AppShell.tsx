"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { HuntStatusProvider } from "@/components/app/hunt-status";
import { StatusRail } from "@/components/app/StatusRail";
import { AzimuthMark } from "@/components/marks/AzimuthMark";
import { BearingIcon, CrosshairIcon, SealIcon } from "@/components/marks/Icons";

const DESTINATIONS = [
  { href: "/app", label: "Today", Icon: CrosshairIcon, exact: true },
  { href: "/app/recap", label: "Yesterday", Icon: SealIcon, exact: true },
  { href: "/", label: "How it works", Icon: BearingIcon, exact: true },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <HuntStatusProvider>
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* Desktop only. Mobile keeps the bottom nav rather than stacking this
          rail above the board, which would push the game off the fold. */}
      <aside className="hidden border-r-2 border-ink bg-paper-deep lg:flex lg:flex-col">
        <div className="sticky top-0 flex max-h-screen flex-col gap-4 overflow-y-auto p-4">
          <Link href="/" className="flex min-h-11 items-center gap-3 px-1">
            <AzimuthMark className="size-6 text-ink" />
            <span className="font-display text-sm font-medium tracking-[0.24em]">AZIMUTH</span>
          </Link>

          <ConnectButton className="w-full" />

          <StatusRail />

          <nav className="flex flex-col gap-1.5 border-t-2 border-paper-sunk pt-4">
            {DESTINATIONS.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-chip border-2 px-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-ink bg-amber shadow-hard-xs"
                      : "border-transparent text-ink-soft hover:border-paper-sunk hover:text-ink"
                  }`}
                >
                  <item.Icon className="size-4" strokeWidth={2} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b-2 border-ink bg-paper/90 px-5 backdrop-blur-sm sm:px-8 lg:hidden">
          <Link href="/" className="flex min-h-11 items-center gap-2.5">
            <AzimuthMark className="size-5 text-ink" />
            <span className="font-display text-xs font-medium tracking-[0.24em]">AZIMUTH</span>
          </Link>
          <ConnectButton />
        </header>

        <main className="flex-1 pb-24 lg:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t-2 border-ink bg-paper-raised lg:hidden">
          {DESTINATIONS.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                  active ? "bg-amber" : "text-ink-soft"
                }`}
              >
                <item.Icon className="size-5" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
    </HuntStatusProvider>
  );
}
