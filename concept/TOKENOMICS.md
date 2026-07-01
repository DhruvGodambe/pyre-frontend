# PYRE — Tokenomics

> All parameters locked. Reference: the deployed smart contract (github DhruvGodambe/pyre-protocol).

---

## Token

| Parameter | Value |
|---|---|
| Name | Pyre |
| Ticker | $PYRE |
| Chain | Ethereum mainnet |
| Standard | ERC-20 (hook-minted) |
| Hook | Uniswap V4 (ETH/$PYRE pair) |
| Supply cap | 1,000,000,000 (1B) |
| Genesis supply | 0 |
| Team allocation | 0% |
| Pre-sale / VC | 0% |
| Minting | Hook-only, inbound ETH swaps |

No $PYRE exists before the first swap. Supply grows from actual demand and contracts from decay.

---

## Token States

| State | Decay | Yield | Pyre Acolyte |
|---|---|---|---|
| **Liquid** | Yes — epoch rate | None | Not affected |
| **Staked** | 0% | Yes — proportional by staked weight | Not affected |
| **Dripping** | Yes — epoch rate | None | Not affected |

Pyre Acolyte is earned by burning, not staking. LP positions decay at the same epoch rate as liquid wallet tokens.

---

## Decay & Halving Schedule

Decay is computed lazily via a global scaling factor — no per-hour transactions. Effective balance = raw balance × current scaling factor. Staked tokens are excluded from the scaling factor reduction.

**Era 0 survival rates (initial 0.45%/hr):**

| Timeframe | Tokens remaining |
|---|---|
| 1 hour | 99.55% |
| 24 hours | ~89.7% |
| 7 days | ~47% (drip window) |
| 30 days | ~3.9% |

**Halving schedule:**

| Era | Epochs | Rate | Daily loss | Duration |
|---|---|---|---|---|
| 0 | 0–2,000 | 0.450%/hr | ~10.4% | Day 0–83 |
| 1 | 2,000–4,000 | 0.225%/hr | ~5.2% | Day 83–166 |
| 2 | 4,000–6,000 | 0.113%/hr | ~2.6% | Day 166–249 |
| 3 | 6,000–8,000 | 0.056%/hr | ~1.3% | Day 249–332 |
| 4 | 8,000–10,000 | 0.028%/hr | ~0.67% | Day 332–415 |
| 5 | 10,000+ | 0.014%/hr | ~0.34% | Day 415+ |
| Floor | — | 0.010%/hr | ~0.24% | permanent |

Each era lasts ~83 days — halving milestones create recurring community events and natural marketing moments.

---

## The Drip Exit

Unstaking initiates a 7-day linear return of tokens during which decay continues at the current epoch rate. No yield accrues during the drip. Loss depends on which era the protocol is in:

| Era | Rate during drip | 7-day loss |
|---|---|---|
| 0 | 0.450%/hr | ~53% |
| 1 | 0.225%/hr | ~31% |
| 2 | 0.113%/hr | ~17% |

The exit cost decreases meaningfully as the protocol matures — rewarding patience, not punishing late participants permanently.

---

## Pyre Acolyte — Burn to Mint

The Pyre Acolyte ERC-721 is earned by permanently burning $PYRE. Burns accumulate across multiple transactions — no single burn needs to meet the full threshold. When a wallet's cumulative total crosses 10,000 $PYRE burned, a Pyre Acolyte mints automatically. Subsequent burns upgrade the stage automatically.

**No hard cap.** Any wallet that reaches the threshold receives a Pyre Acolyte, forever.

**Stage thresholds (cumulative burn weight — same 4 thresholds on both tracks):**

| Stage | Name | Cumulative Weight | Normal Yield Multiplier | LP Yield Multiplier |
|---|---|---|---|---|
| 1 | EMBER | 10,000 | 1× | 2× |
| 2 | FLAME | 75,000 | 1.5× | 3× |
| 3 | FORGE | 150,000 | 2× | 4× |
| 4 | PYRE | 300,000 | 3× | 6× |

**PYRE is the top tier — there is no 5th tier.** The tier multiplier is a **yield multiplier on STAKED $PYRE** (Model B): your pool share = `staked × tierMult`, and `staked == 0` earns nothing. Burning alone earns nothing.

**Two burn paths, tracked as separate tracks:**

| Path | What is burned | Stages | Reward | Visual |
|---|---|---|---|---|
| Normal burn | $PYRE only | EMBER → FLAME → FORGE → PYRE | tier multiplier 1× / 1.5× / 2× / 3× | Standard Pyre Acolyte SVG |
| LP burn | $PYRE paired with $ETH, both locked in the pool permanently | EMBER → FLAME → FORGE → PYRE | tier multiplier 2× / 3× / 4× / 6× (2× a normal Acolyte of the same tier) | Gradient overlay at every stage |

