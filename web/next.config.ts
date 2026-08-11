import type { NextConfig } from "next";

const OPTIONAL_WAGMI_MODULES = [
  "@wagmi/core/tempo",
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
];

const stub = "./src/lib/chain/optional-module-stub.ts";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: Object.fromEntries(
      OPTIONAL_WAGMI_MODULES.map((specifier) => [specifier, stub]),
    ),
  },
};

export default nextConfig;
