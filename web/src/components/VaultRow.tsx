import Link from "next/link";
import { BearingIcon, CrosshairIcon, HuntersIcon, TimerIcon } from "@/components/marks/Icons";
import { VaultGlyph } from "@/components/marks/VaultGlyph";
import { DIFFICULTY_LABEL, formatRemaining, type Difficulty, type Vault } from "@/lib/types";

const DIFFICULTY_CHIP: Record<Difficulty, string> = {
  beginner: "bg-teal/15 text-teal border-teal",
  standard: "bg-colder/15 text-colder border-colder",
  hard: "bg-warmer/15 text-warmer border-warmer",
};

const DIFFICULTY_BAR: Record<Difficulty, string> = {
  beginner: "bg-teal",
  standard: "bg-colder",
  hard: "bg-warmer",
};

interface StatProps {
  label: string;
  value: string;
  Icon: (props: { className?: string; strokeWidth?: number }) => React.ReactElement;
}

function Stat({ label, value, Icon }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5">
        <Icon className="hidden size-3.5 shrink-0 text-ink-faint sm:block" strokeWidth={2.2} />
        <span className="num text-lg font-medium leading-none">{value}</span>
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">{label}</span>
    </div>
  );
}

interface VaultRowProps {
  vault: Vault;
  referenceNow: number;
}

export function VaultRow({ vault, referenceNow }: VaultRowProps) {
  return (
    <Link
      href={`/app/vault/${vault.id}`}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-card border-2 border-ink bg-paper-raised py-5 pl-7 pr-5 shadow-hard-sm transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard sm:py-6 sm:pl-9 sm:pr-6 lg:flex-row lg:items-center lg:gap-8">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-2.5 border-r-2 border-ink ${DIFFICULTY_BAR[vault.difficulty]}`}
      />

      <div className="flex min-w-0 flex-1 items-start gap-4">
        <VaultGlyph className="mt-0.5 size-9 shrink-0 text-ink" />
        <div className="min-w-0">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
              {vault.name}
            </h3>
            <span
              className={`-rotate-1 rounded-chip border-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${DIFFICULTY_CHIP[vault.difficulty]}`}
            >
              {DIFFICULTY_LABEL[vault.difficulty]}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            <span className="num">{vault.maxProbesPerHunter}</span> probes and{" "}
            <span className="num">{vault.maxScansPerHunter}</span>{" "}
            {vault.maxScansPerHunter === 1 ? "bearing" : "bearings"} per hunter
          </p>
        </div>
      </div>

      <div className="flex items-end gap-6 sm:gap-9">
        <Stat label="Hunters" value={String(vault.hunters)} Icon={HuntersIcon} />
        <Stat label="Probes" value={String(vault.probes)} Icon={CrosshairIcon} />
        <Stat label="Bearings" value={String(vault.scansPurchased)} Icon={BearingIcon} />
        <Stat
          label="Closes in"
          value={formatRemaining(vault.expiresAt, referenceNow)}
          Icon={TimerIcon}
        />
      </div>

      <div className="flex items-center justify-between gap-5 border-t-2 border-dashed border-paper-sunk pt-5 lg:justify-end lg:border-t-0 lg:pt-0">
        <div className="text-right">
          <div className="num font-display text-2xl font-medium leading-none sm:text-3xl">
            {vault.bounty.toLocaleString("en-US")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-ink-faint">
            AZ bounty
          </div>
        </div>
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-chip border-2 border-ink bg-amber shadow-hard-xs transition-transform duration-150 group-hover:translate-x-0.5"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13M12 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