The two tracks share one collection and the same four thresholds, but progress **independently** — Normal-burn weight and LP-burn weight are counted on separate tracks. A user picks a path and can switch between them. LP yields **2× a normal Acolyte of the same tier** (Ember 2×, Flame 3×, Forge 4×, Pyre 6×). Weight is denominated in underlying units (pre-scaling factor). Early burners receive more weight per token because the scaling factor is higher at launch.

**Immolate — a prestige, not a tier:** reaching PYRE unlocks the **Hall of the Immolated**. In the Hall, the **Ascend Rite** burns **another 100,000 $PYRE** (400,000 cumulative total) and grants the **Immolate glyph**: a prestige and visual distinction on the Acolyte NFT with **no yield bonus** (cosmetic only). The permanent maximum yield is therefore **LP Pyre = 6×**. (A temporary whitelist/quest +20% (1.2×), 7-day, can stack briefly on top for ~7.2×.)

> ⚠️ **v2 is the new target.** The currently **deployed** contracts still implement the old model (LP = +20% yield flag via `Acolyte.LP_BURN_BONUS`; Immolated as a 5th rank +20% via `ImmolatedGate.immolate()`; unified single-track weight in `PyreStaking._calculateWeight`). Moving to the v2 model above (separate LP track, LP = 2× tier, cosmetic Immolate) requires contract changes.

**Generative trait system — ⚠️ NOT LOCKED (one candidate; static-per-stage is the other):**
- A seed is generated at EMBER mint from tokenId + block data and stored permanently. All trait reveals at every stage use this same seed — the final PYRE form is determined at first mint.
- EMBER: no generative traits — hardcoded silhouette, generative fire coloration only (from seed)
- FLAME: 1 trait unlocks
- FORGE: 2 traits total (FLAME trait retained + 1 new)
- PYRE: 3 traits total (all prior retained + 1 final unlock)
- LP gradient overlay and Immolated glyph are rendered as additional layers on top of whatever stage/traits the NFT holds.

