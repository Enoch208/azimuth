import { DailyHuntScreen } from "@/components/daily/DailyHuntScreen";
import { currentDay } from "@/lib/chain/daily-client";

export const revalidate = 30;

export default async function TodaysHuntPage() {
  const day = await currentDay();
  return <DailyHuntScreen day={day} />;
}
