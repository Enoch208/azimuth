"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { APP_METADATA, BASE_SEPOLIA_RPC, NETWORKS, REOWN_PROJECT_ID, wagmiAdapter, wagmiConfig } from "@/lib/chain/wagmi";

if (REOWN_PROJECT_ID) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: [...NETWORKS],
    defaultNetwork: NETWORKS[0],
    projectId: REOWN_PROJECT_ID,
    metadata: APP_METADATA,
    customRpcUrls: { "eip155:84532": [{ url: BASE_SEPOLIA_RPC }] },
    features: { analytics: false, email: false, socials: false },
    themeMode: "light",
    themeVariables: {
      "--w3m-accent": "#e5a00d",
      "--w3m-color-mix": "#100f06",
      "--w3m-color-mix-strength": 8,
      "--w3m-border-radius-master": "2px",
      "--w3m-font-family": "var(--font-space-grotesk), sans-serif",
    },
  });
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
