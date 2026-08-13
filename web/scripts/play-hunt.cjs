// Plays today's hunt from a private key, end to end, and prints the evidence
// as it goes: transaction hashes, ciphertext handles, and what each handle
// decrypted to for the wallet that owns it.
//
//   node scripts/play-hunt.cjs --key 0x... --digs 3,4 7,7 0,10 --guess 5,5
//
// --digs   tiles to dig, in order. Six is the allowance.
// --guess  a sealed guess, only legal once all six digs are spent.
//
// Every number printed here came back from Base Sepolia and the Inco
// covalidator; nothing is simulated.

const fs = require("node:fs");
const path = require("node:path");
const { createWalletClient, createPublicClient, http, parseEventLogs } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");

const ROOT = path.resolve(__dirname, "..", "..");
const abiSrc = fs.readFileSync(path.join(ROOT, "web/src/lib/chain/daily-abi.ts"), "utf8");
const ABI = JSON.parse(abiSrc.slice(abiSrc.indexOf("["), abiSrc.lastIndexOf("]") + 1));
const DAILY = (process.env.DAILY_ADDRESS
  || fs.readFileSync(path.join(ROOT, "contracts/.daily-address"), "utf8")).trim();

const RPCS = ["https://sepolia.base.org", "https://base-sepolia-rpc.publicnode.com"];

function parseArgs(argv) {
  const out = { digs: [], guess: null, key: null };
  let mode = null;
  for (const token of argv.slice(2)) {
    if (token === "--key") { mode = "key"; continue; }
    if (token === "--digs") { mode = "digs"; continue; }
    if (token === "--guess") { mode = "guess"; continue; }
    if (mode === "key") { out.key = token; mode = null; continue; }
    if (mode === "guess") { out.guess = token; mode = null; continue; }
    if (mode === "digs") out.digs.push(token);
  }
  return out;
}

const tile = (text) => {
  const [x, y] = text.split(",").map((n) => Number(n.trim()));
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || x > 10 || y < 0 || y > 10) {
    throw new Error(`tile "${text}" is off an 11 by 11 map`);
  }
  return { x, y };
};

const TEMPERATURES = ["FOUND", "BURNING", "HOT", "WARM", "COLD", "FREEZING"];

async function main() {
  const args = parseArgs(process.argv);
  const key = args.key ?? process.env.PLAYER_KEY;
  if (!key) throw new Error("pass --key 0x... or set PLAYER_KEY");

  const { Lightning } = require("@inco/lightning-js/lite");
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPCS[0]) });
  const wallet = createWalletClient({ account, chain: baseSepolia, transport: http(RPCS[0]) });
  const lightning = await Lightning.baseSepoliaTestnet({ hostChainRpcUrls: RPCS });

  const day = Number(await publicClient.readContract({ address: DAILY, abi: ABI, functionName: "today" }));
  console.log(`contract ${DAILY}`);
  console.log(`hunter   ${account.address}`);
  console.log(`day      ${day}\n`);

  const send = async (functionName, callArgs) => {
    const hash = await wallet.writeContract({ address: DAILY, abi: ABI, functionName, args: callArgs });
    return publicClient.waitForTransactionReceipt({ hash });
  };

  // The covalidator signs a few seconds behind the transaction, so a read that
  // is not ready yet is retried rather than reported as a failure.
  const readHandle = async (handle) => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const [attested] = await lightning.attestedDecrypt(wallet, [handle]);
        return attested.plaintext.value;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
    throw new Error(`handle ${handle} never became readable`);
  };

  for (const raw of args.digs) {
    const { x, y } = tile(raw);
    const started = Date.now();
    const receipt = await send("dig", [x, y]);
    const [event] = parseEventLogs({ abi: ABI, eventName: "Dug", logs: receipt.logs });
    const handle = event.args.temperature;
    const value = await readHandle(handle);
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `dig  (${x},${y})  ${TEMPERATURES[Number(value)] ?? value}`
      + `\n     tx     ${receipt.transactionHash}`
      + `\n     handle ${handle}   read in ${seconds}s\n`,
    );
  }

  if (args.guess) {
    const { x, y } = tile(args.guess);
    const FIELD = Number(await publicClient.readContract({ address: DAILY, abi: ABI, functionName: "FIELD" }));
    const index = BigInt(x + FIELD * y);

    // The one move the hunter encrypts themselves. Everything above this line
    // was public the moment it landed; this is not.
    const ciphertext = await lightning.encrypt(index, {
      accountAddress: account.address,
      dappAddress: DAILY,
    });

    const receipt = await send("sealGuess", [ciphertext]);
    const [event] = parseEventLogs({ abi: ABI, eventName: "GuessSealed", logs: receipt.logs });
    const verdict = await readHandle(event.args.verdict);
    console.log(
      `seal (${x},${y})  ${verdict ? "RIGHT" : "wrong"}`
      + `\n     tx     ${receipt.transactionHash}`
      + `\n     tile   ciphertext ${ciphertext.slice(0, 34)}…  (${ciphertext.length / 2 - 1} bytes)`
      + `\n     verdict handle ${event.args.verdict}\n`,
    );
  }

  const [, hunters, finders] = await publicClient.readContract({
    address: DAILY, abi: ABI, functionName: "huntInfo", args: [BigInt(day)],
  });
  console.log(`day ${day}: ${hunters} hunters, ${finders} settled finders`);
}

main().catch((error) => {
  console.error(String(error.message ?? error).slice(0, 300));
  process.exit(1);
});
