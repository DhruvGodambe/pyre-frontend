# PYRE — Developer Brief

> **Authoritative spec.** This file describes the *current* architecture only.
> Where it ever conflicts with `concept/` docs, this file wins.
>
> Cleaned 2026-06-15: all superseded "OLD architecture" code was removed (it lives
> in git history / `archive/`, not inline). Every parameter and behavior below is
> the live decision. The one genuinely undecided item — Fire Spirit art rendering —
> is called out explicitly in §3 and must be resolved before that contract is built.

---

## Overview

PYRE is a Uniswap V4 hook-based protocol on Ethereum mainnet.

- Swap ETH → the hook **mints** $PYRE to the swapper, proportional to ETH volume × `BASE_RATE` × `S(t)` (a global scaling factor that decays over time, so the same ETH mints fewer tokens later).
- Liquid (unstaked) $PYRE **decays at 0.45%/hr**, halving every 2,000 epochs (~83 days), down to a 0.01%/hr floor.
- **Staking** stops decay and earns a proportional share of swap-fee yield.
- The **Fire Spirit** ERC-721 is earned by **burning $PYRE permanently** — never by holding or staking. Burns accumulate across transactions; when a wallet's cumulative burn weight crosses 10,000, a Fire Spirit mints, and further burns upgrade its stage automatically (75k → FLAME, 150k → FORGE, 300k → PYRE). No hard cap. No stage gate to burn.
- Stakers and Fire Spirit holders share **one** swap-fee yield pool, proportionally by weight. No fixed split.
  - Staker weight = raw staked balance.
  - Fire Spirit weight = cumulative burn weight (underlying units) × stage multiplier.

---

## Contract Architecture

Five contracts. One NFT type.

| Contract | Role |
|---|---|
| `PyreHook.sol` | V4 BaseHook — `afterSwap`: mint $PYRE, collect & route swap fees, tick the epoch/scaling factor. **No threshold detection, no NFT mint/burn logic.** |
| `PyreToken.sol` | ERC-20 — hook-minted, supply-capped, lazy decay via global scaling factor, halving schedule. Staked balances exempt from decay. |
| `PyreNFT.sol` | ERC-721 Fire Spirit — burn-to-mint, evolves in place by cumulative burn weight, tradeable. **Art rendering approach is an open decision — see §3.** |
| `PyreStaking.sol` | Staking vault — decay immunity, proportional yield, 7-day drip exit. Hosts the whitelist yield boost (see `whitelist-boost-spec.md`). |
| `PyreImmolated.sol` | Token-burn + LP-burn paths, Fire Spirit mint/upgrade trigger, burn-weight yield accounting. |

> **Yield pool is single and shared.** Both `PyreStaking` and `PyreImmolated`
> read from one fee pool and pay out proportionally by total weight. There is
> **no fixed staking/Immolated percentage split** — the ratio emerges from live
> weight. (Implementation note: a single shared accumulator is preferred over two
> Synthetix-style accumulators; see Open Questions.)

---

## 1. `PyreHook.sol` — Uniswap V4 Hook

**Responsibilities:**
- Mint $PYRE to the swapper on inbound ETH swaps: `amount = vol × BASE_RATE × S(t)`.
- Collect swap fees and route them (see "Fee Routing" below).
- Advance the epoch / global scaling factor (or rely on lazy evaluation + Chainlink Automation — see §"Decay").

**Key hook flag:** `AFTER_SWAP_FLAG` only.

The hook does **not** detect balance thresholds and does **not** mint or burn Fire Spirits. Fire Spirits are minted/upgraded exclusively through the burn paths in `PyreImmolated.sol`.

**Launch fee — declining buy-side tax (locked).**
An additional hook fee of up to 20% applies to **buy-side** swaps at deployment, declining linearly to 0 over exactly 24 hours. Sell-side is unaffected. **All** launch-fee revenue routes to the yield pool — the team takes no cut of it.

```solidity
uint256 public immutable launchTime;
uint256 public constant LAUNCH_WINDOW = 24 hours;

function _launchFee() internal view returns (uint256) {
    uint256 elapsed = block.timestamp - launchTime;
    if (elapsed >= LAUNCH_WINDOW) return 0;
    return 2000 * (LAUNCH_WINDOW - elapsed) / LAUNCH_WINDOW; // 2000 bps = 20%, linear decline
}
// Total buy fee = base hook fee (400 bps) + pool fee (100 bps) + _launchFee()
```

At launch moment: total buy fee = 25% (4% hook + 1% pool + 20% launch). At hour 24+: total buy fee = 5%.

