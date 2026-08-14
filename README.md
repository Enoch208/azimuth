# AZIMUTH

**The chain knows. You don't.**

One treasure is buried somewhere on today's map. Everyone hunts the same one. You get six digs,
and every dig tells you only how close you are — in an answer nobody else can read.

Play it: **https://azimuth-inco.vercel.app**

Built on [Inco Lightning](https://docs.inco.org) on Base Sepolia.

## The game

```
11 × 11 map · 6 digs · one sealed guess · one treasure · everyone plays the same board

💎 FOUND    🔥 BURNING    🌡 HOT    🌤 WARM    ❄️ COLD    🥶 FREEZING
```

1. A treasure is generated **encrypted onchain** by `e.randBounded(11)` at the start of each
   day. No key anywhere holds the plaintext.
2. Click a tile. The contract measures the distance to a coordinate it cannot read and answers
   with a temperature — decrypted to **your wallet alone**.
3. Everyone hunts the same treasure. You can watch where rivals dig, in real time, on the same
   map. You cannot see what any of it told them.
4. Spend all six digs without finding it and you get **one sealed guess**: a tile you encrypt
   yourself, compared against a coordinate the contract cannot read either.
5. After midnight UTC the map opens: the treasure, every trail, every sealed guess and every
   score become public, and the day is scored.

## Every move is public. Every clue is private.

That sentence is the whole design, and the board is built to make it visible rather than
claimed.

| Public while the hunt runs | Private while the hunt runs | Public after midnight |
|---|---|---|
| Which wallet dug | The treasure's coordinates | The treasure's coordinates |
| Which tile they dug | What each dig answered | Every trail and every answer |
| How many digs they have spent | Whether anyone has found it | Who found it, and in how many digs |
| That a hunter sealed a guess | Which tile they guessed, and whether it landed | Every sealed guess and its verdict |

A rival can follow every step you take and learn nothing, because the step is public and the
answer is not. That is a game you cannot build on a transparent chain.

## The leak that shaped the contract

This is the part worth reading, because getting it wrong is easy.

Dig coordinates are **plaintext**, and would be readable straight out of storage even without a
view for them. An early version of this contract also emitted a public `TreasureFound` event
and exposed a finished flag and a finder count.

Those two facts together gave the whole thing away: **the treasure is simply the finder's last
dug tile.** One person finds it, anyone watching the chain knows where it is, and the day is
ruined for everybody still playing. Encrypting the coordinate was not enough — the *metadata
around a state transition* leaked it.

So scoring is deliberately delayed until the map opens. A player still sees their own result
the instant they dig it, because their temperature is decrypted to their wallet and nowhere
else. Only the public record waits. Three tests hold this shut:

- `testNothingPublicMarksAFinderWhileTheDayRuns`
- `testTheTreasureCannotBeClaimedBeforeMidnight`
- `testNothingPublicSaysWhetherAGuessLanded`

You can see the rule held on chain for a whole day. Day 20678 ran with seven hunters, four of
whom held a find — two dug it up, two named it — and `huntInfo` reported **0 finders** from the
first dig until the moment the day closed.

## The sealed guess

Every dig is public the moment it lands, which is exactly what makes a last move worth hiding.
When a hunter's six digs are gone they may name one more tile — and that one they encrypt
themselves.

```solidity
euint256 tile = e.newEuint256(tileCiphertext, msg.sender);   // the hunter's secret
ebool right = e.eq(e.add(hunt.x, e.mul(hunt.y, FIELD)), tile); // against the contract's secret
e.allow(right, msg.sender);                                   // an answer only they can open
```

It is the only move on the board nobody can watch, and the only ciphertext in Azimuth the
contract did not mint itself. Every other secret here is born inside `randBounded`; this one
arrives from the player, and the two are compared without either side being decrypted.

The tile travels as one number, `x + 11 * y`, so a guess is a single ciphertext and a single
equality. A right guess folds into the same flag a dug find sets, so settlement, scoring and
the recap needed no new concepts. A sealed find ranks below everyone who dug the treasure up
and above everyone who missed.

## How Inco is used

| Mechanic | Call |
|---|---|
| A treasure nobody chooses | `e.randBounded(11)` for x and y |
| Distance to a secret | `e.max`/`e.min`/`e.sub` over `euint256`, never decrypted |
| Temperature ladder | `e.div(e.add(e.max(dx, dy), 1), 2)` — Chebyshev banded in twos |
| Answers only you can read | `e.allow(temperature, msg.sender)` |
| **A secret the player brings** | **`e.newEuint256(ciphertext, msg.sender)` for a sealed guess** |
| Comparing two secrets | `e.eq` over the guess and the treasure, both encrypted |
| Proving you found it | `e.verifyDecryption(found, true, covalidatorSignatures)` |
| Opening the map | `e.reveal` on the treasure, every trail and every guess, after midnight |
| Sponsored fees | the contract holds ETH and pays Inco's per-operation fee |

Both directions are covered: secrets the contract generates and never reveals, and secrets the
player generates that the contract computes on without ever seeing.

## Live

| | |
|---|---|
| Daily hunt | [`0x86C59B978B14bc8B2914A70548baAB2700bd58d6`](https://sepolia.basescan.org/address/0x86C59B978B14bc8B2914A70548baAB2700bd58d6) |
| Verified source | [Blockscout](https://base-sepolia.blockscout.com/address/0x86C59B978B14bc8B2914A70548baAB2700bd58d6?tab=contract) · [Sourcify](https://repo.sourcify.dev/84532/0x86C59B978B14bc8B2914A70548baAB2700bd58d6) — creation and runtime both match |
| Callsigns | [`0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19`](https://sepolia.basescan.org/address/0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19) |
| Network | Base Sepolia (84532) |
| Inco Lightning | `0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624` |

Transaction-level evidence, including a wallet failing to decrypt another wallet's answer, is
in [`evidence/deployment.md`](evidence/deployment.md).

The source is verified on Sourcify and Blockscout, where the runtime bytecode matches this
repository exactly. BaseScan's own verification needs an Etherscan API key, which this
deployment does not carry:

```bash
cd contracts
forge verify-contract 0x86C59B978B14bc8B2914A70548baAB2700bd58d6 \
  src/AzimuthDaily.sol:AzimuthDaily --chain-id 84532 --etherscan-api-key $ETHERSCAN_API_KEY
```

## Sized by simulation, not by feel

`contracts/sim/daily.mjs` runs the real temperature ladder against synthetic hunts.

```
configuration            careless player    thoughtful player
9×9,  6 digs, 5 temps     86% in 4 digs      85% in 4 digs      skill is irrelevant
11×11, 6 digs, 5 temps    83% in 5 digs      88% in 4 digs      locked
11×11, 6 digs, 6 temps    99% in 4 digs     100% in 4 digs      trivial
13×13, 6 digs, 5 temps    72% in 5 digs      74% in 5 digs      skill barely matters
```

A 9×9 map was rejected because careless and thoughtful play scored the same, which would have
made a fewest-digs leaderboard rank luck. At 11×11 most people finish and thinking shows up as
four digs instead of five.

## Measured, not claimed

Timed against this deployment on 13 August 2026:

```
confidential answer, steady state      10–12 s
first answer on a freshly deployed     67–71 s   (the covalidator warming to a new contract)
sealed guess ciphertext                1316 bytes, encrypted in the browser
fee consumed on deploy                 2 × 10¹² wei, exactly two randBounded calls
```

A dig is not instant. The interface narrates the wait as searching rather than hiding it.

## Run it

```bash
npm install                      # root: Foundry deps for contracts/

cd contracts
forge build
forge test                       # 39 tests
forge fmt --check

cd ../web
npm install
npm test                         # 180 tests
npm run lint
npm run build
npm run dev
```

Every command above passes from a clean clone, with no extra flags.

`web/.env.local` needs:

```
NEXT_PUBLIC_REOWN_PROJECT_ID=...
NEXT_PUBLIC_DAILY_ADDRESS=0x86C59B978B14bc8B2914A70548baAB2700bd58d6
NEXT_PUBLIC_CALLSIGNS_ADDRESS=0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19
DEPLOYER_PRIVATE_KEY=...          # keeper and faucet only, never an owner key
CRON_SECRET=...                   # guards the reveal and keeper endpoints
```

Deploy your own:

```bash
cd contracts
DEPLOYER_PRIVATE_KEY=0x... forge script script/DeployDaily.s.sol:DeployDaily \
  --rpc-url https://sepolia.base.org --broadcast
```

Play a hunt from the command line, which is how the evidence above was gathered:

```bash
cd web
node scripts/play-hunt.cjs --key 0x... --digs 3,4 7,7 0,10 --guess 5,5
```

## Known limitations

- **Six digs is about a minute of waiting.** Each confidential answer takes 10–12 seconds. The
  interface makes the wait part of the tension rather than pretending it is not there.
- **Nothing stops one person playing from several wallets.** Digs are keyed on `msg.sender`,
  so the leaderboard is for fun, not for stakes.
- **Day 20678 was seeded by the author.** Six of its seven wallets played it deliberately, to
  give the first reveal on this deployment a populated board. They are scripted hunts, not
  organic players. Their throwaway keys were discarded afterwards, so only one of the four
  finds was settled on chain and `finders` reads 1 — the standings are derived from the
  revealed trails, not from claims, and are unaffected.
- **The map opens on a schedule this project runs.** `revealDay` is permissionless, so anyone
  can open yesterday's map if the scheduler misses, but until somebody calls it the recap has
  nothing to show. The keeper is a GitHub Action at 00:05 UTC; a sweep that fails part way
  retries the trails it missed on the next run.
- **A revealed day sometimes will not decrypt immediately.** The recap falls back to the most
  recent day the network will serve rather than showing an error.

## Disclosure

Built during the Summer Game Jam window. The first commit is 11 August 2026.

The history contains an earlier, larger game: 64×64 vaults, warmer/colder relative to your own
best probe, purchasable compass bearings, an intel-licensing market. It works and its tests
pass. The person who helped build it then looked at the finished screen and said *"I don't
really understand this game."*

Relative feedback was the problem. `COLDER` means *further than your own closest probe so far*,
which nobody can hold in their head across twenty moves. `HOT` means something on its own.

That game has been cut from `main` so this repository describes one product. It is preserved
in full — contract, its tests, and its whole frontend — at the `pre-daily-pivot` tag and the
`legacy-vault-game` branch:

```bash
git show pre-daily-pivot:contracts/src/AzimuthGame.sol
git checkout legacy-vault-game
```

The simulation that measured the old game's information economy is still in `contracts/sim/`,
alongside the one that tuned the daily ladder.
