import { createPublicClient, fallback, http } from "viem";
import { baseSepolia } from "viem/chains";

const TRANSPORTS = [
  "https://base-sepolia-rpc.publicnode.com",
  "https://sepolia.base.org",
] as const;

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: fallback(TRANSPORTS.map((url) => http(url, { timeout: 8_000 }))),
});

export const CALLSIGNS_ADDRESS = (process.env.NEXT_PUBLIC_CALLSIGNS_ADDRESS ??
  "0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19") as `0x${string}`;

export const DAILY_ADDRESS = (process.env.NEXT_PUBLIC_DAILY_ADDRESS ??
  "0x86C59B978B14bc8B2914A70548baAB2700bd58d6") as `0x${string}`;

export const DEPLOY_BLOCK = 45429025n;

export const EXPLORER_BASE = "https://sepolia.basescan.org";

export function explorerAddress(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}