**Hook address mining:** V4 hooks must be deployed at an address whose lower bits encode the permission flags. Use `HookMiner.find()` from v4-periphery before deployment.

---

## 2. `PyreToken.sol` — ERC-20

Hook-minted ERC-20. No pre-mine. Decay computed lazily via a global scaling factor.

**Responsibilities:**
- Standard ERC-20.
- Mint authority: `PyreHook` only (immutable, set once at deploy).
- Supply cap: `1_000_000_000e18` (revert on overflow).
- Lazy decay via global scaling factor; staked balances exempt.
- Halving schedule: epoch counter ticks per hour; decay rate halves every **2,000** epochs.

**Decay model (authoritative numbers):**

```
effectiveBalance(wallet) =
    isStaked(wallet)
        ? rawBalance(wallet)
        : rawBalance(wallet) * scalingFactorWAD / 1e18

Each epoch (1 hour):
    scalingFactorWAD = scalingFactorWAD * (BPS_DENOM - currentDecayRate) / BPS_DENOM
```

| Era | Epochs | Decay rate / hr |
|---|---|---|
| 0 | 0–2,000 | **0.450%** |
| 1 | 2,000–4,000 | 0.225% |
| 2 | 4,000–6,000 | 0.113% |
| 3 | 6,000–8,000 | 0.056% |
| 4 | 8,000–10,000 | 0.028% |
| 5 | 10,000–12,000 | 0.014% |
| Floor | — | **0.010%** (minimum forever) |

Rate halves every `HALVING_INTERVAL = 2_000` epochs, clamped to the `0.010%/hr` floor. The scaling factor is monotonically non-increasing.

> ⚠️ Implementer: do not reuse any earlier draft that used `2_500`-epoch halving,
> `0.25%/hr` initial decay, or a `0.005%` floor. Those were superseded. The table
> above and the Locked Parameters table at the bottom are authoritative.

---

## 3. `PyreNFT.sol` — ERC-721 (Fire Spirit)

One NFT type. Tradeable. Burn-to-mint, evolves in place by **cumulative burn weight**.

**Responsibilities:**
- Mint/upgrade driven by `PyreImmolated` as cumulative burn weight crosses thresholds.
- Track per-token stage; stage **ratchets up only** — it never regresses, including on transfer.
- `tokenOf[wallet]` → the wallet's Fire Spirit tokenId (0 if none).
- On transfer: yield settles to the seller first (via `PyreStaking` and `PyreImmolated` `settleYield`), then ownership moves. The Fire Spirit carries its current visual stage; the new holder's *own* future burns start at 0.

**Stage by cumulative burn weight (NOT staking time):**

| Stage | Name | Cumulative weight | Yield multiplier |
|---|---|---|---|
| 1 | EMBER | 10,000 | 1× |
| 2 | FLAME | 75,000 | 1.5× |
| 3 | FORGE | 150,000 | 2× |
| 4 | PYRE | 300,000 | 3× |

Stage is a pure function of the holder's accumulated burn weight, evaluated from `PyreImmolated`. There is no time-based component.

### ⛔ OPEN DECISION — art rendering approach (do NOT build this layer yet)

The visual/rendering architecture of the Fire Spirit is **not yet decided**. The
two contract shapes are fundamentally different, so **do not implement
`tokenURI`/rendering until this is locked.** Everything else in this contract
(mint trigger, stage math, transfer/settlement) is stable and can be built now.

The decision actually spans two independent axes (often conflated as one):

- **Axis A — uniqueness:** *static per tier* (every EMBER identical, …) **vs**
  *per-token generative* (seed-derived coloring/traits, each spirit unique).
- **Axis B — storage:** *fully on-chain* (SVG string / base64 / SSTORE2) **vs**
  *hosted* (IPFS/Arweave pointer).

Contract impact by path:
- Static + hosted → `tokenURI` returns a stage-indexed pointer. Trivial.
- Static + on-chain → store ~10 image blobs on-chain (SSTORE2), index by stage. Moderate.
- Generative + on-chain → per-token `seed` set at mint, deterministic trait/colour
  derivation, on-chain SVG assembly per stage. Significant work + gas.

Variants to support **regardless of path**: an **LP-burn** marker (visual variant
at every stage) and an **Immolated** marker (overlay). Keep these as boolean flags
on the token so the chosen renderer can read them.

> Status: the designer briefing currently *labels* "static per stage" but the
> founder has not finalized it. Treat as **open**. Build the non-render parts of
> `PyreNFT` now; pause on rendering.

---

## 4. `PyreStaking.sol` — Staking & Yield

