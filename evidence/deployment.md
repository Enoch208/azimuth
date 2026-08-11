# AZIMUTH — onchain evidence (Base Sepolia, chain 84532)

> Snapshot taken at block **45338443**, chain time **1786445174** (2026-08-11T10:46:14Z).
> Live state moves; re-read the contract for current values.

| Item | Value |
|---|---|
| AzimuthGame | `0x60948d993B9c4F12982F155f36d049F995602a89` |
| Explorer | https://sepolia.basescan.org/address/0x60948d993B9c4F12982F155f36d049F995602a89 |
| AzimuthCallsigns | `0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19` |
| Inco Lightning | `0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624` |
| Owner | `0x2F600aeB462b6bc914fD047Ea77Cc62e892BDB79` (separate key; never on the web server) |
| Faucet / keeper | `0xA69C2e36d7fd2e3834eE274Aa7B12bdBDA304b07` (not the owner) |

## Vault state at block 45338443

| # | Name | Bounty | Round | Status | Probes this round |
|---|---|---|---|---|---|
| 1 | FIRST SIGNAL | 500 | round 2 | Active | 0 |
| 2 | DEAD RECKONING | 1500 | round 1 | Active | 0 |
| 3 | BLACK WATER | 2200 | round 1 | Active | 0 |
| 4 | THE ABYSS | 4000 | round 2 | Active | 0 |
| 5 | ZERO BEARING | 8000 | round 1 | Active | 0 |


## Two-wallet private bearing — PRD 9.4

Run against this deployment:

```
wallet A : 0x2Cb47e318702cf32cbB07FBc2Ed73CF2cbB9F001
wallet B : 0xcCDC13000a01905431D62d08c6543DE101415046

A buys an AZIMUTH scan on vault 3
  tx     : 0x5f8d1c8e2ac964cb5f9b8d1a3eb7e237fb7e5d733a1126173b4a677748250fc4
  handle : 0x8ff1b15711fe0858bca74e73cbb1be6f848bc1d32f049c64ef7bb35f55c90800

A decrypts its own bearing   ->  W
B attempts the same handle   ->  DENIED: Failed to decrypt handles

What B can see publicly:
  0x2Cb47e…F001 bought intel at (28,28)
  -> the purchase is public, the direction is not
```

Same ciphertext handle, two wallets, two different outcomes. The access control is
enforced by Inco's covalidators, not by the interface.

## Gameplay is onchain, not simulated

A probe clicked in a browser produced real contract state:

```
[wallet] eth_sendTransaction -> ok 2551ms
hunterState(vault 2, 0x4e3c…8D63) -> probes=5, joined=true
```

## Fee sponsorship

```
contract balance at block 45338443 : 1976000000000000 wei
```

Inco charges 1e12 wei per encrypted-input/rand operation and draws it from the
contract, not the player. Players pay L2 gas only.

## Attestation latency (measured)

```
attestedReveal    10.4 s / 11.3 s
attestedDecrypt    8.4 s
```

The interface narrates this wait as a four-step ladder (sign -> signal locked -> verifying ->
revealing) rather than hiding it behind a spinner.

## Activity feed cost, and what it took to make it usable

Every probe outcome is a ciphertext that has to be attested before it can be read, and the
cost is linear in probes. Measured on this deployment, blocking on all of them first:

```
vault 1, 5 probes : nothing on screen for  49 s
vault 3, 9 probes : nothing on screen for 117 s
```

At twenty probes the feed would have been unusable. The loader now emits every move from
the public event log immediately and fills outcomes in as each attestation lands, and
attested handles are cached for the session. Same vault, same nine probes:

```
first paint with all nine moves listed :   3.1 s
all outcomes decrypted                 :  62.2 s
second visit (cache warm)              :   1.0 s
```

Rows that have not resolved yet say "decrypting result…" rather than guessing.

## What a failed move used to look like

