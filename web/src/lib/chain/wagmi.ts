import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia } from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "wagmi";

export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

export const NETWORKS = [baseSepolia] as const;

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: REOWN_PROJECT_ID,
  networks: [...NETWORKS],
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const APP_METADATA = {
  name: "AZIMUTH",
  description: "An onchain hunt for coordinates nobody knows.",
  url: "https://azimuth.game",
  icons: ["https://azimuth.game/icon.svg"],
};
