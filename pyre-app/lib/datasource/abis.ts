/* ============================================================================
   Grand Exchange — on-chain ABIs + PoolKey helpers
   ----------------------------------------------------------------------------
   The minimal ABIs ChainDataSource needs to trade PYRE↔ETH against our own
   Uniswap v4 pool, plus the PoolKey/poolId derivation. Verified live against
   Sepolia (the pool is initialized + funded; getSlot0/getLiquidity/the Quoter
   all answer, and this poolId matches the on-chain pool).

   We trade through a custom router, IUniswapV4Router04 (config SWAP_ROUTER), a
   Uniswap-V2-style ergonomic wrapper over the v4 PoolManager. It takes a PLAIN
   ERC-20 approval (no Permit2): for a sell, approve PYRE to the router; buys send
   native ETH as msg.value.
   ========================================================================== */

import { keccak256, encodeAbiParameters, type Address, type Hex } from "viem";
import { CONTRACTS, POOL, DYNAMIC_FEE_FLAG } from "../config";

/* --- ERC-20 (PYRE: balance, the sell-side allowance, and approve) --------- */
export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

/* --- PyreToken (CONTRACTS.token): buckets + the Forge burn + unstake drip ----
   Stake/unstake/burn are INTERNAL balance moves (liquid↔staked↔drip), NOT ERC20
   transfers, so NONE of them need an approval. `burn` destroys your own liquid
   and fires the Acolyte mint/level callback. `claimDrip` sweeps vested unstaked
   tokens back to liquid. balanceOf is overridden (= liquid+staked+lockedDrip);
   use the per-bucket views for the real split. */
