# PYRE — Core Concept & Mechanics

> DEV_BRIEF.md is the authoritative developer spec. If anything conflicts, DEV_BRIEF.md wins.

---

## The Premise

PYRE is a Uniswap V4 hook project built around one inescapable truth: uncommitted tokens burn.

Every swap through the PYRE hook mints $PYRE. Every $PYRE token that sits unstaked loses 0.45% of its value every hour — continuously, without mercy. The only protection is commitment: stake to preserve your balance and earn yield, or burn to forge a Fire Spirit and earn perpetual yield forever.

There is no neutral position. Every holder is either feeding the pyre or becoming part of it.

---

## The V4 Hook — Mint Only

Every inbound ETH swap through the PYRE V4 hook is a minting event. The hook mints $PYRE to the swapper proportional to ETH volume × BASE_RATE × S(t), where S(t) is the global scaling factor that decays over time. The same ETH volume mints fewer tokens as time passes — early buyers are disproportionately rewarded.

The hook also collects swap fees and routes them to the staking and Fire Spirit yield pools.

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

## The Fire Spirit — Burn to Mint

The only way to receive a Fire Spirit is to burn $PYRE permanently.

Burns accumulate across every transaction. No burn is ever wasted. When a wallet's cumulative total crosses 10,000 $PYRE burned, a Fire Spirit ERC-721 mints automatically. As cumulative burns continue and cross higher thresholds, the Fire Spirit evolves — its art changes, its yield weight multiplies.

**There is no cap on Fire Spirits.** Anyone who burns crosses the threshold and earns one, forever. Every new Fire Spirit holder is a new community member who has permanently committed to the protocol.

**Two burn paths:**

### Token Burn
Permanently destroy $PYRE tokens. Weight is denominated in underlying units (pre-scaling factor) — early burners receive disproportionately more weight per token destroyed, because their burn uses a lower scaling factor.

### LP Burn
Deposit ETH + $PYRE into the liquidity pool, then permanently burn the resulting LP shares. Liquidity is locked in the pool forever, deepening the permanent trading floor. LP burners receive a **20% weight bonus** on their $PYRE-equivalent value — meaning they accumulate weight faster and reach stage thresholds sooner. These Fire Spirits receive a distinct gradient overlay in their art at every stage — a permanent visible mark of the deeper commitment.

LP burners progress through the same four stages as token burners (EMBER → FLAME → FORGE → PYRE), using the same cumulative weight thresholds. The gradient overlay is the only visual distinction between the two paths at any given stage.

The locked liquidity continues generating swap fees indefinitely. Rather than losing those fees to the null address, the hook captures them and redirects them into the yield pool — distributed to all stakers and Fire Spirit holders like any other swap fee revenue. LP burners therefore contribute two permanent yield streams to the protocol: the initial burn weight, and ongoing fee generation from permanently locked liquidity.

---

## Fire Spirit Evolution

The Fire Spirit advances through four stages based on **cumulative burn weight** — applicable to both token burns and LP burns equally. Burns accumulate permanently — partial burns are saved and count toward the next stage. Both paths share one unified collection and one set of thresholds.

| Stage | Name | Cumulative Weight | Yield Multiplier | Visual |
|---|---|---|---|---|
| 1 | **EMBER** | 10,000 | 1× | Faint glow at center. The fire is catching. |
| 2 | **FLAME** | 75,000 | 1.5× | Form visible in flickering light. Detail emerging. |
| 3 | **FORGE** | 150,000 | 2× | White-hot. Almost fully revealed. |
| 4 | **PYRE** | 300,000 | 3× | The final form. The fire and the holder are one. |

LP burns count at 120% weight — an LP burn of 10,000 $PYRE-equivalent contributes 12,000 weight, reaching thresholds faster than a token burn of the same size.

