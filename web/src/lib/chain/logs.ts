import { AZIMUTH_ADDRESS, DEPLOY_BLOCK, publicClient } from "@/lib/chain/config";
import type { AZIMUTH_ABI } from "@/lib/chain/azimuth-abi";

const MAX_RANGE = BigInt(1900);
const BLOCK_SECONDS = BigInt(2);

type EventName = "Probed" | "BearingPurchased" | "VaultSettled";

export async function roundStartBlock(createdAt: number): Promise<bigint> {
  const block = await publicClient.getBlock();
  const elapsed = BigInt(Math.max(0, Number(block.timestamp) - createdAt));
  const back = elapsed / BLOCK_SECONDS + BigInt(50);
  const estimated = block.number > back ? block.number - back : BigInt(0);
  return estimated > DEPLOY_BLOCK ? estimated : DEPLOY_BLOCK;
}

export async function getEventsChunked(
  abi: typeof AZIMUTH_ABI,
  eventName: EventName,
  args: Record<string, unknown>,
  fromBlock: bigint,
) {
  const head = await publicClient.getBlockNumber();
  const batches = [];

  for (let start = fromBlock; start <= head; start += MAX_RANGE + BigInt(1)) {
    const end = start + MAX_RANGE > head ? head : start + MAX_RANGE;
    batches.push(
      publicClient.getContractEvents({
        address: AZIMUTH_ADDRESS,
        abi,
        eventName,
        args,
        fromBlock: start,
        toBlock: end,
      }),
    );
  }

  const results = await Promise.all(batches);
  return results.flat();
}
