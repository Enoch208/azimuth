import { notFound } from "next/navigation";
import { HuntScreen } from "@/components/hunt/HuntScreen";
import { loadVaultById } from "@/lib/chain/vault-source";

export const revalidate = 15;

export default async function VaultPage({ params }: PageProps<"/app/vault/[id]">) {
  const { id } = await params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed < 1) notFound();

  const load = await loadVaultById(parsed);
  if (!load.ok) notFound();

  return <HuntScreen vault={load.vault} referenceNow={load.chainTime} />;
}
