# AZIMUTH

**The chain knows. You don't.**

One treasure is buried somewhere on today's map. You get six digs. Every dig tells you how
close you are and nothing else, and what it tells *you* is readable by nobody else.

Play it: **https://azimuth-inco.vercel.app**

Built on [Inco Lightning](https://docs.inco.org) on Base Sepolia.

## The game

```
11 × 11 map · 6 digs · one treasure · everyone plays the same board

💎 FOUND    🔥 BURNING    🌡 HOT    🌤 WARM    ❄️ COLD    🥶 FREEZING
```

1. A treasure is generated **encrypted onchain** by `e.randBounded(11)` at the start of each
   day. No key anywhere holds the plaintext.
2. Click a tile. The contract measures the distance to a coordinate it cannot read and answers
   with a temperature — decrypted to **your wallet alone**.
3. Everyone hunts the same treasure. Rivals can see *where* you dug. They cannot see what it
   told you.
4. After midnight the map opens: the treasure, every trail and every score become public, and
   the day is scored on fewest digs.

## Why this needs confidential compute

```solidity
struct Hunt { uint8 x; uint8 y; }        // one eth_getStorageAt and the day is over
struct Hunt { euint256 x; euint256 y; }  // ciphertext the contract still computes on
```

A shared daily target is only a game if nobody can read it. That includes us.

## Only what would spoil the game is hidden

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
else. Only the public record waits. Two tests hold this shut:

- `testNothingPublicMarksAFinderWhileTheDayRuns`
- `testTheTreasureCannotBeClaimedBeforeMidnight`

Nothing here is encrypted for the sake of it. The coordinate is hidden because reading it ends
the game; each hunter's answers are hidden because copying them ends the game; who won is
hidden because naming them points at the treasure. Everything else is public.

## How Inco is used

| Mechanic | Call |
|---|---|
| A treasure nobody chooses | `e.randBounded(11)` for x and y |
| Distance to a secret | `e.max`/`e.min`/`e.sub` over `euint256`, never decrypted |
| Temperature ladder | `e.div(e.add(e.max(dx, dy), 1), 2)` — Chebyshev banded in twos |
| Answers only you can read | `e.allow(temperature, msg.sender)` |
| Proving you found it | `e.verifyDecryption(found, true, covalidatorSignatures)` |
| Opening the map | `e.reveal` on the treasure and every trail, after midnight |
| Sponsored fees | the contract holds ETH and pays Inco's per-operation fee |

## Live

| | |
|---|---|
| Daily hunt | [`0x1866B5248E212B83C0bCd1B45b0512475e924649`](https://sepolia.basescan.org/address/0x1866B5248E212B83C0bCd1B45b0512475e924649) |
| Callsigns | [`0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19`](https://sepolia.basescan.org/address/0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19) |
| Network | Base Sepolia (84532) |
| Inco Lightning | `0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624` |

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

```
attestation latency        8–11 s per confidential answer
fee consumed on deploy     2 × 10¹² wei, exactly two randBounded calls
```

A dig is not instant. The interface narrates the wait as searching rather than hiding it.

## Run it

```bash
npm install                      # root: Foundry deps for contracts/
cd contracts && forge test       # 98 tests
cd ../web && npm test            # 74 tests
cd ../web && npm run dev
```

`web/.env.local` needs:

```
NEXT_PUBLIC_REOWN_PROJECT_ID=...
NEXT_PUBLIC_DAILY_ADDRESS=0x1866B5248E212B83C0bCd1B45b0512475e924649
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

## Known limitations

- **Six digs is about a minute of waiting.** Each confidential answer takes 8–11 seconds. The
  interface makes the wait part of the tension rather than pretending it is not there.
- **Nothing stops one person playing from several wallets.** Digs are keyed on `msg.sender`,
  so the leaderboard is for fun, not for stakes.
- **The map opens on a schedule this project runs.** `revealDay` is permissionless, so anyone
  can open yesterday's map if the scheduler misses, but until somebody calls it the recap has
  nothing to show.
- **The daily rollover has been tested in Foundry against a warped clock, not yet watched
  happening on a live day boundary.**

## An earlier version of this project

The history contains a larger game: 64×64 vaults, warmer/colder relative to your own best
probe, purchasable compass bearings, an intel-licensing market. It works and its tests pass.
The person who helped build it then looked at the finished screen and said *"I don't really
understand this game."*

Relative feedback was the problem. `COLDER` means *further than your own closest probe so far*,
which nobody can hold in their head across twenty moves. `HOT` means something on its own.

That game has been cut from `main` so this repository describes one product. It is preserved
in full — contract, 57 passing tests, and its whole frontend — at the `pre-daily-pivot` tag
and the `legacy-vault-game` branch:

```bash
git show pre-daily-pivot:contracts/src/AzimuthGame.sol
git checkout legacy-vault-game
```

The simulation that measured the old game's information economy is still in `contracts/sim/`,
alongside the one that tuned the daily ladder.
