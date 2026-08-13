import { DailyHuntScreen } from "@/components/daily/DailyHuntScreen";
import { getHuntBoard, getToday } from "@/lib/chain/cached-reads";

export const revalidate = 30;

export default async function TodaysHuntPage() {
  const day = await getToday();
  const board = await getHuntBoard(day);
  return (
    <DailyHuntScreen
      day={day}
      hunters={board.hunters}
      yesterday={board.yesterday}
      digs={board.digs}
    />
  );
}
