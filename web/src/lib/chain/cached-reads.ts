import { cache } from "react";
import { currentDay } from "@/lib/chain/daily-client";
import { loadRecapOrLatest } from "@/lib/chain/recap";

export const getToday = cache(currentDay);
export const getRecap = cache(loadRecapOrLatest);
