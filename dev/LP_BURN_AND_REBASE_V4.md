# Dev Brief — "LP Burn" in V4, and the Rebase × V4 Conflict

> Status: **open technical decisions.** This brief replaces the assumption baked into
> CORE.md / TOKENOMICS.md that LP burning means "burn LP shares to `address(0)` while
> liquidity stays in the pool and the hook captures the orphaned fees." That is not
> possible in Uniswap V4 as written. Read before touching `PyreImmolated.burnLP()` or
> the seed-LP step.

---

## 0. TL;DR

1. **The dev is right:** V4 mints no fungible ERC-20 LP tokens. There is nothing to send to `address(0)`.
2. **But his fix ("let users exit, then burn the ETH + $PYRE they get back") quietly drops two things the docs promise:** liquidity no longer stays in the pool, and there are **zero ongoing fees to capture.** It's a pure supply burn, not liquidity locking.
3. **If we want "permanent liquidity + fee capture into the yield pool," the correct V4 primitive is an NFT-locker contract**, not a proceeds burn and not a dead-address transfer.
4. **Separate, bigger issue:** an S(t) negative-rebase token inside a **V4 concentrated-liquidity pool** is a known hard problem. Needs its own spike (§3).

---

## 1. The V4 liquidity reality

- V4 has **one `PoolManager` singleton** holding all pools and balances. A liquidity
  position is just a mapping entry keyed by `keccak256(owner, tickLower, tickUpper, salt)`
  with three fields: `liquidity`, `feeGrowthInside0LastX128`, `feeGrowthInside1LastX128`.
- The periphery `PositionManager` wraps each position as an **ERC-721 NFT** (the `tokenId`
  is used as the `salt`; the PoolManager sees the PositionManager as the `owner`).
- **ERC-6909 "claim tokens" are not LP shares** — they're a raw-token accounting
  optimization (1:1 claim on tokens parked in the PoolManager). Do not conflate them.
- So: **no V2-style LP token exists.** "Burn the LP token to `address(0)`" has no meaning in V4.

## 2. What "LP burn" can actually mean in V4 — three options

| Option | What happens | Liquidity stays in pool? | Ongoing fees? | Matches current docs? |
|---|---|---|---|---|
| **A. Exit + burn proceeds** (dev's proposal) | Remove liquidity, send the returned ETH + $PYRE to `address(0)` | ❌ removed | ❌ none | ❌ — docs say liquidity stays & fees are captured |
| **B. NFT → dead address** | Transfer the position NFT to `address(0)` | ✅ locked forever | ⚠️ generated but **stranded** (can't be collected) | partial — locks liquidity but the fee-capture promise fails |
| **C. NFT → locker contract** | Position NFT held by a PYRE locker that can **never** withdraw principal but **can** collect fees and route them to the yield pool | ✅ locked forever | ✅ collectible → yield pool | ✅ — this is what the docs actually describe |

Key facts behind the table:
- In `PoolManager.modifyLiquidity`, `callerDelta = principalDelta + feesAccrued` — **fees
  are credited to the position owner.** Collecting them requires authority over the NFT.
- **Option B strands fees:** once the NFT is at `address(0)`, nobody can ever call
  `DECREASE_LIQUIDITY`/`collect`, so the fees the locked liquidity earns are lost forever.
  This is the exact failure mode the docs were trying to avoid — and naive "burn to dead
  address" walks straight into it.
- **Option C works and is production-proven** (e.g. UNCX V4 lockers): a contract holds the
  NFT, hard-blocks principal removal, and exposes a permissioned fee-collect that sweeps
  `feesAccrued` to the yield pool. A return-delta hook (`AFTER_REMOVE_LIQUIDITY_RETURNS_DELTA`,
  `AFTER_SWAP_RETURNS_DELTA`) can also intercept fees, but the locker is simpler and lower-risk.

## 3. The decision

**Pick the path before building `burnLP()`:**

- **Want pool depth + fee capture (the current narrative)?** → Build **Option C**.
  `PyreImmolated.burnLP()` becomes "add liquidity → mint position NFT → transfer NFT into
  PyreLPLocker → record weight (+20%)." The locker exposes `collectFees()` callable by the
  hook, routing to the yield pool. Update the seed-LP step the same way (lock the NFT, don't
  "burn to address(0)").
- **Want simplicity and pure deflation?** → Build **Option A**. But then **delete** from the
  docs: "liquidity stays in the pool," "deepening the permanent trading floor," "ongoing fee
  generation," "two permanent yield streams," and the `Burned-LP fees → yield pool` line.
  Re-market it honestly as a token-supply burn with a +20% weight bonus.

Do **not** ship the current doc wording with Option A's implementation — the marketing
claims would be false.

## 4. Bigger flag: S(t) rebase × V4 concentrated liquidity

This is likely the harder problem than the LP-burn question, and it's currently unexamined.

- The reference implementation we're emulating (Yugen — see `research/yugen-onchain/`) is a
  **V2-style rebase token.** It survives because after each rebase it calls **`pair.sync()`**
  on every AMM pool so reserves re-read the new balances.
- **V4 has no equivalent per-pool `sync()` you can call to reconcile a position after a
  silent balance change.** V4 liquidity is **tick-bound and concentrated** — a token whose
  balances change out from under the pool breaks the `x·y=k`-style accounting the position
  math assumes. Elastic/rebase tokens are widely considered incompatible with concentrated
  liquidity without special handling.
- PYRE sidesteps part of this by computing decay **lazily via a global scaling factor**
  rather than rewriting balances — but the pool still holds $PYRE, and the effective value
  of pool-held $PYRE changes as S(t) decays. **How the V4 pool and the hook reconcile S(t)
  against pool reserves is unspecified and must be modeled before audit.**

### Spike questions to answer
1. Does pool-held $PYRE decay like a normal holder's balance, or is the pool (like staking)
   excluded from S(t) reduction? (If included: LPs bleed continuously and the curve drifts.
   If excluded: the pool becomes a decay-proof reservoir — pick deliberately and model it.)
2. If pool-held $PYRE decays, what keeps the V4 position's price/liquidity math consistent
   with the new effective balance, given there's no `pair.sync()`?
3. Can the hook (`beforeSwap`/`afterSwap`) reconcile S(t) atomically per swap instead of
   relying on a sync call? At what gas cost? (afterSwap is already near the ~100k budget.)
4. Does any of this interact badly with the locker in Option C (locked position can't be
   rebalanced)?

## 5. Doc fixes already applied (Yugen lineage)

`concept/TOKENOMICS.md`, `concept/CORE.md`, and this `dev/DEV_BRIEF.md` previously claimed
the LP-burn/fee-capture design was "inspired by Yugen" and a "design advantage over Yugen."
The on-chain Yugen contract has **no LP or fee logic at all** — it's a negative-rebase
ERC-20 (full analysis: `research/yugen-onchain/ANALYSIS.md`). Those specific Yugen claims
have been corrected. The real Yugen lineage is PYRE's **S(t) decay + staking protection +
Pyre Acolyte burn-weight** — which we already implement.

---

### Sources
- Uniswap v4-core `PoolManager.sol`, `Position.sol`, `Hooks.sol`; v4-periphery `PositionManager.sol`
- Uniswap V4 docs: PoolManager, ERC-6909, managing-liquidity (mint/burn) guides
- UNCX V4 Liquidity Lockers (production lock-with-fee-collection pattern)
- Composable Security — "Liquidity Theft via Hook Fee" (hooks can redirect deltas from positions they don't own)
- `research/yugen-onchain/ANALYSIS.md` + verified `Yugen.sol`
