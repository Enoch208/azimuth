import { ChainOffline } from "@/components/ChainOffline";
import { Hero } from "@/components/Hero";
import { KeeperPing } from "@/components/KeeperPing";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { VaultList } from "@/components/VaultList";
import { WhyEncrypted } from "@/components/WhyEncrypted";
import { loadActiveVaults } from "@/lib/chain/vault-source";

export const revalidate = 15;

export default async function Home() {
  const load = await loadActiveVaults();

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        {load.ok ? (
          <VaultList vaults={load.vaults} referenceNow={load.chainTime} />
        ) : (
          <ChainOffline reason={load.reason} />
        )}
        <HowItWorks />
        <WhyEncrypted />
      </main>
      <KeeperPing activeVaults={load.ok ? load.vaults.length : 0} />
      <SiteFooter />
    </>
  );
}
