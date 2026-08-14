# AZIMUTH — onchain evidence (Base Sepolia, chain 84532)

Every value below was read back from Base Sepolia and the Inco covalidator on **13 August
2026**. Nothing here is simulated. Live state moves; re-read the contract for current values.

| Item | Value |
|---|---|
| AzimuthDaily | `0x86C59B978B14bc8B2914A70548baAB2700bd58d6` |
| Explorer | https://sepolia.basescan.org/address/0x86C59B978B14bc8B2914A70548baAB2700bd58d6 |
| Deploy transaction | `0xc34bcfca57d1b0f8d98ef3cd712d59d64bad231f038ee76c594dc0c9226d2aa0` (block 45429025) |
| AzimuthCallsigns | `0x14EFc65668aFEAB2De1DfF8D8a88b8EE5F357f19` |
| Inco Lightning | `0x4b9911b0191B0b6a6eA8F2Ed562e20Cff5AC8624` |
| Keeper / faucet | `0xA69C2e36d7fd2e3834eE274Aa7B12bdBDA304b07` (never an owner key) |

Reproduce any hunt below with:

```bash
cd web && node scripts/play-hunt.cjs --key 0x... --digs 3,4 7,7 --guess 5,5
```

## A rival cannot read your answer — PRD 9.4

The strongest claim this project makes, run against the live deployment. Wallet A dug the tile
that happens to hold the treasure. The event and the ciphertext handle are public: anybody
watching the chain has both. Only the answer is private.

```
public event   Dug(day 20678, hunter 0xb923A6fC3Fa1a0b784D34285cF4f020C5CFe3e50, tile (10,0))
public handle  0x50bd1922b6895424a2173ae0cb79e2134a0a4c8d81769a92f910a8b5b6110800
               anyone can read both of the lines above

wallet A (brimstone, the digger)
  decrypt -> FOUND

wallet B (quill, a rival on the same board)
  decrypt -> DENIED: Failed to decrypt handles
```

This is the game working. A rival can see that brimstone opened tile (10,0) and stopped
digging. Without the encryption, that pair of public facts *is* the treasure's location, and
the day would be over for everyone still playing.

## Nothing public names a winner while the day runs

Read at 13:45 UTC on 13 August, hours after two hunters had already dug the treasure up, and
again at 00:00 UTC as the day closed with a seventh hunter on the board:

```
13:45 UTC   day 20678  hunters=6  finders=0  opened=true  revealed=false
00:00 UTC   day 20678  hunters=7  finders=0  opened=true  revealed=false
```

`finders` stayed at zero for the whole day, with four hunters holding a find the chain would
not name. Scores register after midnight, because a public finder during the day points
straight at the treasure.

## A sealed guess, end to end

Six digs spent without finding it, then one tile encrypted in the client and compared against a
coordinate the contract cannot read:

```
seal (10,0)  RIGHT
  tx       0xf441a3a7043937af7ad8f96e44fc4004e082de88ae1b777b065526a8cdde44c1
  tile     ciphertext 0x0000000260ac6525fbf084c38a2c8065…  (1316 bytes, encrypted in the browser)
  verdict  handle 0x3cb564a28df2b97061d3d6cae5434d813932ad69d09724907167d2f7c2240000
```

Two more sealed guesses on the same day:

| Hunter | Guess | Verdict | Transaction |
|---|---|---|---|
| corvid | (10,0) | right | `0x68b6697b5367d384b12a74347402b9df55057d0525fd12872f172a627fd05778` |
| marlow | (0,10) | wrong | `0x7cd824c3743000e1ccaeb6d1a237ad2f6f23d72101d1d6c7829b591f5cd730f1` |

The verdict is `e.allow`-ed to the guessing wallet alone. Neither the tile nor the result is
readable by anyone else until `revealTrail` opens them after midnight.

## The temperature ladder, verified against a known treasure

Day 20678's treasure sits at (10,0). Every answer below came back encrypted and was decrypted
by the wallet that earned it. `temperature = (chebyshev + 1) / 2`.

