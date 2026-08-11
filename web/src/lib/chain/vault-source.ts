import { hexToString } from "viem";
import { AZIMUTH_ABI } from "@/lib/chain/azimuth-abi";
import { AZIMUTH_ADDRESS, publicClient } from "@/lib/chain/config";
import type { Difficulty, Vault, VaultStatus } from "@/lib/types";

const STATUS: Record<number, VaultStatus> = {
  1: "active",
  2: "found",
  3: "expired",
};

function difficultyFrom(maxProbes: number): Difficulty {
  if (maxProbes >= 24) return "beginner";
  if (maxProbes >= 20) return "standard";
  return "hard";
}

function decodeName(raw: `0x${string}`): string {
  return hexToString(raw, { size: 32 }).replace(/\0+$/, "").trim();
}

export type VaultLoad =
  | { ok: true; vaults: Vault[]; chainTime: number }
  | { ok: false; reason: string };

export async function loadActiveVaults(): Promise<VaultLoad> {
  try {
    const [rows, block] = await Promise.all([
      publicClient.readContract({
        address: AZIMUTH_ADDRESS,
        abi: AZIMUTH_ABI,
        functionName: "allVaults",
      }),
      publicClient.getBlock(),
    ]);

    const vaults = rows
      .map((row, index) => ({
        id: index + 1,
        name: decodeName(row.name),
        difficulty: difficultyFrom(row.maxProbesPerHunter),
        status: STATUS[row.status] ?? "expired",
        bounty: Number(row.bounty),
        hunters: row.huntersJoined,
        probes: row.probes,
        scansPurchased: row.scans,
        createdAt: Number(row.createdAt),
        expiresAt: Number(row.expiresAt),
        maxProbesPerHunter: row.maxProbesPerHunter,
        maxScansPerHunter: row.maxScansPerHunter,
        round: row.round,
      }))
      .filter((vault) => vault.status === "active" && vault.expiresAt > Number(block.timestamp));

    return { ok: true, vaults, chainTime: Number(block.timestamp) };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Base Sepolia did not respond",
    };
  }
}

export type SingleVaultLoad =
  | { ok: true; vault: Vault; chainTime: number }
  | { ok: false; reason: string };

export async function loadVaultById(id: number): Promise<SingleVaultLoad> {
  try {
    const [row, block] = await Promise.all([
      publicClient.readContract({
        address: AZIMUTH_ADDRESS,
        abi: AZIMUTH_ABI,
        functionName: "vaultInfo",
        args: [BigInt(id)],
      }),
      publicClient.getBlock(),
    ]);

    if (row.status === 0) return { ok: false, reason: "No such vault" };

    return {
      ok: true,
      chainTime: Number(block.timestamp),
      vault: {
        id,
        name: decodeName(row.name),
        difficulty: difficultyFrom(row.maxProbesPerHunter),
        status: STATUS[row.status] ?? "expired",
        bounty: Number(row.bounty),
        hunters: row.huntersJoined,
        probes: row.probes,
        scansPurchased: row.scans,
        createdAt: Number(row.createdAt),
        expiresAt: Number(row.expiresAt),
        maxProbesPerHunter: row.maxProbesPerHunter,
        maxScansPerHunter: row.maxScansPerHunter,
        round: row.round,
      },
    };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "Base Sepolia did not respond" };
  }
}

export async function loadRevealedCoordinates(id: number) {
  const [xHandle, yHandle] = await publicClient.readContract({
    address: AZIMUTH_ADDRESS,
    abi: AZIMUTH_ABI,
    functionName: "revealedCoordinates",
    args: [BigInt(id)],
  });
  const { getLightning } = await import("@/lib/chain/inco");
  const lightning = await getLightning();
  const [x, y] = await lightning.attestedReveal([xHandle, yHandle]);
  return { x: Number(x.plaintext.value), y: Number(y.plaintext.value) };
}
