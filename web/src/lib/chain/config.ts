import { createPublicClient, fallback, http } from "viem";
import { baseSepolia } from "viem/chains";

export const AZIMUTH_ADDRESS = (process.env.NEXT_PUBLIC_AZIMUTH_ADDRESS ??
  "0x60948d993b9c4f12982f155f36d049f995602a89") as `0x${string}`;

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
  "0x1866B5248E212B83C0bCd1B45b0512475e924649") as `0x${string}`;

export const DEPLOY_BLOCK = 45323091n;

export const EXPLORER_BASE = "https://sepolia.basescan.org";

export function explorerAddress(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}