**Responsibilities:**
- Accept $PYRE deposits; mark staked (decay-exempt) in `PyreToken`.
- Distribute the staker share of the single yield pool by weight, `rewardPerToken`-style (O(1)).
- 7-day **drip** on unstake; tokens **continue decaying** during the drip; **no yield** accrues during drip; cannot restake until the drip completes.
- Settle yield on Fire Spirit transfer.
- Host the pre-launch **whitelist yield boost** (separate spec: `whitelist-boost-spec.md`).

**Weighting:** staker weight = raw staked balance. (The Fire Spirit stage multiplier
applies to the *Fire Spirit* weight in `PyreImmolated`, not to plain staking weight.)

**Drip:** linear release over 7 days; the claimable amount is scaled by the current
scaling factor at claim time, so decay during the drip is realized on the holder.

---

## 5. `PyreImmolated.sol` — The Immolated Protocol

Manages permanent burn commitments, Fire Spirit mint/upgrade, and burn-weight yield.

**Responsibilities:**
- `burnTokens(amount)`: burn $PYRE permanently, record weight, mint/upgrade the caller's Fire Spirit as cumulative weight crosses thresholds.
- `burnLP(ethAmt, pyreAmt)`: add liquidity, burn the LP shares permanently, record weight with the **+20%** bonus, mark the token's LP variant flag.
- Weight is denominated in **underlying units** (snapshot of the scaling factor at burn time) — early burners get more weight per token.
- Distribute the Fire Spirit share of the single yield pool by `weight × stageMultiplier`.
- Settle yield on Fire Spirit transfer.

**Constants:**
```solidity
uint256 public constant MIN_BURN        = 10_000e18; // EMBER mint threshold (cumulative)
uint256 public constant LP_WEIGHT_BONUS = 120;       // +20%
uint256 public constant BONUS_DENOM     = 100;
// Stage multipliers (index = stage): [0, 1e18, 1.5e18, 2e18, 3e18]
```

> ⚠️ Implementer: stage multipliers are **1× / 1.5× / 2× / 3×**, i.e.
> `[0, 1e18, 1.5e18, 2e18, 3e18]`. Do not reuse the superseded `[0,1,2,4,7]` draft.
> There is **no PYRE-stage gate** on burning — any wallet can burn any amount ≥ the
> minimum and progress through stages by cumulative weight.

**The "Immolated" overlay** is a status marker layered onto a Fire Spirit's art
(see §3 open decision for how art is rendered). LP-path and token-path burns share
one collection and one set of thresholds; the LP path differs only by its +20%
weight bonus and its visual variant flag.

---

## Decay Implementation

Global scaling factor — no per-wallet scheduled transactions.

```
scalingFactor updated once per epoch (1 hour):
    newScaling = oldScaling * (10000 - currentDecayRate) / 10000
```

- **Interactive wallets:** decay applied lazily on any interaction.
- **Passive wallets:** Chainlink Automation ticks the epoch / scaling factor hourly. Automation is a *supplement* to lazy evaluation, not the sole mechanism.

There is **no balance-threshold NFT burn.** A Fire Spirit, once minted, persists
permanently regardless of the holder's balance. (Earlier drafts had a
`checkAndBurn`/200K-balance mechanism — that belonged to the abandoned hold-to-mint
model and must not be implemented.)

---

## Fee Routing

```
Base fees: 4% hook + 1% pool = 5% effective, both directions.

Buy side (collected in ETH):
    base buy fees → 20% Team treasury
                  → 80% Yield pool (single shared pool)
    launch fee (buy only, first 24h) → 100% Yield pool (no team cut)

Sell side (collected in $PYRE):
    100% burned permanently — never distributed.

Burned-LP fees (orphaned fees from permanently-locked LP):
    100% → Yield pool   (see Open Questions — non-trivial to capture)
```

The yield pool is shared by stakers and Fire Spirit holders, proportional to total
weight. Fee routing is atomic with the swap in `afterSwap`.

---

## Deployment Order

```bash
# 1 — Token (no deps)
forge create PyreToken      --constructor-args $SUPPLY_CAP $BASE_RATE
# 2 — NFT (no deps at construction)
forge create PyreNFT
# 3 — Staking (needs token + NFT)
forge create PyreStaking    --constructor-args $PYRE_TOKEN $PYRE_NFT
# 4 — Immolated (needs token + NFT + LP)
forge create PyreImmolated  --constructor-args $PYRE_TOKEN $PYRE_NFT $LP_TOKEN
# 5 — Hook (needs all + pool manager; mine address first)
forge create PyreHook       --constructor-args $POOL_MANAGER $PYRE_TOKEN $PYRE_NFT $PYRE_STAKING $PYRE_IMMOLATED $BASE_RATE

# 6 — Wire permissions (each setter is one-shot where noted)
cast send $PYRE_TOKEN     "setHook(address)"      $PYRE_HOOK
cast send $PYRE_TOKEN     "setStaking(address)"   $PYRE_STAKING
cast send $PYRE_NFT       "setImmolated(address)" $PYRE_IMMOLATED
cast send $PYRE_NFT       "setStaking(address)"   $PYRE_STAKING
cast send $PYRE_STAKING   "setHook(address)"      $PYRE_HOOK
cast send $PYRE_IMMOLATED "setHook(address)"      $PYRE_HOOK
```

