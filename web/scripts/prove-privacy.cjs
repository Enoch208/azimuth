// Proves the one claim this project rests on, against the live deployment.
//
//   cd web && node scripts/prove-privacy.cjs --day 20678 --hunter 0x...
//
// A dig is public the moment it lands: the tile, the wallet, and the ciphertext
// handle holding the answer are all readable by anyone. This reads that public
// event, decrypts the answer as the wallet that earned it, and then tries the
// identical handle as a different wallet — which is refused.
//
// The rival wallet is generated fresh on each run and holds nothing. Reading
// someone else's answer is not a question of funds; the network simply will not
// serve it.

const fs = require("node:fs");
const path = require("node:path");
const { createWalletClient, createPublicClient, http } = require("viem");
const { privateKeyToAccount, generatePrivateKey } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");

const ROOT = path.resolve(__dirname, "..", "..");
const abiSrc = fs.readFileSync(path.join(ROOT, "web/src/lib/chain/daily-abi.ts"), "utf8");
const ABI = JSON.parse(abiSrc.slice(abiSrc.indexOf("["), abiSrc.lastIndexOf("]") + 1));
const DAILY = (process.env.DAILY_ADDRESS
  || fs.readFileSync(path.join(ROOT, "contracts/.daily-address"), "utf8")).trim();

const RPCS = ["https://base-sepolia-rpc.publicnode.com", "https://sepolia.base.org"];
const TEMPERATURES = ["FOUND", "BURNING", "HOT", "WARM", "COLD", "FREEZING"];

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const { Lightning } = require("@inco/lightning-js/lite");
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPCS[0]) });
  const lightning = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: RPCS });

  const ownerKey = arg("key", process.env.DEPLOYER_PRIVATE_KEY);
  if (!ownerKey) throw new Error("pass --key 0x... or set DEPLOYER_PRIVATE_KEY");
  const owner = createWalletClient({
    account: privateKeyToAccount(ownerKey), chain: baseSepolia, transport: http(RPCS[0]),
  });

  const today = Number(await publicClient.readContract({ address: DAILY, abi: ABI, functionName: "today" }));
  const day = Number(arg("day", today));
  const hunter = arg("hunter", owner.account.address);

  // After midnight every trail is deliberately made public, so a rival reading
  // one is the design working, not a leak. Running this against a revealed day
  // would look like a failure and prove nothing either way.
  const info = await publicClient.readContract({
    address: DAILY, abi: ABI, functionName: "huntInfo", args: [BigInt(day)],
  });
  if (info[4]) {
    console.log(`\n  Day ${day} is already revealed — every trail on it is public on purpose.`);
    console.log(`  Run this against a live day (today is ${today}) to see the refusal.\n`);
    process.exit(0);
  }

  // A rival with a wallet and nothing else.
  const rival = createWalletClient({
    account: privateKeyToAccount(generatePrivateKey()), chain: baseSepolia, transport: http(RPCS[0]),
  });

  // Straight out of public contract storage — no event scan, no indexer, no
  // permission. The tile and the ciphertext handle are simply readable.
  const trail = await publicClient.readContract({
    address: DAILY, abi: ABI, functionName: "playerTrail", args: [BigInt(day), hunter],
  });
  const [xs, ys, handles] = trail;
  if (handles.length === 0) throw new Error(`${hunter} did not dig on day ${day}`);

  const pick = handles.length - 1;
  const handle = handles[pick];

  console.log(`\n  PUBLIC — read from contract storage by anybody, with no key`);
  console.log(`  playerTrail(${day}, ${hunter.slice(0, 10)}…)`);
  console.log(`  dig ${pick + 1} of ${handles.length}, tile (${xs[pick]},${ys[pick]})`);
  console.log(`  handle  ${handle}`);

  console.log(`\n  WALLET A — ${hunter.slice(0, 10)}…, the wallet that dug it`);
  const answer = await lightning.attestedDecrypt(owner, [handle]);
  console.log(`  decrypt -> ${TEMPERATURES[Number(answer[0].plaintext.value)] ?? answer[0].plaintext.value}`);

  console.log(`\n  WALLET B — ${rival.account.address.slice(0, 10)}…, a rival, same handle`);
  try {
    const stolen = await lightning.attestedDecrypt(rival, [handle]);
    console.log(`  decrypt -> ${TEMPERATURES[Number(stolen[0].plaintext.value)]}   *** LEAK ***`);
    process.exit(1);
  } catch (error) {
    console.log(`  decrypt -> DENIED: ${String(error.message ?? error).split("\n")[0].slice(0, 90)}\n`);
  }
}

main().catch((error) => {
  console.error(String(error.message ?? error).slice(0, 300));
  process.exit(1);
});
