import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { AzimuthMark } from "@/components/marks/AzimuthMark";

const NAV_LINKS = [
  { href: "/app", label: "Today's hunt" },
  { href: "/app/recap", label: "Yesterday's reveal" },
  { href: "#how", label: "How to hunt" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <a href="#top" className="flex min-h-11 items-center gap-2.5">
          <AzimuthMark className="size-7 text-ink" />
          <span className="font-display text-lg font-medium tracking-[0.12em]">AZIMUTH</span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const className =
              "inline-flex min-h-11 items-center text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline";
            if (link.href.startsWith("#")) {
              return (
                <a key={link.href} href={link.href} className={className}>
                  {link.label}
                </a>
              );
            }
            return (
              <Link key={link.href} href={link.href} className={className}>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <ConnectButton />
      </div>
    </header>
  );
}