**LP burn fee capture — ⚠️ MECHANISM UNDER REVISION (2026-06-15):** The original
description here ("burn LP shares, liquidity stays in the pool, hook captures the
orphaned fees, unlike YUGEN") rests on two errors:

1. **Uniswap V4 mints no fungible LP tokens** — there are no "LP shares" to burn to
   `address(0)`. A position is an ERC-721 NFT. Keeping liquidity in the pool *and*
   capturing its fees requires an **NFT-locker** contract, not a burn.
2. **YUGEN has no LP or fee mechanism to out-do.** The verified on-chain Yugen
   (`research/yugen-onchain/`) is a negative-rebase ERC-20 — it does no LP burning and
   captures no fees. The "design advantage over YUGEN" claim was comparing against a
   mechanism Yugen never had. PYRE's real Yugen lineage is the **S(t) decay + staking
   protection + Pyre Acolyte burn-weight**, which PYRE already implements.

The intended "permanent liquidity + fee capture into the yield pool" outcome is still
achievable, but only via the locker pattern. The path (locker vs. a simpler
exit-and-burn-proceeds with no ongoing fees) is **not yet locked**.

---

## Fee Structure

Two fee layers. Neither triggers warnings on any trading platform — hook and pool level only, not ERC-20 token level.

| Layer | Rate | Applied to |
|---|---|---|
| Hook fee | 4% | Every swap, both directions |
| Pool swap fee | 1% | Every swap, both directions |
| **Total effective** | **5%** | **Both buy and sell** |
| Launch fee (buy only) | +20% at launch, declining linearly to 0 over 24 hours | Buy side only |

**Buy side (ETH in):** fees collected in ETH → yield pool.
**Sell side ($PYRE in):** fees collected in $PYRE → **100% permanently burned.** Never distributed.

**Launch fee:** applies to buys only. At the moment of deployment the buy-side hook fee is 4% + 20% = 24%, plus 1% pool fee = 25% total. The extra 20% declines linearly to 0 over exactly 24 hours. All launch fee revenue routes to the yield pool only — the team takes no cut of the launch fee.

## Fee Distribution

```
ETH fee revenue (100%)
├── Team treasury     — 20%
└── Yield pool        — 80%
    ├── Stakers         proportional to staked balance
    └── Pyre Acolytes    proportional to burn weight × stage multiplier

Sell-side $PYRE fees  — 100% burned
Burned LP fees        — 100% to yield pool
```

No fixed split between stakers and Pyre Acolyte holders — determined dynamically by relative weight.

**Stage multipliers on Pyre Acolyte yield weight:**

| Stage | Multiplier | Effect |
|---|---|---|
| EMBER (1) | 1× | Baseline |
| FLAME (2) | 1.5× | 50% more yield weight per burned unit |
| FORGE (3) | 2× | 2× more yield weight per burned unit |
| PYRE (4) | 3× | 3× more yield weight per burned unit |

**ETH APY at $1M daily volume (participants' 80% share = $24,000/day = $8.76M/year):**

| TVL Staked | ETH APY |
|---|---|
| $1M | 876% |
| $5M | 175% |
| $10M | 87.6% |
| $20M | 43.8% |

Real yield only. Denominated in ETH from actual trading activity. No printed tokens, no inflation.

---

## Token Sinks

All burns are permanent. Tokens removed from supply are never re-minted.

| Sink | Rate / Trigger |
|---|---|
| **Liquid decay** | Epoch rate on all unstaked + LP tokens — continuous |
| **Drip decay** | Epoch rate during 7-day exit window |
| **Pyre Acolyte token burn** | Minimum 10,000 $PYRE cumulative to mint EMBER — permanent |
| **Pyre Acolyte LP burn** | ⚠️ No LP shares exist in V4 — implemented via NFT-locker or exit-and-burn (path open) |

Liquid decay is the dominant sink. It is continuous, cannot be paused, and affects every uncommitted token in existence — including LP positions.

---

## Token Sources

| Source | Mechanism |
|---|---|
| **Hook minting** | The only source. Inbound ETH swaps cause the hook to mint $PYRE proportional to ETH volume × BASE_RATE × S(t). Cap: 1B total. |

S(t) is a global scaling factor that decays from 1.0 over time, creating early-mover advantage for buyers. The same ETH volume mints fewer tokens as time passes.

---

## Supply Dynamics

Because the only source is hook minting and the dominant sink is continuous decay:

1. **Early phase**: minting outpaces decay as new buyers enter — supply grows
2. **Equilibrium**: minting rate matches decay rate — supply stabilizes
3. **Late phase**: halvings slow minting; decay dominates — supply contracts
4. **Terminal**: supply approaches zero asymptotically, bounded by the 0.01% floor

As halvings progress, the floor rate of 0.01%/hr creates an extremely slow terminal decay. The protocol is designed to burn for centuries.

---

## Seed LP

- Funded by the team at launch using their own ETH
- Zero $PYRE team allocation used
- Liquidity permanently locked — ⚠️ in V4 this means the **position NFT** is locked
  (held by a locker / sent to a dead address), not "LP tokens burned to address(0)"
  (no LP tokens exist in V4).
- External LPs may add liquidity organically
- Seed LP creates the permanent trading floor — the pool cannot be drained

---

## Locked Parameters

- [x] Supply cap: **1,000,000,000 $PYRE**
- [x] Initial decay rate: **0.45%/hr**
- [x] Halving interval: **2,000 epochs (~83 days)**
- [x] Decay floor: **0.01%/hr**
- [x] Drip duration: **7 days**
- [x] Drip loss (Era 0): **~53%**
- [x] No yield during drip: **confirmed**
- [x] Pyre Acolyte mint: **burn-to-mint, 10,000 $PYRE cumulative**
- [x] EMBER threshold: **10,000 $PYRE burned**
- [x] FLAME threshold: **75,000 $PYRE burned**
- [x] FORGE threshold: **150,000 $PYRE burned**
- [x] PYRE threshold: **300,000 $PYRE burned**
- [x] Normal-burn stage multipliers: **1× / 1.5× / 2× / 3×**
- [x] LP-burn stage multipliers: **2× / 3× / 4× / 6×** (2× a normal Acolyte of the same tier)
- [x] PYRE is the top tier: **no 5th tier**
- [x] Pyre Acolyte hard cap: **None**
- [x] Hook fee: **4% (buy and sell)**
- [x] Pool swap fee: **1%**
- [x] Total effective fee: **5% each way**
- [x] Launch fee: **+20% on buys at launch, declines linearly to 0 over 24 hours — 100% to yield pool**
- [x] Team cut: **20% of ETH fee revenue**
- [x] Sell-side fee: **100% burned**
- [x] Yield split: **fully proportional by weight, no fixed %**
- [x] LP burn reward: **2× the tier multiplier on a separate LP track** (Ember 2× / Flame 3× / Forge 4× / Pyre 6×)
- [x] Immolate: **prestige, not a tier** — Ascend Rite burns another 100,000 $PYRE (400,000 cumulative) for the Immolate glyph, **cosmetic, no yield bonus**
- [x] Permanent max yield: **LP Pyre = 6×** (temporary 1.2× whitelist boost can stack to ~7.2×)
- [x] v2 model: **target — deployed contracts still implement the old LP +20% / 5th-rank Immolated model; requires contract changes**
- [x] NFT: **single type (Pyre Acolyte), tradeable ERC-721** · [ ] rendering approach **OPEN** (static-per-stage vs on-chain generative SVG)
- [x] Staker visual identity: **None — staking is financial only**
- [x] Team allocation: **0%**
- [x] Seed LP: **permanently locked** (V4: position NFT locked, not "LP tokens to address(0)")
- [x] Chain: **Ethereum mainnet**
