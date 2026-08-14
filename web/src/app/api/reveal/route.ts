import { createWalletClient, http, nonceManager, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { DAILY_ABI } from "@/lib/chain/daily-abi";
import { DAILY_ADDRESS, publicClient } from "@/lib/chain/config";
import { getLightning } from "@/lib/chain/inco";
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

// Which hunters dug that day, and every ciphertext handle each of them left.
// Shares the recap's bracketed day window rather than walking a fixed 48 hour
// lookback in sequence: the old version issued roughly 46 sequential getLogs
// calls before the first transaction was sent.
async function huntersOn(day: number): Promise<{ hunter: string; handles: Hex[] }[]> {
  const rows = await dugOn(day);
  const trails = new Map<string, Hex[]>();
  for (const row of rows) {
    trails.set(row.hunter, [...(trails.get(row.hunter) ?? []), row.handle]);
  }
  return [...trails.entries()].map(([hunter, handles]) => ({ hunter, handles }));
}

// The contract keeps no per-trail record of having been revealed, so a retry
// would re-send every trail and spend the fee float again on work already done.
// A trail that is already public can be read by anyone, including this server —
// so ask, and skip the ones that answer.
//
// Fail-safe by construction: anything other than a clean read is treated as
// still sealed, and gets revealed. The cost of a wrong guess here is one
// duplicate transaction, never a trail left shut.
//
// Every handle is checked, not just the first. A reveal can propagate unevenly
// across the digs in one trail — day 20678 came back with digs one and four
// public and the rest sealed — and asking only about the first handle marks
// that trail done and strands the remainder for good.
async function alreadyOpen(handles: Hex[]): Promise<boolean> {
  if (handles.length === 0) return true;
  try {
    const lightning = await getLightning();
    await lightning.attestedReveal(handles);
    return true;
  } catch {
    return false;
  }
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
  const skipped: string[] = [];
  const failed: string[] = [];
  for (const { hunter, handles } of hunters) {
    if (await alreadyOpen(handles)) {
      skipped.push(hunter);
      continue;
    }
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

  // A trail left sealed is the one outcome this endpoint exists to prevent, so
  // it answers 500 and the scheduler retries. Reporting 200 with a failure count
  // buried in the body let a red run look green.
  const body = {
    day,
    opened: true,
    reopened: !info[4],
    trails: revealed.length,
    alreadyOpen: skipped.length,
    failed: failed.length,
    hunters: hunters.length,
  };
  return Response.json(body, { status: failed.length > 0 ? 500 : 200 });
}

// Every sweep spends the keeper's gas and the contract's Inco fee float, and
// re-revealing an already open trail spends both again — so this is guarded,
// and it is guarded closed. A missing secret refuses rather than opening the
// endpoint to the world.
function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function guarded(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Not authorised" }, { status: 401 });
  }
  return sweep();
}

export async function POST(request: Request) {
  return guarded(request);
}

export async function GET(request: Request) {
  return guarded(request);
}