Base dropped one probe mid-hunt. The panel kept the previous result as its heading and
printed the raw viem error underneath, calldata and all:

```
Colder
An unknown RPC error occurred. Request Arguments: chain: Base Sepolia (id: 84532)
from: 0xA69C2e36…04b07 to: 0x60948d99…602a89 data: 0xf679028800000000000000…
```

A player reads that as "my probe worked and it was colder". It did not work. Failures now
own the heading and are written for a person, with the raw string never reaching the screen:

```
Could not reach Base
The network dropped the request before it was sent. Nothing was spent — try the cell again.
```

Seven failure classes are mapped (cancelled, no gas, no AZ, probe cap, expiry, busy wallet,
timeout) and covered by tests that assert no calldata survives into the copy.

## Source of the live bytecode

`evidence/deployed-source/AzimuthGame.deployed.sol` is the exact source behind
`0x60948d99…602a89`. The working copy in `contracts/src` has since gained an intel-licensing
market that is **not deployed**; the snapshot compiles and passes all 54 pre-licensing tests,
so the deployed contract remains reproducible.

## Exact hit, settlement, bounty and reveal — PRD 9.3

A solver played vault 1 (FIRST SIGNAL) using only the public warmer/colder signal,
narrowing 4,096 candidate cells to 2 in eleven probes:

```
  3  probe (31,15)  colder  candidates left: 576
  4  probe (31,27)  warmer  candidates left: 384
  5  probe (31,25)  warmer  candidates left: 192
  6  probe (31,24)  colder  candidates left: 64
  7  probe (32,25)  warmer  candidates left: 32
  8  probe (47,25)  warmer  candidates left: 24
  9  probe (51,25)  warmer  candidates left: 14
 10  probe (56,25)  colder  candidates left: 4
 11  probe (52,25)  HIT     candidates left: 2
```

Settlement:

```
winning probe tx : 0x752468c49d8bc142c5533f2cae8e8454cf880918cd7bb0563345401e911418f1
settle tx        : 0x6664abd153170cdbd546193676e86a643d730aeccc857cf7c1f5dcd1db740001  (status 0x1)
credits          : 478 -> 978        (+500 AZ bounty)
vaultsFound      : 1
vault 1 status   : 2 (Found)   finder 0xAe1540cDBb015EbBC9d1BFF5DeDCDED656D9DC09

COORDINATES REVEALED: (52, 25)
winning probe was   : (52, 25)
```

Coordinates that no key held are now public, and they match the winning cell exactly.

Two timing behaviours worth knowing:

- Reading `credits` immediately after the settle receipt returned a stale value. The
  bounty had paid; the RPC had not caught up.
- `attestedReveal` on the freshly revealed coordinates first failed with `acl disallowed`.
  The reveal needs a few seconds to propagate to the covalidator ACL. The client now
  retries for up to 18 seconds.

The game is also demonstrably winnable inside its probe budget: 11 of 24 allowed probes.

## A second hunt, played entirely through the interface — vault 3

The first settlement was driven by a script against the contract. This one was played by
clicking cells in the browser, so it exercises the product rather than the ABI.

```
BLACK WATER (vault 3, round 2), 20 probes allowed, solved in 13
  (0,0)    warmer   4096 candidates
  (0,63)   warmer   2048
  (0,32)   warmer   1024
  (0,46)   warmer    512
  (63,40)  warmer    256
  (32,40)  colder    128
  (48,40)  warmer     64
  (48,46)  warmer     32
  (48,45)  warmer     16
  (48,44)  colder      8
  (54,45)  warmer      4
  (53,45)  warmer      2
  (52,45)  VAULT FOUND 1
```

Settlement, read back from the contract afterwards:

```
vault 3 status : 2 (Found)
finder         : 0xA69C2e36d7fd2e3834eE274Aa7B12bdBDA304b07
settledAt      : 1786456354
credits        : 440 -> 2640      (+2200 AZ bounty)
vaultsFound    : 1
COORDINATES    : (52, 45)  — the winning cell exactly
```

