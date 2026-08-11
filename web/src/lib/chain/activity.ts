import { AZIMUTH_ABI } from "@/lib/chain/azimuth-abi";
import { getEventsChunked, roundStartBlock } from "@/lib/chain/logs";
import { getLightning } from "@/lib/chain/inco";
import { loadCallsigns } from "@/lib/chain/callsigns";
import { readAttested, rememberAttested } from "@/lib/chain/attestation-cache";
import type { ProbeOutcome } from "@/lib/types";

export interface PublicEntry {
  kind: "probe" | "bearing" | "settled";
  hunter: string;
  x: number;
  y: number;
  outcome: ProbeOutcome | null;
  resolved: boolean;
  block: number;
  callsign?: string | null;
}

interface ProbeHandles {
  closerHandle: `0x${string}`;
  hitHandle: `0x${string}`;
}


function asRound(args: unknown): number {
  return Number((args as { round?: number }).round ?? 0);
}

function readBool(value: unknown): boolean {
  return typeof value === "boolean" ? value : Boolean(Number(value));
}

async function revealPair(handles: ProbeHandles): Promise<[boolean, boolean]> {
  const cachedCloser = readAttested(handles.closerHandle);
  const cachedHit = readAttested(handles.hitHandle);
  if (cachedCloser !== undefined && cachedHit !== undefined) return [cachedCloser, cachedHit];

  const lightning = await getLightning();
  const [closer, hit] = await lightning.attestedReveal([handles.closerHandle, handles.hitHandle]);
  const closerValue = readBool(closer.plaintext.value);
  const hitValue = readBool(hit.plaintext.value);
  rememberAttested(handles.closerHandle, closerValue);
  rememberAttested(handles.hitHandle, hitValue);
  return [closerValue, hitValue];
}

export async function loadVaultActivity(
  vaultId: number,
  round: number,
  createdAt: number,
  onPartial?: (entries: PublicEntry[]) => void,
): Promise<PublicEntry[]> {
  const fromBlock = await roundStartBlock(createdAt);
  const [probeLogs, bearingLogs, settledLogs] = await Promise.all([
    getEventsChunked(AZIMUTH_ABI, "Probed", { vaultId: BigInt(vaultId) }, fromBlock),
    getEventsChunked(AZIMUTH_ABI, "BearingPurchased", { vaultId: BigInt(vaultId) }, fromBlock),
    getEventsChunked(AZIMUTH_ABI, "VaultSettled", { vaultId: BigInt(vaultId) }, fromBlock),
  ]);

  const probes = probeLogs.filter((log) => asRound(log.args) === round);
  const bearings = bearingLogs.filter((log) => asRound(log.args) === round);
  const settled = settledLogs.filter((log) => asRound(log.args) === round);

  const probeEntries: PublicEntry[] = probes.map((log) => {
    const args = log.args as unknown as { hunter: string; x: number; y: number };
    return {
      kind: "probe",
      hunter: args.hunter,
      x: args.x,
      y: args.y,
      outcome: null,
      resolved: false,
      block: Number(log.blockNumber),
    };
  });

  const rest: PublicEntry[] = [
    ...bearings.map((log) => {
      const args = log.args as unknown as { hunter: string; x: number; y: number };
      return {
        kind: "bearing" as const,
        hunter: args.hunter,
        x: args.x,
        y: args.y,
        outcome: null,
        resolved: true,
        block: Number(log.blockNumber),
      };
    }),
    ...settled.map((log) => {
      const args = log.args as unknown as { finder: string };
      return {
        kind: "settled" as const,
        hunter: args.finder,
        x: 0,
        y: 0,
        outcome: "found" as const,
        resolved: true,
        block: Number(log.blockNumber),
      };
    }),
  ];

  const names = await loadCallsigns([...probeEntries, ...rest].map((entry) => entry.hunter)).catch(
    () => new Map<string, string>(),
  );
  const withNames = (entries: PublicEntry[]) =>
    entries
      .map((entry) => ({ ...entry, callsign: names.get(entry.hunter.toLowerCase()) ?? null }))
      .sort((a, b) => b.block - a.block);

  onPartial?.(withNames([...probeEntries, ...rest]));

  let previousHit = false;
  for (const [index, log] of probes.entries()) {
    const args = log.args as unknown as ProbeHandles;
    try {
      const [closer, everHit] = await revealPair(args);
      const hitHere = everHit && !previousHit;
      previousHit = everHit;
      probeEntries[index].outcome = hitHere ? "found" : closer ? "warmer" : "colder";
    } catch {
      probeEntries[index].outcome = null;
    }
    probeEntries[index].resolved = true;
    onPartial?.(withNames([...probeEntries, ...rest]));
  }

  return withNames([...probeEntries, ...rest]);
}
