import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia } from "@reown/appkit/networks";
import { cookieStorage, createStorage, http } from "wagmi";

export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "";

export const NETWORKS = [baseSepolia] as const;

export const BASE_SEPOLIA_RPC = "https://sepolia.base.org";

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: REOWN_PROJECT_ID,
  networks: [...NETWORKS],
  transports: {
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC),
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://azimuth-inco.vercel.app";

export const APP_METADATA = {
  name: "AZIMUTH",
  description: "An onchain hunt for coordinates that stay unknown until someone finds them.",
  url: SITE_URL,
  icons: [`${SITE_URL}/icon.svg`],
};
