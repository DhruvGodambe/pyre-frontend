# PYRE — Core Concept & Mechanics

> Reference: the deployed smart contract (github DhruvGodambe/pyre-protocol) for what's built;
> this doc is the design intent. Items marked "v2 target" below require contract changes.

---

## The Premise

PYRE is a Uniswap V4 hook project built around one inescapable truth: uncommitted tokens burn.

Every swap through the PYRE hook mints $PYRE. Every $PYRE token that sits unstaked loses 0.45% of its value every hour — continuously, without mercy. The only protection is commitment: stake to preserve your balance and earn yield, or burn to forge a Pyre Acolyte and earn perpetual yield forever.

There is no neutral position. Every holder is either feeding the pyre or becoming part of it.

---

## The V4 Hook — Mint Only

Every inbound ETH swap through the PYRE V4 hook is a minting event. The hook mints $PYRE to the swapper proportional to ETH volume × BASE_RATE × S(t), where S(t) is the global scaling factor that decays over time. The same ETH volume mints fewer tokens as time passes — early buyers are disproportionately rewarded.

The hook also collects swap fees and routes them to the staking and Pyre Acolyte yield pools.

---

## Three Token States

$PYRE exists in exactly one of three states at all times.

### Liquid
Held in a wallet without staking. Subject to decay at **0.45% per hour** initially, halving every 2,000 epochs. No yield. No identity. The fire consumes everything that doesn't commit.

### Staked
Registered in the staking contract. Completely exempt from decay — balance fully preserved regardless of elapsed time. Earns proportional share of the yield pool based on raw staked balance. No NFT — staking is a financial act, not an identity one.

### Dripping
The exit state. Unstaking initiates a 7-day linear return of tokens during which they **continue decaying**. Approximately 53% of tokens are lost during a full 7-day drip at the initial decay rate. No yield accrues during the drip. This is the entire exit cost — leaving is expensive by design.

LP positions decay identically to liquid tokens. No exemptions.

---

## The Pyre Acolyte — Burn to Mint

The only way to receive a Pyre Acolyte is to burn $PYRE permanently.

Burns accumulate across every transaction. No burn is ever wasted. When a wallet's cumulative total crosses 10,000 $PYRE burned, a Pyre Acolyte ERC-721 mints automatically. As cumulative burns continue and cross higher thresholds, the Pyre Acolyte evolves — its art changes, its yield weight multiplies.

**There is no cap on Pyre Acolytes.** Anyone who burns crosses the threshold and earns one, forever. Every new Pyre Acolyte holder is a new community member who has permanently committed to the protocol.

**Two burn paths, tracked separately:**

Normal burn and LP burn are two independent tracks. Each uses the same four thresholds (Ember 10,000, Flame 75,000, Forge 150,000, Pyre 300,000) and each progresses on its own cumulative total. You pick a path, and you can switch paths at any time. The two tracks do not pool into a single shared number.

### Token Burn (Normal)
Permanently destroy $PYRE tokens. Weight is denominated in underlying units (pre-scaling factor), so early burners receive disproportionately more weight per token destroyed, because their burn uses a lower scaling factor. A normal Acolyte earns the base tier multiplier (Ember 1×, Flame 1.5×, Forge 2×, Pyre 3×) on staked $PYRE.

### LP Burn
Deposit $PYRE paired with $ETH into the liquidity pool, both locked in the pool permanently with no withdrawal of either. The LP track is its own progression through the same four thresholds. An LP Acolyte yields **2× a normal Acolyte of the same tier**: Ember 2×, Flame 3×, Forge 4×, Pyre 6× on staked $PYRE. That doubling is the reward for the deeper commitment of locking both assets forever. LP Acolytes receive a distinct gradient overlay in their art at every stage, a permanent visible mark of the deeper commitment.

> Note: yield is earned only on **staked** $PYRE (Model B), multiplied by the tier multiplier of your chosen path. Burning alone earns nothing.

### The Immolate — a prestige, not a tier
Pyre is the top tier. There is no fifth tier. Reaching Pyre unlocks the **Hall of the
Immolated**, and in the Hall the **Ascend Rite** (`ImmolatedGate.immolate()`) burns
**another 100,000 $PYRE** (400,000 cumulative total: 300,000 to reach Pyre plus 100,000 for
the rite) to grant the **Immolate glyph**: a prestige badge and a visual distinction layered
onto the Acolyte NFT. The glyph carries **no yield bonus**, it is purely cosmetic. It is the
visible proof of the deepest commitment, not a multiplier. The Ascend Rite happens in the
Hall, not the Forge.

> **v2 target, contract change required.** The currently deployed contracts still implement
> the OLD model: LP burn as a flat +20% yield flag (`Acolyte.LP_BURN_BONUS`) on one shared
> weight, and Immolated as a claimed 5th rank granting +20% yield (`ImmolatedGate.immolate()`).
> The two separate tracks, the LP 2× tier multipliers, and the cosmetic-only Immolate glyph
> described above are the **new v2 target** and require contract changes (separate normal/LP
> tracks; LP tier multiplier = 2× the normal; Immolate = a 100K $PYRE Ascend burn in the Hall
> granting a cosmetic glyph, no yield). Conveyed to the dev directly.

