# AZIMUTH

An onchain hunt for coordinates that stay unknown to everyone — including us — for as long as
the hunt runs. The contract answers questions about them without revealing them: public
warmer/colder, bearings only your wallet can decrypt. They become readable only after a
verified settlement.

Built on [Inco Lightning](https://docs.inco.org) on Base Sepolia.

## 30 seconds of gameplay

1. Open a vault. Its coordinates were generated encrypted onchain by `e.randBounded(64)`.
   No deployer key ever held the plaintext, and nobody can read them while the hunt is live.
2. Click a cell. The contract measures squared distance to coordinates it cannot read,
   compares it against your previous best, and publishes one word: **WARMER** or **COLDER**.
   Every hunter sees it.
3. Buy an AZIMUTH scan for 20 AZ. You get one of eight compass directions, encrypted so only
   your wallet can decrypt it. Rivals see that you bought intel — never which way it pointed.
4. Watch your rivals. Buying intel is public even though the answer is not, so the feed can
   tell you *"shafe bought 1 bearing and has probed north of it 3x"* — derived only from
   public scan origins and public probe cells.
5. Land on the exact cell. The contract verifies the hit against the ciphertext, pays the
   bounty, and the coordinates become readable for the first time.
6. Read the whole hunt back. Once settled, every move replays on a clock, and each sealed
   bearing can be reconstructed from the now-public coordinate and its public origin — the
   same octant rule the contract ran, with no wallet decrypted to do it.

## Why a transparent contract cannot do this

```solidity
struct Vault { uint8 x; uint8 y; }        // one eth_getStorageAt and the hunt is over
struct Vault { euint256 x; euint256 y; }  // ciphertext; the contract still computes on it
```

The whole game depends on a value that stays hidden while remaining *useful*. The contract
computes distance, compares it against your running best, and derives a compass bearing —
all against ciphertext, and routes different answers to different people.

## Live

| | |
|---|---|
| Play | https://azimuth-inco.vercel.app |
| Game | [`0x60948d993b9c4f12982f155f36d049f995602a89`](https://sepolia.basescan.org/address/0x60948d993b9c4f12982f155f36d049f995602a89) |
| Callsigns | [`0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19`](https://sepolia.basescan.org/address/0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19) |
| Network | Base Sepolia (84532) |
| Inco Lightning | `0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624` |

Five vaults run onchain: FIRST SIGNAL, DEAD RECKONING, BLACK WATER, THE ABYSS, ZERO BEARING.

## How Inco is used

| Mechanic | Call |
|---|---|
| Coordinates nobody chooses | `e.randBounded(64)` for x and y |
| Confidential distance | `e.sub`/`e.mul`/`e.add` over `euint256`, never decrypted |
| Warmer / colder | `e.lt(distance, bestDistance)` then `e.reveal` — public |
| Sticky hit accumulator | `e.or(everHit, hit)` so settlement needs one attestation |
| Private bearing | octant derived with `e.select`, then `e.allow(handle, buyer)` |
| Settlement | `e.verifyDecryption(everHit, true, covalidatorSignatures)` onchain |
| Sponsored fees | the contract holds ETH and pays Inco's per-operation fee |

## Measured, not claimed

Fee sponsorship, from the live deployment:

```
fee float funded                   2,000,000,000,000,000 wei
contract balance after 5 vaults    1,990,000,000,000,000 wei
consumed by Inco                      10,000,000,000,000 wei
expected (5 vaults x 2 randBounded)   10,000,000,000,000 wei
```

Players pay L2 gas only. Every confidential-compute fee came from the contract.

Attestation latency, measured against live covalidators:

```
attestedReveal    10.4 s / 11.3 s
attestedDecrypt    8.4 s
```

A probe is not instant. The interface narrates the wait rather than hiding it.

## Run it

```bash
npm install                      # root: Foundry deps for contracts/
cd contracts && forge test       # 68 tests
cd ../web && npm test            # 50 tests
cd ../web && npm install && npm run dev
```

`web/.env.local` needs:

```
NEXT_PUBLIC_REOWN_PROJECT_ID=...
NEXT_PUBLIC_AZIMUTH_ADDRESS=0x60948d993b9c4f12982f155f36d049f995602a89
NEXT_PUBLIC_CALLSIGNS_ADDRESS=0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19
DEPLOYER_PRIVATE_KEY=...          # faucet only, never the contract owner
DRIP_WEI=60000000000000
```

Deploy your own:

```bash
cd contracts
DEPLOYER_PRIVATE_KEY=0x... forge script script/Deploy.s.sol:Deploy \
  --rpc-url https://sepolia.base.org --broadcast
```

## Tests

`forge test` — 68 passing across four suites; `npm test` in `web/` — 50. The ones that matter:

- `testBearingMatchesCompassFromFirstPrinciples` — places guesses at known offsets from the
  actual random secret and checks the compass answer directly, looping fresh vaults until all
  eight directions have been exercised. It does not re-implement the contract's own rule.
- `testBestDistanceEqualsMinimumSquaredDistance` — decrypts the running best and compares it
  against plain integer arithmetic.
- `testBearingIsReadableOnlyByItsBuyer` — buyer `isAllowed`, rival not.
- `testSettlementRejectsNonHit` / `testSettlementRejectsForgedSignatures`
- `testRivalCannotSettleWithTheFindersAttestation`
- `testTwoHuntersHitTheSameCellOnlyTheFirstSettles` — both hit, one bounty, loser unpaid.
- `testStaleAttestationFromAnEarlierRoundCannotSettle`
- Frontend: the public feed never carries a bearing direction; post-hunt intel is
  reconstructed from public data rather than decrypted; failure copy never leaks calldata.

## Known limitations

- **Credits and probe budgets are Sybil-bypassable.** Starter credits and per-hunter limits are
  keyed on `msg.sender`, so anyone can generate wallets for unlimited probes. Acceptable for
  play-money hunts; it could not support real stakes or a competitive leaderboard without
  identity or a cost floor.
- **A probe takes 8–11 seconds** end to end, dominated by covalidator attestation.
- **The faucet is best-effort.** It funds only zero-balance wallets and is rate limited per
  connection and per hour, but it is not Sybil-proof.
- **Warmer/colder is revealed publicly per probe**, which is deliberate — that trade is the
  game — but it does leak a monotone signal about each hunter's progress.
- **Rival trace is inference, not a confidential query.** The feed shows which way a rival
  moved *after* buying intel, computed from public origins and public probe cells. It never
  reads their bearing. A genuine confidential rival-distance query is not built.
- **The post-hunt intel reveal is a reconstruction.** After settlement the coordinate is
  public, so any bearing can be recomputed from its public origin. Nothing is decrypted out
  of another player's wallet, and nothing is revealed before settlement.
- **Intel licensing is implemented and tested but not deployed.** `listIntel` / `licenseIntel`
  re-grant `e.allow` on a bearing ciphertext in exchange for AZ, with 14 passing tests. It is
  absent from the live contract because deploying it would reset every vault and orphan the
  settlement evidence in `evidence/`.
- **No sector scans or player-created vaults.** Designed, not built.

## Future work

Deploy the intel-licensing market so a bearing's access can be resold between players. Sector
scans for higher-resolution private queries. Rival trace as a genuine confidential query
rather than public inference. Player-created vaults, so a hider can try to build a secret that
survives the crowd's information budget.
