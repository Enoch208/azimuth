import { DailyHero } from "@/components/daily/DailyHero";
import { HowToHunt } from "@/components/landing/HowToHunt";
import { WhyHidden } from "@/components/landing/WhyHidden";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <DailyHero />
        <HowToHunt />
        <WhyHidden />
      </main>
      <SiteFooter />
    </>
  );
}