| Tile | Chebyshev to (10,0) | Expected | Returned |
|---|---|---|---|
| (10,0) | 0 | FOUND | FOUND |
| (9,1) | 1 | BURNING | BURNING |
| (8,3) | 3 | HOT | HOT |
| (7,0) | 3 | HOT | HOT |
| (5,5) | 5 | WARM | WARM |
| (2,2) | 8 | COLD | COLD |
| (0,0) | 10 | FREEZING | FREEZING |

## The first rollover, and the day it settled

Day 20678 closed at 00:00 UTC on 14 August and opened at 00:11. Final standings, exactly as the
recap renders them:

| Rank | Hunter | Result |
|---|---|---|
| 1 | kestrel | found it on dig 2 |
| 2 | brimstone | found it on dig 4 |
| 3 | corvid | six digs missed, sealed guess K1 — right |
| 4 | enoch | six digs missed, sealed guess K1 — right |
| 5 | enochox2 | six digs, closest one tile — BURNING on the last |
| 6 | quill | three digs, walked away |
| 7 | marlow | six digs missed, sealed guess A11 — wrong |

Six of these were seeded by the author so the first reveal on this deployment had a populated
board; they are scripted hunts, not organic players. `enochox2` played it live.

Only `enoch` settled its find on chain, so `finders` reads 1 rather than 4: the throwaway keys
behind the seeded wallets were discarded after the hunts were played. The standings above do
not depend on that — they are derived from the revealed trails themselves, not from claims.

The claim that did settle exercised the whole confidential path:

```
encrypted found flag decrypts to: true
SETTLED via verifyDecryption  tx 0x74c13c5f26cd06946fa305782e5e38afc31293934a8e4991a923ac82b458d919
day 20678: hunters=7 finders=1
```

Sample dig transactions from `enoch`'s hunt:

```
dig (0,0)  FREEZING  0x1403ad1c64b0bec4aa07d0572fe443f7a3638bfc9afaf8cdf6d86bb63472a5e8
dig (2,2)  COLD      0x18284f83be84cef9ac49ba6784a0c2fa5f8b95411ba1b1454780419de5a43744
dig (4,4)  WARM      0x9e782e21afbd38b992415d7f71ec9e479b208f95907fb36b7503dd1eeb3fc1d6
dig (6,6)  WARM      0x77e8df53182c6608195b5235bfeb179eae8ead94a7e8fff864eb3879d2bdfd7e
dig (8,8)  COLD      0x453110fb51c460840f4d34e52fcc0d53fa6f8d6675a4f3927725f4b9fee82c88
dig (10,10) FREEZING 0x0da48544c4a0b721f89cfb24248a240e51583d50ad2e5152c2fe64f2720c0e89
```

## Timing

```
confidential answer, steady state   10–12 s
first answer on a fresh contract    67–71 s   (covalidator warming to a new deployment)
```

## The keeper

`revealDay` is permissionless, but the project runs a GitHub Action at 00:05 UTC. The scheduled
run for the first real rollover did not fire on time — GitHub's cron queue is heavily contended
at the top of the hour — so the workflow was dispatched manually at 00:10:

```
run 31756474252 -> {"day":20678,"opened":true,"trails":4,"alreadyOpen":3,"failed":0,"hunters":7}
run 31756828538 -> {"day":20678,"opened":true,"trails":3,"alreadyOpen":4,"failed":0,"hunters":7}
```

The second run exists because the first exposed a real bug. The sweep skips a trail it can
already read, and it was asking about only the first of a hunter's six ciphertexts. A reveal
propagates unevenly: one trail came back with digs one and four public and the rest sealed, and
that trail was marked done. The preflight now reads every handle a hunter left and only skips
when all of them answer. After the second run, all seven trails and all three sealed guesses
decrypt publicly.

A sweep that leaves anything sealed answers 500, so a bad run goes red rather than quietly
green.
