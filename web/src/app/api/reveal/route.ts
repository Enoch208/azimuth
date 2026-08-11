import { createWalletClient, http, nonceManager, getAbiItem, type AbiEvent, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { serializeDrip } from "@/lib/drip-guard";

const MAX_RANGE = BigInt(1900);

function keeper() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  return key ? privateKeyToAccount(key as Hex, { nonceManager }) : null;
}

async function huntersOn(day: number): Promise<string[]> {
  const event = getAbiItem({ abi: DAILY_ABI, name: "Dug" }) as AbiEvent;
  const latest = await publicClient.getBlockNumber();
  const lookback = BigInt(86_400);
  let from = latest > lookback ? latest - lookback : BigInt(0);

  const seen = new Set<string>();
  while (from <= latest) {
    const to = from + MAX_RANGE > latest ? latest : from + MAX_RANGE;
    const logs = await publicClient.getLogs({
      address: DAILY_ADDRESS,
      event,
      args: { day: BigInt(day) },
      fromBlock: from,
      toBlock: to,
    });
    for (const log of logs) {
      const args = log.args as unknown as { hunter: string };
      seen.add(args.hunter);
    }
    from = to + BigInt(1);
  }
  return [...seen];
}

// Opens yesterday's map. Until this runs the treasure and every trail stay
// encrypted, so the recap simply has nothing to show.
async function sweep() {
  const account = keeper();
  if (!account) return Response.json({ error: "Keeper is not configured" }, { status: 503 });

  const today = Number(
    await publicClient.readContract({ address: DAILY_ADDRESS, abi: DAILY_ABI, functionName: "today" }),
  );
  const day = today - 1;

  const info = await publicClient.readContract({
    address: DAILY_ADDRESS,
    abi: DAILY_ABI,
    functionName: "huntInfo",
    args: [BigInt(day)],
  });
  if (!info[3]) return Response.json({ day, skipped: "no hunt that day" });
  if (info[4]) return Response.json({ day, skipped: "already revealed", trails: 0 });

  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  const openHash = await serializeDrip(() =>
    wallet.writeContract({ address: DAILY_ADDRESS, abi: DAILY_ABI, functionName: "revealDay", args: [BigInt(day)] }),
  );
  await publicClient.waitForTransactionReceipt({ hash: openHash });

  const hunters = await huntersOn(day);
  const revealed: string[] = [];
  for (const hunter of hunters) {
    try {
      const hash = await serializeDrip(() =>
        wallet.writeContract({
          address: DAILY_ADDRESS,
          abi: DAILY_ABI,
          functionName: "revealTrail",
          args: [BigInt(day), hunter as Hex],
        }),
      );
      await publicClient.waitForTransactionReceipt({ hash });
      revealed.push(hunter);
    } catch {
      continue;
    }
  }

  return Response.json({ day, opened: true, trails: revealed.length, hunters: hunters.length });
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