---

## Security Considerations

| Risk | Mitigation |
|---|---|
| Mint authority bypass | `PyreHook` is the immutable minter; `setHook()` callable once. |
| Scaling factor manipulation | Monotonic decrease enforced; floor prevents divide-by-zero. |
| Drip gaming | Restake blocked until the drip completes. |
| Reentrancy | `ReentrancyGuard` on all state-modifying functions. |
| Fee routing race | Fee split atomic with the swap in `afterSwap`. |
| NFT transfer yield theft | `settleYield()` runs before ownership changes (in `_beforeTokenTransfer`). |
| Immolated weight units | Scaling factor snapshotted at burn time; stored as underlying units. |
| Chainlink failure | Lazy evaluation covers interactive wallets; Automation is a supplement. |
| LP burn to address(0) | Verify burn to dead address; balance-check before/after. |

---

## Locked Parameters (Authoritative)

| Parameter | Value |
|---|---|
| Supply cap | 1,000,000,000 $PYRE |
| Minting | Hook-only, no pre-mine, 0% team allocation |
| Fire Spirit mint trigger | Burn-based — 10,000 $PYRE cumulative weight |
| Fire Spirit hard cap | None |
| Initial decay rate | **0.450%/hr** |
| Halving interval | **2,000 epochs (~83 days)** |
| Decay floor | **0.010%/hr** |
| Staking decay | 0% |
| Drip duration | 7 days |
| Drip loss (Era 0) | ~53% |
| No yield during drip | Confirmed |
| EMBER / FLAME / FORGE / PYRE thresholds | 10,000 / 75,000 / 150,000 / 300,000 |
| Stage multipliers | **1× / 1.5× / 2× / 3×** → `[0, 1e18, 1.5e18, 2e18, 3e18]` |
| Burn stage gate | None — any wallet can burn any amount ≥ minimum |
| Hook fee | **4% (buy and sell)** |
| Pool swap fee | **1%** |
| Total effective fee | **5% each way** |
| Launch fee (buy only) | **+20% at hour 0, linear decline to 0 over 24h — 100% to yield pool** |
| Fee implementation | Hook/pool level only — no ERC-20 transfer tax |
| Team cut | **20% of base ETH fee revenue** (launch fee excluded) |
| Sell-side fee | **100% burned** |
| Burned-LP fees | 100% to yield pool |
| Yield distribution | Single shared pool, proportional by weight — **no fixed split** |
| Staker weight | Raw staked balance |
| Fire Spirit weight | Burn weight (underlying units) × stage multiplier |
| LP burn weight bonus | **+20%** (120/100) |
| NFT type | Single Fire Spirit, tradeable ERC-721 |
| **NFT art rendering** | **OPEN — see §3. Do not build the render layer yet.** |
| Seed LP | Burned to address(0) at launch |
| Chain | Ethereum mainnet |
| Launch date | **TBD** (date-agnostic; do not hardcode) |

---

## Open Questions (Resolve Before Build)

- [ ] **Fire Spirit art rendering approach** (see §3) — blocks `PyreNFT` render layer and final art production. Highest priority.
- [ ] `BASE_RATE` — tokens minted per ETH; calibrate to the target supply curve (model before locking).
- [ ] Initial seed LP ETH amount.
- [ ] Single shared yield accumulator vs two Synthetix-style accumulators for the one pool.
- [ ] **LP fee capture from burned positions** — when LP shares are burned to address(0), the underlying liquidity stays in the pool and keeps generating fees that currently accrue to address(0) and are lost. The hook MUST track and redirect these orphaned fees into the yield pool. Non-trivial — needs a design spike before build.
- [ ] Exact V4 fee-capture mechanism (`afterSwap` delta vs dedicated fee flag).
- [ ] Chainlink Automation upkeep budget + LINK refill mechanism.
- [ ] Whether to enforce the drip restake-lock in-contract or by incentive alignment.
- [ ] KOL lock period (deferred — decide before launch).
