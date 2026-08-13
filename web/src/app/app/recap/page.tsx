import { RecapScreen } from "@/components/daily/RecapScreen";
import { loadRecap } from "@/lib/chain/recap";
import { currentDay } from "@/lib/chain/daily-client";

export const revalidate = 60;

export default async function RecapPage() {
  const today = await currentDay();
  const recap = await loadRecap(today - 1);
  return <RecapScreen recap={recap} today={today} />;
}
