# Whitelist Yield Boost — Dev Spec
**For:** PyreStaking.sol  
**Required before:** launch (date **TBD** — see note below)  
**Priority:** High — this must be deployed and whitelisted before the pool opens

> ⚠️ **Launch date is TBD / date-agnostic.** Do not hardcode any launch date or
> Unix timestamp into the contract or deployment scripts. The launch timestamp is
> set **at the moment the pool opens** via `setLaunchTimestamp(block.timestamp)`
> (or the exact open time), as a one-shot owner call. All windows below are
> expressed **relative to `launchTimestamp`**, not to calendar dates.

---

## What & Why

Pre-launch participants who complete tasks in the Village World and submit their wallet get added to a whitelist. Whitelisted wallets that **stake within 48 hours of launch** receive a **+20% yield weight boost for exactly 7 days**, then it expires automatically.

This is the single reward for completing the pre-launch funnel. No tokens, no NFT — just a temporary weight advantage in the yield accumulator.

---

## Changes to PyreStaking.sol

### 1. Storage

```solidity
mapping(address => bool) public whitelist;
uint256 public launchTimestamp;
bool public launchSet;
```

### 2. Whitelist Setter (owner only)

```solidity
function setWhitelist(address[] calldata wallets, bool status) external onlyOwner {
    for (uint256 i = 0; i < wallets.length; i++) {
        whitelist[wallets[i]] = status;
    }
}
```

Called once before launch with the full wallet list exported from Village World.

### 3. Launch Timestamp Setter (owner only, one-shot)

```solidity
function setLaunchTimestamp(uint256 timestamp) external onlyOwner {
    require(!launchSet, "already set");
    launchTimestamp = timestamp;
    launchSet = true;
}
```

Set this at the exact moment the pool opens — pass `block.timestamp` (or the precise open time). One-shot — cannot be changed after set. **No hardcoded date.**

### 4. Boost Logic in the Weight Calculation

Wherever yield weight is calculated for a staker, apply the multiplier if all three conditions are met:

```solidity
function _effectiveWeight(address user, uint256 baseWeight) internal view returns (uint256) {
    if (
        launchSet &&
        whitelist[user] &&
        block.timestamp <= launchTimestamp + 48 hours &&  // staked within claim window
        block.timestamp <= launchTimestamp + 7 days       // boost still active
    ) {
        return baseWeight * 120 / 100; // +20%
    }
    return baseWeight;
}
```

> **Note:** The 48-hour condition gates *entry into the boost* — if they stake after the 48h window, they don't get it at all. If they staked within 48h, the boost then runs until `launchTimestamp + 7 days` regardless of when they staked. Make sure the logic reflects this correctly:

```solidity
// Track when each whitelisted wallet first staked
mapping(address => uint256) public whitelistStakeTime;

// In the stake() function, record first stake time for whitelisted wallets
function stake(uint256 amount) external {
    // ... existing stake logic ...
    if (whitelist[msg.sender] && whitelistStakeTime[msg.sender] == 0) {
        require(launchSet, "launch not set");
        require(block.timestamp <= launchTimestamp + 48 hours, "boost claim window closed");
        whitelistStakeTime[msg.sender] = block.timestamp;
    }
}

function _effectiveWeight(address user, uint256 baseWeight) internal view returns (uint256) {
    if (
        whitelistStakeTime[user] != 0 &&
        block.timestamp <= launchTimestamp + 7 days
    ) {
        return baseWeight * 120 / 100;
    }
    return baseWeight;
}
```

### 5. Rules Summary

| Rule | Value |
|------|-------|
| Boost amount | +20% yield weight (1.2× multiplier) |
| Claim window | Must stake within 48h of `launchTimestamp` |
| Boost duration | 7 days from `launchTimestamp` (not from stake time) |
| Eligibility | `whitelist[wallet] == true` only |
| Stacking | No — one boost per wallet, no compounding with other multipliers unless intentional |
| After expiry | Weight returns to normal automatically, no transaction needed |
| After 48h window | Whitelisted wallets that missed the window get no boost, stake normally |

---

## Integration with Village World

The Village World backend collects wallet submissions as users complete tasks. Before launch (final wallet list locked ~24–48h ahead of pool open):

1. Village World exports the final whitelist as an array of addresses
2. Owner calls `setWhitelist(addresses, true)` on PyreStaking.sol
3. At pool open, owner calls `setLaunchTimestamp(block.timestamp)`

**Coordinate with Village World dev** on the export format and timing. The whitelist call should happen at least 24 hours before launch so there's time to verify on-chain.

---

## What to Test

- [ ] Whitelisted wallet stakes within 48h → gets 1.2× weight for 7 days
- [ ] Whitelisted wallet stakes after 48h → gets 1.0× weight (no boost)
- [ ] Non-whitelisted wallet stakes within 48h → gets 1.0× weight (no boost)
- [ ] Whitelisted wallet stakes within 48h, checks weight at day 8 → boost expired, 1.0×
- [ ] `setLaunchTimestamp` cannot be called twice
- [ ] `setWhitelist` can add/remove addresses (owner only)
- [ ] Boost does not stack if wallet somehow appears in whitelist twice

---

## Timeline

> Dates below are **relative to launch (L)**, which is TBD. No calendar dates — wire everything off `launchTimestamp`.

| When | Action |
|------|--------|
| ASAP | Review this spec, raise any questions |
| L − ~3 days | Village World exports wallet list |
| L − ~1–2 days | `setWhitelist()` called, verified on-chain |
| L (pool open) | `setLaunchTimestamp(block.timestamp)` called at pool open |
| L + 48h | 48h claim window closes automatically |
| L + 7 days | 7-day boost expires automatically |