Two failures happened along the way and both are worth recording. The hit landed on chain
but settlement did not complete in the same session, leaving the vault Found-by-nobody with
an unclaimed bounty; the interface has a recovery banner for exactly this, and the vault was
settled from it afterwards. Separately, reloading that vault re-attested all thirteen probes
from scratch, which is what prompted sharing one attestation cache between the activity feed
and the hunt client.

## Two hunters, four sealed bearings, one winner — vault 2

Played in two browsers against the live contract. Both hunters bought the maximum two
AZIMUTH scans, so four ciphertexts were sealed to two different wallets during the hunt.

```
vault 2 status : 2 (Found)
finder         : 0x2Fd18915dD1a8Da60DC85EBEae4890EB909b9147  (shafe)
settledAt      : 1786458272
probes / scans : 31 / 4  across both hunters
shafe credits  : 1904        vaultsFound: 1
COORDINATES    : (14, 10)
```

After settlement the interface reconstructs every sealed bearing from the now-public
coordinate and each scan's public origin:

```
shafe  from C6 · 20, 44   ^ North
enoch  from F3 · 44, 20   < West
```

Checked by hand against the contract's own octant rule (tan 67.5 = 41/17):

```
shafe  dy=34 dx=6   34*17 >= 6*41   -> vertical   -> North   (secretY < y)
enoch  dx=30 dy=10  30*17 >= 10*41  -> horizontal -> West    (secretX < x)
```

Nothing was decrypted out of either wallet to produce this. The reveal is a recomputation
from public values, which is why it can show a rival's bearing without breaking the promise
that held during the hunt.

## What the public signal gives away — measured

Warmer/colder is relative to each hunter's *own* closest probe, but both the cell and the
answer are public. A latecomer who tracks every hunter's running best separately can
therefore reuse the entire board's history without paying for any of it.

Measured on vault 2, round 2. After two hunters had spent 17 probes between them, a third
reader replayed the public record and, before spending a single probe of its own:

```
4096 candidates -> 61 consistent with the whole public record
```

98.5% of the field eliminated for free. This is a direct consequence of the public/private
split the game is built on rather than a defect, but it means probing first is strictly worse
than probing second, and a hunt with enough participants can be finished by someone who
contributed nothing. Worth watching in playtesting: if players notice, they stall.

The private bearings are unaffected — nothing in the public record narrows them, which is
exactly the asymmetry the game is trying to sell.

## Adversarial cases covered by tests

`forge test` runs 54 tests across three suites. The adversarial suite pins the cases
where a confidential game is most likely to leak or double-pay:

| Case | Test |
|---|---|
| Two hunters hit the same cell; only the first settles | `testTwoHuntersHitTheSameCellOnlyTheFirstSettles` |
| A rival wallet reads someone else's bearing handle | `testBearingIsNotReadableByAnotherWallet` |
| Bearing purchased past the per-vault cap | `testBearingPurchaseStopsAtTheVaultLimit` |
| Probe or scan lands after expiry with budget left | `testProbeAfterExpiryIsRejectedEvenWithBudgetLeft` |
| Keeper respawns a vault twice | `testRespawnTwiceInARowIsRejected` |
| Attestation from a previous round replayed | `testStaleAttestationFromAnEarlierRoundCannotSettle` |
| One hunter settles with another's attestation | `testSettlementRejectsAnotherHuntersAttestation` |
| Callsigns: multi-byte unicode, padding spaces, length edges | three `testCallsign*` cases |
| Starter credits farmed across vaults | `testStarterCreditsCannotBeFarmedAcrossVaults` |

Frontend logic has 39 vitest cases, including that the public activity feed never
carries a bearing direction and that post-hunt intel is *reconstructed* from public
coordinates rather than decrypted from anyone's wallet.
