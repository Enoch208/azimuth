import { createWalletClient, http, nonceManager, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { dugOn } from "@/lib/chain/recap";
import { serializeDrip } from "@/lib/drip-guard";

// Opening a full day is one reveal plus one transaction per hunter, each waited
// on. Six hunters is comfortably past the platform default, and a sweep cut off
// half way is the one failure this endpoint exists to avoid.
export const maxDuration = 300;

function keeper() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  return key ? privateKeyToAccount(key as Hex, { nonceManager }) : null;
}

// Which hunters dug that day. Shares the recap's bracketed day window rather
// than walking a fixed 48 hour lookback in sequence: the old version issued
// roughly 46 sequential getLogs calls before the first transaction was sent.
async function huntersOn(day: number): Promise<string[]> {
  const rows = await dugOn(day);
  return [...new Set(rows.map((row) => row.hunter))];
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

  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  // Opening the map and revealing the trails are separate transactions, so a
  // run that times out half way leaves the treasure public and some trails
  // still sealed. Returning early on an already-open day would strand those
  // trails forever — the sweep has to fall through and retry them instead.
  // revealDay is what is idempotent here; the trail loop is simply repeatable.
  if (!info[4]) {
    const openHash = await serializeDrip(() =>
      wallet.writeContract({ address: DAILY_ADDRESS, abi: DAILY_ABI, functionName: "revealDay", args: [BigInt(day)] }),
    );
    await publicClient.waitForTransactionReceipt({ hash: openHash });
  }

  const hunters = await huntersOn(day);
  const revealed: string[] = [];
  const failed: string[] = [];
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
      failed.push(hunter);
    }
  }

  // Reported so a failed sweep is visible in the cron log rather than silent.
  return Response.json({
    day,
    opened: true,
    reopened: !info[4],
    trails: revealed.length,
    failed: failed.length,
    hunters: hunters.length,
  });
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
