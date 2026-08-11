import Image, { type StaticImageData } from "next/image";
import keeperBearing from "@/assets/bearing.png";
import keeperFound from "@/assets/found.png";
import keeperWarmer from "@/assets/happy.png";
import keeperIdle from "@/assets/keeper-idle.png";
import keeperColder from "@/assets/sad.png";
import keeperThinking from "@/assets/thinking.png";
import type { KeeperMood } from "@/lib/hunt-script";

const FRAMES: Record<KeeperMood, StaticImageData> = {
  idle: keeperIdle,
  thinking: keeperThinking,
  warmer: keeperWarmer,
  colder: keeperColder,
  bearing: keeperBearing,
  found: keeperFound,
};

const DESCRIPTION: Record<KeeperMood, string> = {
  idle: "The Keeper stands ready, dial face neutral",
  thinking: "The Keeper's dial spins as the contract computes",
  warmer: "The Keeper leans in, delighted — the probe landed closer",
  colder: "The Keeper turns away, unimpressed — the probe landed further",
  bearing: "The Keeper winks, holding a direction only one wallet can read",
  found: "The Keeper's dial bursts open — the vault has been found",
};

const MOODS = Object.keys(FRAMES) as KeeperMood[];

interface KeeperReactionProps {
  mood: KeeperMood;
  className?: string;
}

export function KeeperReaction({ mood, className }: KeeperReactionProps) {
  return (
    <div
      className={`relative aspect-square shrink-0 ${className ?? ""}`}
      role="img"
      aria-label={DESCRIPTION[mood]}
    >
      {MOODS.map((frame) => (
        <Image
          key={frame}
          src={FRAMES[frame]}
          alt=""
          aria-hidden="true"
          sizes="(min-width: 640px) 176px, 132px"
          priority={frame === "idle" || frame === "thinking"}
          className={`absolute inset-0 size-full object-contain object-bottom transition-opacity duration-200 ${
            frame === mood ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