> ⚠️ **OPEN DECISION (2026-06-15): art rendering is not locked.** The
> generative-on-chain-SVG description below is **one candidate**; the other is
> *static images per stage* (no seed, no generative traits). Until this is decided,
> treat the seed/trait system below as provisional. The stages, thresholds, and
> "evolves in place by burn weight" behavior hold either way. See
> `dev/DEV_BRIEF.md` §3.

**Art (candidate: fully on-chain and generative).** No IPFS. The SVG is generated deterministically from a seed locked permanently at EMBER mint — every Fire Spirit's full final form is already determined the moment it first mints, it just cannot be seen yet. The seed is derived from the tokenId and block data at mint time.

**Trait system (only applies if the generative path is chosen):**
- **EMBER** — No generative traits. The silhouette and structure are hardcoded. The fire coloration is generative (pulled from the seed at mint — e.g. warm orange, deep crimson, cold blue-white, pale gold, ashen purple). Every EMBER is structurally the same entity, uniquely colored.
- **FLAME** — 1 generative trait unlocks, drawn from the seed. Begins to define the entity's identity.
- **FORGE** — 2 generative traits total. The FLAME trait remains; a second unlocks.
- **PYRE** — 3 generative traits total. All prior traits remain; the final one unlocks. The complete realized form.

As weight accumulates and thresholds are crossed, the art updates automatically — same token ID, same seed, new traits revealed.

**On transfer**: the Fire Spirit carries its current visual stage and all unlocked traits. The new holder's accumulated burns begin at 0 — stage progression is earned, not inherited. Yield settles automatically to the seller at time of transfer.

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

The ETH yield pool is shared proportionally across all participants by weight. No fixed split between stakers and Fire Spirit holders — the ratio emerges dynamically from total weight at any given moment.

- **Staker weight** = raw staked balance
- **Fire Spirit weight** = cumulative burn weight (underlying units) × stage multiplier

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
| **Burn** | +3 | Supply reduced permanently, Fire Spirit minted, perpetual yield claimed |
| **Hold liquid** | +1 | Tokens decay slowly, no yield, no identity |
| **Sell** | −3 | Supply pressure, decay accelerates for remaining holders |

Unlike Olympus DAO's (3,3) which was enforced only by narrative, PYRE's (3,3) is mechanically enforced. Not staking isn't neutral — it is active decay. The fire doesn't wait.

---

## Anti-Gaming

| Attack | Protection |
|---|---|
| Burn dust to mint Fire Spirit | Minimum cumulative 10,000 $PYRE before mint |
| Buy → LP instead of stake | LP positions decay at the same epoch rate |
| Sell after minting Fire Spirit | Fire Spirit persists — but the seller earned it and it now trades freely |
| Rapid small burns to game weight | Weight in underlying units — each burn records actual underlying, no timing advantage beyond S(t) |
| Chainlink Automation failure | Lazy epoch evaluation on every protocol interaction |
| Large sell affecting others | Decay is time-based, not price-based |
| Drip gaming | Cannot restake until full drip is completed |
| Buy Fire Spirit on secondary market | New holder's burns begin at 0; stage multiplier on yield uses new holder's own weight |

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
| Fire Spirit mint threshold | 10,000 $PYRE cumulative burned |
| EMBER stage | 10,000 $PYRE burned |
| FLAME stage | 75,000 $PYRE burned |
| FORGE stage | 150,000 $PYRE burned |
| PYRE stage | 300,000 $PYRE burned |
| Stage multipliers | 1× / 1.5× / 2× / 3× |
| Fire Spirit hard cap | None — open access forever |
| Yield split | Fully proportional by weight — no fixed % |
| No yield during drip | Confirmed |
| LP burn weight bonus | +20% |
| NFT art rendering | **OPEN — static-per-stage vs on-chain generative SVG (see DEV_BRIEF §3). Evolves in place by burn weight either way.** |
| Team allocation | 0% |
| Seed LP | Burned to address(0) |
| Chain | Ethereum mainnet |