> ⚠️ **MECHANISM UNDER REVISION (2026-06-15).** "Burn the resulting LP shares" does not
> work in Uniswap V4 — V4 mints **no fungible LP tokens** (a position is an ERC-721 NFT).
> The two outcomes this section promises — *liquidity stays in the pool forever* and *the
> hook captures the ongoing swap fees and redirects them to the yield pool* — are only
> achievable by locking the **position NFT** in a locker contract that collects fees to the
> yield pool. A simpler alternative (let the user exit and burn the ETH + $PYRE proceeds)
> is a pure supply burn that keeps **no** liquidity in the pool and generates **no** ongoing
> fees. Decided (2026-06-29): lock the position NFT in a locker that blocks principal
> withdrawal and sweeps fees to the single yield pool.
>
> This was originally framed as a "design advantage over Yugen." That framing was wrong:
> the on-chain Yugen has no LP or fee mechanism at all (it's a negative-rebase ERC-20).
> See `research/yugen-onchain/ANALYSIS.md`.

---

## Pyre Acolyte Evolution

The Pyre Acolyte advances through four stages based on **cumulative burn weight**. Burns accumulate permanently: partial burns are saved and count toward the next stage. The normal track and the LP track use these same four thresholds, but each progresses on its own separate cumulative total.

| Stage | Name | Cumulative Weight | Yield Multiplier | Visual |
|---|---|---|---|---|
| 1 | **EMBER** | 10,000 | 1× | Faint glow at center. The fire is catching. |
| 2 | **FLAME** | 75,000 | 1.5× | Form visible in flickering light. Detail emerging. |
| 3 | **FORGE** | 150,000 | 2× | White-hot. Almost fully revealed. |
| 4 | **PYRE** | 300,000 | 3× | The final form. The fire and the holder are one. |

The multipliers above are for the **normal** track. The **LP** track uses the same thresholds but yields **2× a normal Acolyte at every tier**: Ember 2×, Flame 3×, Forge 4×, Pyre 6×. See the LP Burn section above.

> ⚠️ **OPEN DECISION (2026-06-15): art rendering is not locked.** The
> generative-on-chain-SVG description below is **one candidate**; the other is
> *static images per stage* (no seed, no generative traits). Until this is decided,
> treat the seed/trait system below as provisional. The stages, thresholds, and
> "evolves in place by burn weight" behavior hold either way.

**Art (candidate: fully on-chain and generative).** No IPFS. The SVG is generated deterministically from a seed locked permanently at EMBER mint — every Pyre Acolyte's full final form is already determined the moment it first mints, it just cannot be seen yet. The seed is derived from the tokenId and block data at mint time.

**Trait system (only applies if the generative path is chosen):**
- **EMBER** — No generative traits. The silhouette and structure are hardcoded. The fire coloration is generative (pulled from the seed at mint — e.g. warm orange, deep crimson, cold blue-white, pale gold, ashen purple). Every EMBER is structurally the same entity, uniquely colored.
- **FLAME** — 1 generative trait unlocks, drawn from the seed. Begins to define the entity's identity.
- **FORGE** — 2 generative traits total. The FLAME trait remains; a second unlocks.
- **PYRE** — 3 generative traits total. All prior traits remain; the final one unlocks. The complete realized form.

As weight accumulates and thresholds are crossed, the art updates automatically — same token ID, same seed, new traits revealed.

**On transfer**: the Pyre Acolyte carries its current visual stage and all unlocked traits. The new holder's accumulated burns begin at 0 — stage progression is earned, not inherited. Yield settles automatically to the seller at time of transfer.

---

## Fee Structure

PYRE charges fees at two layers. Neither triggers warnings on any trading interface — both operate at the hook and pool level, not the ERC-20 token level.

| Layer | Fee | Direction | Collected in |
|---|---|---|---|
| Hook fee | 4% | Buy + Sell | ETH (buys) / $PYRE (sells) |
| Pool swap fee | 1% | Buy + Sell | ETH (buys) / $PYRE (sells) |
| **Total effective** | **5%** | **Both** | |

**Buy side (ETH in):** 5% of ETH collected → split between team and participants as ETH yield.
**Sell side ($PYRE in):** 5% of $PYRE collected → **100% burned permanently.** Sell fees are never distributed — they reduce supply directly.

**At $1M daily volume (60/40 buy/sell):**
```
ETH generated (buy side 5%):    $30,000/day  →  $10.95M/year
PYRE burned  (sell side 5%):    $20,000/day  →   $7.30M/year

Team cut (20% of ETH):           $6,000/day  →   $2.19M/year
ETH to participants (80%):      $24,000/day  →   $8.76M/year
```

## Launch Fee (Declining, Applies to Buys Only)

At launch, an additional hook fee of up to 20% is charged on buy-side swaps. This fee declines linearly to 0 over exactly 24 hours after deployment.

- **Launch moment:** total buy fee = 25% (5% base + 20% launch fee)
- **Hour 24+:** total buy fee = 5% (normal, launch fee is 0)
- **Sell side:** not affected — sell fee is always 5%
- **Revenue routing:** all launch fee revenue goes entirely to the yield pool (participants only — not the team)

```solidity
uint256 public immutable launchTime;
uint256 public constant LAUNCH_WINDOW = 24 hours;

function _launchFee() internal view returns (uint256) {
    uint256 elapsed = block.timestamp - launchTime;
    if (elapsed >= LAUNCH_WINDOW) return 0;
    return 2000 * (LAUNCH_WINDOW - elapsed) / LAUNCH_WINDOW; // 2000 = 20% in basis points, linear decline
}
// Total buy fee = base hook fee (400 bps) + _launchFee()
// All _launchFee() revenue routes to yield pool, not team
```

## Yield Distribution

The ETH yield pool is shared proportionally across all participants by weight. No fixed split between stakers and Pyre Acolyte holders — the ratio emerges dynamically from total weight at any given moment.

- **Staker weight** = raw staked balance
- **Pyre Acolyte weight** = cumulative burn weight (underlying units) × stage multiplier

```
ETH fees (100%)
├── Team treasury  — 20% (ETH)
└── Participants   — 80% (ETH), proportional by weight

Sell-side $PYRE fees — 100% burned, always
Burned LP fees       — 100% to participant yield pool
```

**ETH APY at $1M daily volume:**

| TVL Staked | ETH APY |
|---|---|
| $1M | 876% |
| $5M | 175% |
| $10M | 87.6% |
| $20M | 43.8% |

This is purely from swap fees. Price appreciation from supply decay and PYRE burn from sell fees add significant additional value on top.

---

## The (3,3) Game Theory

| Action | Score | Effect |
|---|---|---|
| **Stake** | +3 | Balance preserved, yield earned, protocol strengthens |
| **Burn** | +3 | Supply reduced permanently, Pyre Acolyte minted, perpetual yield claimed |
| **Hold liquid** | +1 | Tokens decay slowly, no yield, no identity |
| **Sell** | −3 | Supply pressure, decay accelerates for remaining holders |

Unlike Olympus DAO's (3,3) which was enforced only by narrative, PYRE's (3,3) is mechanically enforced. Not staking isn't neutral — it is active decay. The fire doesn't wait.

---

## Anti-Gaming

| Attack | Protection |
|---|---|
| Burn dust to mint Pyre Acolyte | Minimum cumulative 10,000 $PYRE before mint |
| Buy → LP instead of stake | LP positions decay at the same epoch rate |
| Sell after minting Pyre Acolyte | Pyre Acolyte persists — but the seller earned it and it now trades freely |
| Rapid small burns to game weight | Weight in underlying units — each burn records actual underlying, no timing advantage beyond S(t) |
| Chainlink Automation failure | Lazy epoch evaluation on every protocol interaction |
| Large sell affecting others | Decay is time-based, not price-based |
| Drip gaming | Cannot restake until full drip is completed |
| Buy Pyre Acolyte on secondary market | New holder's burns begin at 0; stage multiplier on yield uses new holder's own weight |

---

## Locked Parameters

| Parameter | Value |
|---|---|
| Supply cap | 1,000,000,000 $PYRE |
| Initial decay rate | **0.45%/hr** |
| Halving interval | **2,000 epochs (~83 days)** |
| Decay floor | **0.01%/hr** |
| Hook fee (buy + sell) | **4%** |
| Pool swap fee | **1%** |
| Total effective fee | **5% each way** |
| Launch fee (buy only, hour 0) | **+20% (declines linearly to 0 over 24 hours)** |
| Launch fee routing | **100% to yield pool (not team)** |
| Team cut | **20% of ETH fee revenue** |
| Sell-side fee disposition | **100% burned** |
| Staking decay | 0% |
| Drip duration | 7 days |
| Drip decay loss (Era 0) | ~53% |
| Pyre Acolyte mint threshold | 10,000 $PYRE cumulative burned |
| EMBER stage | 10,000 $PYRE burned |
| FLAME stage | 75,000 $PYRE burned |
| FORGE stage | 150,000 $PYRE burned |
| PYRE stage | 300,000 $PYRE burned |
| Stage multipliers | 1× / 1.5× / 2× / 3× |
| Pyre Acolyte hard cap | None — open access forever |
| Yield split | Fully proportional by weight — no fixed % |
| No yield during drip | Confirmed |
| LP burn yield | 2× the normal Acolyte at every tier (Ember 2× / Flame 3× / Forge 4× / Pyre 6×); separate track |
| Immolate (prestige, not a tier) | Reach Pyre → Hall of the Immolated → Ascend Rite burns +100,000 $PYRE (400,000 total) → cosmetic glyph, no yield bonus |
| NFT art rendering | **OPEN — static-per-stage vs on-chain generative SVG. Evolves in place by burn weight either way.** |
| Team allocation | 0% |
| Seed LP | Permanently locked (V4: position NFT locked) |
| Chain | Ethereum mainnet |
