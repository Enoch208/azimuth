import { unstable_cache } from "next/cache";
import { currentDay } from "@/lib/chain/daily-client";
import { loadRecapOrLatest } from "@/lib/chain/recap";

export const getToday = unstable_cache(currentDay, ["azimuth-today"], { revalidate: 30 });

export const getRecap = unstable_cache(
  async (day: number) => loadRecapOrLatest(day),
  ["azimuth-recap"],
  { revalidate: 60 },
);
