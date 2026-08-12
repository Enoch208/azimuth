import { DailyHero } from "@/components/daily/DailyHero";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <DailyHero />
      </main>
      <SiteFooter />
    </>
  );
}
