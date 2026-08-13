import { AppShell } from "@/components/app/AppShell";
import { StreakGreeting } from "@/components/daily/StreakGreeting";
import { getToday } from "@/lib/chain/cached-reads";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const today = await getToday();
  return (
    <AppShell>
      <StreakGreeting today={today} />
      {children}
    </AppShell>
  );
}
