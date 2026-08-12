import Image, { type StaticImageData } from "next/image";
import keeperBearing from "@/assets/bearing.png";
import keeperFound from "@/assets/found.png";
import keeperHappy from "@/assets/happy.png";
import keeperIdle from "@/assets/keeper-idle.png";
import keeperSad from "@/assets/sad.png";
import keeperThinking from "@/assets/thinking.png";
import { KEEPER_LABEL, KEEPER_STATES, type KeeperState } from "./keeper-state";

// Eleven moods, six painted poses. The pose says who the Keeper is; the motion
// says what just happened. When a real keeper.riv exists, swap the renderer
// below for a Rive canvas driven by KEEPER_RIVE_STATE — the props, the states
// and every call site stay exactly as they are.
const FRAME: Record<KeeperState, StaticImageData> = {
  idle: keeperIdle,
  searching: keeperThinking,
  freezing: keeperSad,
  cold: keeperSad,
  warm: keeperHappy,
  hot: keeperHappy,
  burning: keeperHappy,
  found: keeperFound,
  outOfDigs: keeperSad,
  sealed: keeperBearing,
  error: keeperThinking,
};

const MOTION: Record<KeeperState, string> = {
  idle: "animate-keeper-idle",
  searching: "animate-keeper-listen",
  freezing: "animate-keeper-shiver",
  cold: "animate-keeper-cold",
  warm: "animate-keeper-lean",
  hot: "animate-keeper-eager",
  burning: "animate-keeper-shake",
  found: "animate-keeper-burst",
  outOfDigs: "animate-keeper-slump",
  sealed: "animate-keeper-seal",
  error: "animate-keeper-confused",
};

// Only the frames a player meets first are worth blocking on. The rest arrive
// as the hunt turns.
const EAGER: KeeperState[] = ["idle", "searching"];

const SIZE = {
  sm: { box: "w-16 sm:w-20", sizes: "80px" },
  md: { box: "w-24 sm:w-32", sizes: "(min-width: 640px) 128px, 96px" },
  lg: { box: "w-40 sm:w-52", sizes: "(min-width: 640px) 208px, 160px" },
} as const;

// Distinct poses only — rendering the same PNG twice would double the work for
// no visual gain.
const POSES = [...new Set(KEEPER_STATES.map((state) => FRAME[state]))];

interface KeeperMascotProps {
  state: KeeperState;
  size?: keyof typeof SIZE;
  className?: string;
}

export function KeeperMascot({ state, size = "md", className }: KeeperMascotProps) {
  const { box, sizes } = SIZE[size];
  const active = FRAME[state];

  return (
    <div
      // Keyed on state so a repeat of the same mood replays its reaction —
      // two burning digs in a row should both get a shake. This is the DOM
      // equivalent of the `pulse` trigger the Rive contract specifies.
      key={state}
      className={`pointer-events-none relative aspect-square shrink-0 select-none ${box} ${MOTION[state]} ${className ?? ""}`}
      role="img"
      aria-label={KEEPER_LABEL[state]}
    >
      {POSES.map((pose, index) => (
        <Image
          key={index}
          src={pose}
          alt=""
          aria-hidden="true"
          sizes={sizes}
          priority={EAGER.some((s) => FRAME[s] === pose)}
          className={`absolute inset-0 size-full object-contain object-bottom transition-opacity duration-200 ${
            pose === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
