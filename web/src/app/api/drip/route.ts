import { createWalletClient, http, isAddress, nonceManager, parseEther, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { publicClient } from "@/lib/chain/config";
import { checkDripAllowance, clientKey, recordDrip, serializeDrip } from "@/lib/drip-guard";

const DRIP_WEI = BigInt(process.env.DRIP_WEI ?? "60000000000000");
// The faucet and the keeper spend the same wallet, so a drained faucet is a
// missed rollover — the one failure that would leave a day sealed for good.
// A full sweep costs roughly 0.00002 ETH in gas, so this reserve is about a
// thousand rollovers deep and the faucet refuses long before the keeper is at
// risk. Refusing a drip is recoverable; a map that never opens is not.
const RESERVE_WEI = parseEther("0.02");

function faucetAccount() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) return null;
  return privateKeyToAccount(key as Hex, { nonceManager });
}

export async function POST(request: Request) {
  const account = faucetAccount();
  if (!account) {
    return Response.json({ error: "Faucet is not configured on this deployment" }, { status: 503 });
  }

  const client = clientKey(request);
  const allowance = checkDripAllowance(client);
  if (!allowance.allowed) {
    return Response.json({ error: allowance.reason }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { address?: string } | null;
  const address = body?.address;

  if (!address || !isAddress(address)) {
    return Response.json({ error: "Provide a valid address" }, { status: 400 });
  }

  const [recipientBalance, faucetBalance] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.getBalance({ address: account.address }),
  ]);

  if (recipientBalance > BigInt(0)) {
    return Response.json(
      { error: "This wallet already holds Base Sepolia ETH", balance: recipientBalance.toString() },
      { status: 409 },
    );
  }

  if (faucetBalance < DRIP_WEI + RESERVE_WEI) {
    return Response.json({ error: "Faucet is empty" }, { status: 503 });
  }

  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://base-sepolia-rpc.publicnode.com"),
  });

  try {
    const hash = await serializeDrip(() =>
      wallet.sendTransaction({ to: address, value: DRIP_WEI }),
    );
    recordDrip(client);
    return Response.json({ hash, amount: DRIP_WEI.toString() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message.split("\n")[0] : "Faucet transaction failed" },
      { status: 502 },
    );
  }
}

export async function GET() {
  const account = faucetAccount();
  if (!account) return Response.json({ configured: false });

  const balance = await publicClient.getBalance({ address: account.address });
  return Response.json({
    configured: true,
    faucet: account.address,
    balance: balance.toString(),
    dripsRemaining: Number(balance / DRIP_WEI),
  });
}
