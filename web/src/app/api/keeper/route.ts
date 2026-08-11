import { createWalletClient, http, nonceManager, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { AZIMUTH_ABI } from "@/lib/chain/azimuth-abi";
import { AZIMUTH_ADDRESS, publicClient } from "@/lib/chain/config";
import { serializeDrip } from "@/lib/drip-guard";

const ACTIVE = 1;
const FOUND = 2;
const REPLAY_WINDOW = 600;
let lastSweep = 0;
const SWEEP_COOLDOWN_MS = 60_000;

function keeperAccount() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  return key ? privateKeyToAccount(key as Hex, { nonceManager }) : null;
}

async function sweep() {
  const account = keeperAccount();
  if (!account) return Response.json({ error: "Keeper is not configured" }, { status: 503 });

  const startedAt = Date.now();
  if (startedAt - lastSweep < SWEEP_COOLDOWN_MS) {
    return Response.json({ skipped: "cooling down", respawned: [] });
  }
  lastSweep = startedAt;

  const [vaults, block] = await Promise.all([
    publicClient.readContract({
      address: AZIMUTH_ADDRESS,
      abi: AZIMUTH_ABI,
      functionName: "allVaults",
    }),
    publicClient.getBlock(),
  ]);

  const now = Number(block.timestamp);
  const stale = vaults
    .map((vault, index) => ({ id: index + 1, vault }))
    .filter(({ vault }) => {
      if (vault.status === FOUND) return now >= Number(vault.settledAt) + REPLAY_WINDOW;
      return vault.status !== ACTIVE || Number(vault.expiresAt) <= now;
    });

  if (stale.length === 0) return Response.json({ respawned: [], active: vaults.length });

  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  const respawned: number[] = [];
  for (const { id } of stale) {
    try {
      const hash = await serializeDrip(() =>
        wallet.writeContract({
          address: AZIMUTH_ADDRESS,
          abi: AZIMUTH_ABI,
          functionName: "respawn",
          args: [BigInt(id)],
        }),
      );
      await publicClient.waitForTransactionReceipt({ hash });
      respawned.push(id);
    } catch {
      continue;
    }
  }

  return Response.json({ respawned, checked: stale.length });
}

export async function POST() {
  return sweep();
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }
  return sweep();
}
