import { Lightning } from "@inco/lightning-js/lite";

let cached: Promise<Awaited<ReturnType<typeof Lightning.baseSepoliaTestnet>>> | null = null;

export function getLightning() {
  if (!cached) {
    cached = Lightning.baseSepoliaTestnet({
      hostChainRpcUrls: ["https://base-sepolia-rpc.publicnode.com", "https://sepolia.base.org"],
    });
  }
  return cached;
}
