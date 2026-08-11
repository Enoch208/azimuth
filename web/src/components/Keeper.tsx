import Image from "next/image";
import keeperIdle from "@/assets/keeper-idle.png";

interface KeeperProps {
  className?: string;
}

export function Keeper({ className }: KeeperProps) {
  return (
    <div className={`relative shrink-0 ${className ?? ""}`}>
      <Image
        src={keeperIdle}
        alt="The Keeper: a strongbox with a compass dial for a face, holding the vault coordinates it will not show you"
        sizes="(min-width: 1024px) 330px, (min-width: 640px) 230px, 200px"
        placeholder="blur"
        className="animate-bob h-auto w-full"
      />
      <span className="absolute -right-1 top-[14%] rotate-6 rounded-chip border-2 border-ink bg-paper-raised px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink shadow-hard-xs sm:-right-5">
        I know. Not telling.
      </span>
    </div>
  );
}
