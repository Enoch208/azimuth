"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { AzimuthMark } from "@/components/marks/AzimuthMark";
import { StreakBadge } from "@/components/app/StreakBadge";
import { BearingIcon, CrosshairIcon, HuntersIcon, SealIcon } from "@/components/marks/Icons";

const DESTINATIONS = [
  { href: "/app", label: "Today", Icon: CrosshairIcon, exact: true },
  { href: "/app/recap", label: "Yesterday", Icon: SealIcon, exact: true },
  { href: "/app/leaderboard", label: "Standings", Icon: HuntersIcon, exact: true },
  { href: "/", label: "How it works", Icon: BearingIcon, exact: true },
];

function isActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

export function AppShell({ children, today }: { children: ReactNode; today: number }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen lg:grid lg:h-screen lg:grid-cols-[15rem_minmax(0,1fr)] lg:overflow-hidden">
      <aside className="hidden border-r-2 border-ink bg-paper-raised lg:flex lg:h-full lg:flex-col">
        <div className="flex h-full flex-col gap-6 p-6">
          <Link href="/" className="flex min-h-11 items-center gap-3">
            <AzimuthMark className="size-6 text-ink" />
            <span className="font-display text-sm font-medium tracking-[0.24em]">AZIMUTH</span>
          </Link>

          <ConnectButton className="w-full" />

          <StreakBadge today={today} className="self-start -mt-2" />

          <nav className="flex flex-col gap-1.5 border-t-2 border-paper-sunk pt-6">
            {DESTINATIONS.map((item) => {
              const active = isActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`press flex min-h-11 items-center gap-3 rounded-chip border-2 px-3 text-sm font-medium ${
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

      <div className="flex min-h-screen flex-col lg:min-h-0 lg:overflow-y-auto">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b-2 border-ink bg-paper/90 px-5 backdrop-blur-sm sm:px-8 lg:hidden">
          <Link href="/" className="flex min-h-11 items-center gap-2.5">
            <AzimuthMark className="size-5 text-ink" />
            <span className="font-display text-xs font-medium tracking-[0.24em]">AZIMUTH</span>
          </Link>
          <div className="flex items-center gap-2">
            <StreakBadge today={today} />
            <ConnectButton />
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-0">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t-2 border-ink bg-paper-raised lg:hidden">
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
  );
}
