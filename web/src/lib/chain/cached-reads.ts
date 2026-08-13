import { unstable_cache } from "next/cache";
import { currentDay } from "@/lib/chain/daily-client";
import { loadRecap } from "@/lib/chain/recap";

export const getToday = unstable_cache(currentDay, ["azimuth-today"], { revalidate: 30 });

export const getRecap = unstable_cache(
  async (day: number) => loadRecap(day),
  ["azimuth-recap"],
  { revalidate: 60 },
);
