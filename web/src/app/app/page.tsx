import { DailyHuntScreen } from "@/components/daily/DailyHuntScreen";
import { getToday } from "@/lib/chain/cached-reads";

export const revalidate = 30;

export default async function TodaysHuntPage() {
  const day = await getToday();
  return <DailyHuntScreen day={day} />;
}
