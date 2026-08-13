// Run after a day boundary. Checks the reveal actually happened and that what
// the recap shows matches what the chain says.
//
//   cd web && npm run verify:rollover

import { createPublicClient, http, getAbiItem } from "viem";
import { baseSepolia } from "viem/chains";
import fs from "node:fs";

const WEB = "/Users/enoch/Developer/personal/azimuth/web";
const abiSrc = fs.readFileSync(`${WEB}/src/lib/chain/daily-abi.ts`, "utf8");
const ABI = JSON.parse(abiSrc.slice(abiSrc.indexOf("["), abiSrc.lastIndexOf("]") + 1));
const DAILY = fs.readFileSync("/Users/enoch/Developer/personal/azimuth/contracts/.daily-address", "utf8").trim();

const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

const read = (functionName, args) => client.readContract({ address: DAILY, abi: ABI, functionName, args });

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const today = Number(await read("today"));
const yesterday = today - 1;
console.log(`today ${today}, verifying day ${yesterday}\n`);

const [, hunters, finders, opened, revealed] = await read("huntInfo", [BigInt(yesterday)]);
if (!opened) {
  console.log("  ..  nothing to verify: no hunt ran on that day yet");
  console.log("\nrun this again after the first midnight rollover");
  process.exit(0);
}
check("yesterday had a hunt", opened, `hunters=${hunters}`);

check("the map was opened by the scheduler", revealed);

const ZERO = `0x${"0".repeat(64)}`;
const [xHandle, yHandle] = await read("treasureHandles", [BigInt(yesterday)]);
// Both coordinates matter: a hunt with only one handle set would decrypt to a
// treasure sitting on row zero for everyone.
check("treasure handles exist", xHandle !== ZERO && yHandle !== ZERO, `x=${xHandle.slice(0, 10)}… y=${yHandle.slice(0, 10)}…`);

const event = getAbiItem({ abi: ABI, name: "Dug" });
const latest = await client.getBlockNumber();
let from = latest > 86_400n ? latest - 86_400n : 0n;
const digs = [];
while (from <= latest) {
  const to = from + 1900n > latest ? latest : from + 1900n;
  const logs = await client.getLogs({ address: DAILY, event, args: { day: BigInt(yesterday) }, fromBlock: from, toBlock: to });
  digs.push(...logs);
  from = to + 1n;
}
check("dig events found for that day", digs.length > 0, `${digs.length} digs`);

const byHunter = new Map();
for (const log of digs) {
  const a = log.args;
  byHunter.set(a.hunter, (byHunter.get(a.hunter) ?? 0) + 1);
}
check("hunter count matches the events", byHunter.size === Number(hunters), `events=${byHunter.size} contract=${hunters}`);

for (const [hunter, count] of byHunter) {
  const state = await read("playerState", [BigInt(yesterday), hunter]);
  check(`${hunter.slice(0, 8)}… dig count matches`, Number(state[0]) === count, `chain=${state[0]} events=${count}`);
  if (state[2]) {
    check(`${hunter.slice(0, 8)}… score is a real dig number`, Number(state[3]) > 0 && Number(state[3]) <= 6, `${state[3]}/6`);
  }
}

check("finders never exceeds hunters", Number(finders) <= Number(hunters), `${finders}/${hunters}`);

const todayInfo = await read("huntInfo", [BigInt(today)]);
check("today has its own hunt, still sealed", !todayInfo[4]);
const [txHandle] = await read("treasureHandles", [BigInt(today)]);
check("today's treasure differs from yesterday's", txHandle !== xHandle);

// The checks above read the contract. They cannot tell you whether the
// covalidator will actually hand back the plaintext, and a day can sit
// revealed-but-undecryptable for hours — during which every check here passes
// while the recap has nothing to show. RECAP_URL closes that gap by asking the
// page what a player would see.
const recapUrl = process.env.RECAP_URL;
if (recapUrl) {
  try {
    const body = await fetch(recapUrl).then((r) => r.text());
    const readable = /The treasure was\s*(<!--\s*-->)?\s*[A-K]\d+/.test(body);
    check("the recap actually renders a revealed treasure", readable, recapUrl);
    if (!readable && /reading is not/.test(body)) {
      console.log("      the map is open on chain but the network will not decrypt it yet");
    }
  } catch (error) {
    check("the recap page could be reached", false, String(error).slice(0, 80));
  }
} else {
  console.log("  ..  set RECAP_URL to also check the page a player actually sees");
}

console.log(`\n${failures === 0 ? "rollover verified" : `${failures} checks failed`}`);
process.exit(failures ? 1 : 0);