export const PYRE_TOKEN_ABI = [
  { type: "function", name: "liquidBalanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "stakedBalanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "dripBalanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "globalDecayIndex", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "currentEpoch", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decayRateBps", stateMutability: "pure", inputs: [{ name: "epoch", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "protocolStartTime", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "burn", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimDrip", stateMutability: "nonpayable", inputs: [], outputs: [{ name: "claimed", type: "uint256" }] },
] as const;

/* --- PyreStaking (CONTRACTS.staking): stake/unstake/claim + position reads ----
   stake/unstake call the token's gated stakeFor/unstakeFor (no approval). unstake
   begins a 7-day drip on the TOKEN (claim via PyreToken.claimDrip). claimReward
   pays accrued ETH. earned = claimable ETH (wei); weightOf = effective weight. */
export const PYRE_STAKING_ABI = [
  { type: "function", name: "stake", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "unstake", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { type: "function", name: "claimReward", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "earned", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "stakedBalanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "weightOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalWeight", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

/* --- ImmolatedGate (CONTRACTS.immolated): the Ascend rite + membership read -
   immolate() is the one-time claim once you've burned past Pyre; isImmolated is
   the membership flag. (Eligibility itself is derived from the Acolyte's
   cumulative burn — see ACOLYTE_ABI.) */
export const IMMOLATED_GATE_ABI = [
  { type: "function", name: "immolate", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { type: "function", name: "isImmolated", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  // The extra $PYRE the rite burns via burnFrom (needs an ERC-20 allowance to the gate).
  { type: "function", name: "ADDITIONAL_BURN", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

/* --- Acolyte (CONTRACTS.nft): the reads needed to gate the Ascend rite -------
   walletToTokenId(0 = none) + acolyteCumulativeBurn(tokenId) give "burned past
   Pyre" eligibility; lpBurnBonus reports the LP yield flag (1e18 = none; LP burners
   target 2e18 = 2×. NOTE: the currently deployed contract still returns 1.2e18;
   the UI models the 2× target, pending the contract update). */
export const ACOLYTE_ABI = [
  { type: "function", name: "walletToTokenId", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "acolyteCumulativeBurn", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "PYRE_THRESHOLD", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lpBurnBonus", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  // Stage enum (0=EMBER..3=PYRE) by tokenId; safe multiplier-by-wallet (1e18 if none);
  // LP flag; and burn accrued toward the 10k first-mint for a wallet with no NFT yet.
  { type: "function", name: "acolyteStage", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "uint8" }] },
  { type: "function", name: "nftStageMultiplier", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lpBurners", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "pendingBurn", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

/* --- PyreHookDiamond (CONTRACTS.hook): fee getters + the LP-burn rite -------
   Called AT THE DIAMOND address (only cut-in selectors resolve; facet constants
   don't). getCurrent{Buy,Sell}FeeBps = the live hook fee for that side (launch
   decay included), so the swap quote's fee breakdown can be exact.
   burnLpPosition(tokenId) takes a Uniswap v4 POSITION NFT: it checks the
   position is in our pool, moves the NFT to the dead address (needs an ERC-721
   approval to the diamond first) and flags the wallet as an LP burner. */
export const DIAMOND_ABI = [
  { type: "function", name: "getCurrentBuyFeeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getCurrentSellFeeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "burnLpPosition", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { type: "function", name: "getTotalLpBurns", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

/* --- Uniswap v4 PositionManager (V4.positionManager) ------------------------
   Just enough ERC-721 + v4 surface to find the user's LP position in OUR pool
   and hand it to the diamond's burnLpPosition. */
export const POSITION_MANAGER_ABI = [
  { type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "getApproved", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], outputs: [] },
  {
    type: "function",
    name: "getPoolAndPositionInfo",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "poolKey", type: "tuple", components: [
        { name: "currency0", type: "address" },
        { name: "currency1", type: "address" },
        { name: "fee", type: "uint24" },
        { name: "tickSpacing", type: "int24" },
        { name: "hooks", type: "address" },
      ]},
      { name: "info", type: "uint256" },
    ],
  },
] as const;

/* --- StateView (gas-free pool reads: spot price + active liquidity) -------- */
export const STATE_VIEW_ABI = [
  { type: "function", name: "getSlot0", stateMutability: "view", inputs: [{ name: "poolId", type: "bytes32" }], outputs: [{ name: "sqrtPriceX96", type: "uint160" }, { name: "tick", type: "int24" }, { name: "protocolFee", type: "uint24" }, { name: "lpFee", type: "uint24" }] },
  { type: "function", name: "getLiquidity", stateMutability: "view", inputs: [{ name: "poolId", type: "bytes32" }], outputs: [{ name: "liquidity", type: "uint128" }] },
] as const;

/* PoolKey as a reusable ABI component (nested inside the Quoter + Router args). */
const POOL_KEY_COMPONENTS = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
] as const;

/* --- V4Quoter (config V4.v4Quoter) -----------------------------------------
   quoteExact{Input,Output}Single are state-mutating in signature (they unlock
   the PoolManager and revert to return), so they're called OFF-CHAIN via
   eth_call / simulateContract, never sent as a tx. They already account for the
   pool fee AND the Diamond hook's fee, so the amounts they return are exact. */
export const V4_QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [{
      name: "params", type: "tuple", components: [
        { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
        { name: "zeroForOne", type: "bool" },
        { name: "exactAmount", type: "uint128" },
        { name: "hookData", type: "bytes" },
      ],
    }],
    outputs: [{ name: "amountOut", type: "uint256" }, { name: "gasEstimate", type: "uint256" }],
  },
  {
    type: "function",
    name: "quoteExactOutputSingle",
    stateMutability: "nonpayable",
    inputs: [{
      name: "params", type: "tuple", components: [
        { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
        { name: "zeroForOne", type: "bool" },
        { name: "exactAmount", type: "uint128" },
        { name: "hookData", type: "bytes" },
      ],
    }],
    outputs: [{ name: "amountIn", type: "uint256" }, { name: "gasEstimate", type: "uint256" }],
  },
] as const;

/* --- IUniswapV4Router04 (config SWAP_ROUTER) --------------------------------
   Uniswap-V2-style single-pool swaps. zeroForOne=true is currency0→currency1
   (ETH→PYRE, a buy); false is PYRE→ETH (a sell). For a buy, pass the ETH amount
   as both amountIn and msg.value. `receiver` gets the output. NOTE: confirm
   against the deployed router before mainnet (params/order verified vs the
   uniswap v4-router 04 interface; the read path is independently verified). */
export const V4_ROUTER_ABI = [
  {
    type: "function",
    name: "swapExactTokensForTokens",
    stateMutability: "payable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "zeroForOne", type: "bool" },
      { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
      { name: "hookData", type: "bytes" },
      { name: "receiver", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
  },
  {
    type: "function",
    name: "swapTokensForExactTokens",
    stateMutability: "payable",
    inputs: [
      { name: "amountOut", type: "uint256" },
      { name: "amountInMax", type: "uint256" },
      { name: "zeroForOne", type: "bool" },
      { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
      { name: "hookData", type: "bytes" },
      { name: "receiver", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "delta", type: "int256" }],
  },
] as const;

export interface PoolKey {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
}

/** The PYRE↔ETH PoolKey from config. Null until the token + hook addresses are
    known (CONTRACTS resolves them; on Sepolia they fall back to the deploy). */
export function getPoolKey(): PoolKey | null {
  const token = CONTRACTS.token;
  const hook = CONTRACTS.hook;
  if (!token || !hook) return null;
  return {
    currency0: POOL.nativeCurrency, // address(0), native ETH sorts first
    currency1: token,
    fee: POOL.isDynamicFee ? DYNAMIC_FEE_FLAG : POOL.feeTier,
    tickSpacing: POOL.tickSpacing,
    hooks: hook,
  };
}

/** poolId = keccak256(abi.encode(poolKey)). Matches the on-chain pool id. */
export function getPoolId(key: PoolKey): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "address" }, { type: "uint24" }, { type: "int24" }, { type: "address" }],
      [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks]
    )
  );
}
