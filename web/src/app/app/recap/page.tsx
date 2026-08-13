import { RecapScreen } from "@/components/daily/RecapScreen";
import { getRecap, getToday } from "@/lib/chain/cached-reads";
import type { Recap } from "@/lib/chain/recap";

export const revalidate = 60;

export default async function RecapPage() {
  const today = await getToday();
  const day = today - 1;

  // Catch the read, not the render. An error thrown while React renders would
  // never reach a try/catch here — that needs an error boundary.
  const recap = await getRecap(day).catch(
    (): Recap => ({ day, revealed: false, readable: false, treasure: null, trails: [] }),
  );

  return <RecapScreen recap={recap} today={today} />;
}
