/* ============================================================================
   PYRE, Domain types
   ----------------------------------------------------------------------------
   The exact shape of every piece of data the UI consumes. These are framework-
   and source-agnostic: the mock data source and the future on-chain data source
   both return these same shapes, so panels never know (or care) which is live.

   All token/ETH amounts are bigint in base units (18 decimals) to match chain.
   ========================================================================== */

import type { Stage, BonfireState } from "./constants";

export type Address = `0x${string}`;

/* --- Wallet -------------------------------------------------------------- */
export type WalletStatus = "disconnected" | "connecting" | "connected";

export interface WalletState {
  status: WalletStatus;
  address: Address | null;
}

/* --- The Observatory: global protocol stats (read-only, no wallet) ------- */
export interface ProtocolStats {
  totalSupply: bigint; // current circulating (post-decay)
  totalBurned: bigint; // all-time burned
  supplyCap: bigint;
  decayRatePerHour: number; // 0.0045 = 0.45%/hr
  era: number; // halving era (0,1,2…)
  epochsUntilHalving: number;
  nextEpochAt: number; // ms timestamp of next hourly decay tick
  scalingFactor: number; // S(t), starts 1.0, falls over time
  stakingRatio: number; // 0..1 share of supply staked
  totalStaked: bigint; // raw $PYRE currently staked (from logs)
  activeAcolytes: number;
  totalEthDistributed: bigint; // all-time ETH paid to participants (wei)
  pendingYieldPoolEth: bigint; // ETH collected into the reward pool, awaiting the next distribution (wei)
  /** Cumulative buy-fee ETH the hook has routed to the yield pool (diamond). */
  totalEthToYieldPool: bigint;
  /** Cumulative buy-fee ETH the hook has routed to the team wallet (diamond). */
  totalEthToTeam: bigint;
  volume24h: bigint; // 24h swap volume (wei of ETH)
  bonfire: BonfireState;
  burnRateSeries: SeriesPoint[]; // for the live burn-rate chart
}

export interface SeriesPoint {
  t: number; // ms timestamp
  value: number; // tokens (human units) burned in that bucket
}

/* --- The Amber Vault: the connected user's Pyre Acolyte + position ------- */
export interface Acolyte {
  exists: boolean; // false until 10k cumulative burned
  tokenId: number | null;
  stage: Stage;
  stageName: string; // EMBER | FLAME | FORGE | PYRE
  multiplier: number; // 1 | 1.5 | 2 | 3
  cumulativeBurnWeight: bigint; // drives stage
  nextStageThreshold: bigint | null; // null at PYRE
  isLP: boolean; // LP-burn variant (gradient overlay)
  isImmolated: boolean; // Immolated sigil overlay
  seed: string | null; // generative seed, set at EMBER mint
  svg: string | null; // on-chain SVG markup (placeholder until contract)
}

export interface StakingPosition {
  liquidBalance: bigint; // decays at decayRatePerHour
  stakedBalance: bigint; // decay-immune
  pendingRewardsEth: bigint; // claimable ETH yield
  effectiveWeight: bigint; // stakedBalance * stageMultiplier
  drip: DripState | null;
  boost: MultiplierBoost | null; // temporary quest-completer yield boost
}

export interface DripState {
  total: bigint; // amount being returned over 7 days
  claimable: bigint; // currently claimable (linear, post-decay)
  claimed: bigint;
  decayLoss: bigint; // est. tokens lost to decay across the full drip
  startedAt: number; // ms
  completeAt: number; // ms
}

/** Temporary yield-weight boost earned by completing the pre-launch quests and
    submitting a wallet. Shown only to the wallet that earned it. (Distinct from
    the launch fee, which is intentionally NOT surfaced, and from private KOL
    arrangements, which never appear in the UI.) */
export interface MultiplierBoost {
  factor: number; // e.g. 1.2 = +20%
  expiresAt: number; // ms; boost reverts after this
  source: "quest";
}

/* --- Hall of the Immolated ---------------------------------------------- */
export interface ImmolatedPosition {
  isMember: boolean; // has ascended (joined the Immolated)
  eligible: boolean; // reached Pyre (top tier); can now take the Ascend rite in the Hall
  weight: bigint; // your immolated burn weight (your raw share of the pool)
  yieldBoost: number; // +20% Immolated yield boost, e.g. 1.2 (factor, not %)
  boostedWeight: bigint; // weight × yieldBoost: your effective pool share as a member
  pendingYieldEth: bigint;
  rank: number | null; // your rank among all Immolated
  poolTotalWeight: bigint;
  isLP: boolean;
}

export interface LeaderboardEntry {
  address: Address;
  weight: bigint;
  stage: Stage;
  rank: number;
}

/* --- The Grand Exchange: swap ------------------------------------------- */
/* The full data model behind a Uniswap-style swap, mapped onto our single
   PYRE↔ETH v4 pool. The mock returns realistic values for every field so the
   designer can design (and the dev can drive) the exact swap experience today;
   ChainDataSource fills the same shapes from V4Quoter/StateView/Universal Router.
   buy = ETH→PYRE, sell = PYRE→ETH. */
export type SwapDirection = "buy" | "sell";

/** Which side the user fixed by typing: exact-input (typed "you pay") or
    exact-output (typed "you receive"). Uniswap supports both. */
export type SwapKind = "exactIn" | "exactOut";

/** A token in the pair. `address: null` + `isNative: true` denotes native ETH
    (currency address(0) in the v4 PoolKey). */
export interface TokenInfo {
  symbol: string; // "PYRE" | "ETH"
  name: string; // "Pyre" | "Ether"
  address: Address | null; // null = native ETH
  decimals: number;
  logoURI: string | null;
  isNative: boolean;
}

/** An amount of a token plus its fiat value, for the two swap rows. */
export interface TokenAmount {
  token: TokenInfo;
  amount: bigint; // base units (token.decimals)
  usd: number; // fiat value of `amount`
}

/** Honest fee breakdown. lp = pool fee tier, hook = our Diamond hook fee,
    launch = buy-side launch fee that decays to 0 over the launch window. */
export interface SwapFeeBreakdown {
  lpFeeBps: number;
  hookFeeBps: number;
  launchFeeBps: number; // 0 on sells and after the launch window
  totalFeeBps: number;
  feeAmount: bigint; // total fee, denominated in the input token
  feeUsd: number;
  disposition: string; // "burned permanently" (sell) | "to the reward pool" (buy)
}

/** One hop of the order route. We're single-pool, but model a route like
    Uniswap so the UI's "Order routing" panel is real, not faked. */
export interface SwapRouteHop {
  poolId: string; // keccak256(abi.encode(poolKey))
  feeTier: number; // pool LP fee in bps
  isDynamicFee: boolean;
  hook: Address | null; // the Diamond hook on this pool
  tokenIn: string; // symbol
  tokenOut: string; // symbol
}

export type SwapWarning =
  | { kind: "highPriceImpact"; impact: number } // impact above the safe threshold
  | { kind: "insufficientLiquidity" } // pool can't fill this size
  | { kind: "minimalOutput" }; // output rounds to ~0

export interface SwapQuote {
  kind: SwapKind;
  direction: SwapDirection;
  input: TokenAmount; // what you pay
  output: TokenAmount; // what you receive (estimated)
  executionPrice: number; // output per input, after impact (PYRE/ETH or ETH/PYRE)
  midPrice: number; // pool spot price before impact (same unit as executionPrice)
  priceImpact: number; // 0..1
  fee: SwapFeeBreakdown;
  minReceived: bigint; // exactIn: output floor after slippage (output token units)
  maxSold: bigint; // exactOut: input ceiling after slippage (input token units)
  slippageBps: number; // effective slippage applied
  route: SwapRouteHop[];
  gasEstimate: bigint; // wei
  gasUsd: number;
  expiresAt: number; // ms; quote refresh deadline (~30s, like Uniswap)
  warning: SwapWarning | null;
}

/** Parameters for a quote/swap request. `amount` is the amount on the side the
    user fixed (`kind`). */
export interface SwapQuoteParams {
  direction: SwapDirection;
  kind: SwapKind;
  amount: bigint;
  slippageBps: number;
}

/** Persisted swap preferences (slippage + deadline), like Uniswap's settings. */
export interface SwapSettings {
  slippageMode: "auto" | "custom";
  slippageBps: number; // used when slippageMode === "custom"
  deadlineMinutes: number;
}

/** Live pool context from StateView + the hook (TVL, spot price, liquidity). */
export interface PoolState {
  poolId: string;
  currency0: TokenInfo;
  currency1: TokenInfo;
  feeTier: number; // LP fee bps
  isDynamicFee: boolean;
  tickSpacing: number;
  hook: Address | null;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint; // active liquidity
  tvlUsd: number;
  pricePyreInEth: number;
  pricePyreUsd: number;
  ethUsd: number;
}

/** The connected wallet's balances of the pair, for the rows + Max/50%. */
export interface SwapBalances {
  pyre: bigint;
  eth: bigint;
  pyreUsd: number;
  ethUsd: number;
}

/** ERC-20 (PYRE/sell-side) allowance state for the Permit2 flow. Native ETH
    (buy-side) is always "not-required". */
export type ApprovalState =
  | { status: "not-required" } // native ETH input
  | { status: "needs-approval" } // no ERC-20 allowance to Permit2 yet
  | { status: "needs-permit" } // approved to Permit2, needs a signature
  | { status: "ready" }; // good to swap

/* --- The Ashen Cup: community feeds ------------------------------------- */
export type ActivityKind = "burn" | "stake" | "mint" | "claim" | "swap";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  address: Address;
  amount: bigint; // tokens or eth depending on kind
  note: string; // pre-rendered human line, e.g. "FLAME unlocked"
  at: number; // ms
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  at: number;
}

/* --- The Black Market: Pyre Acolyte listings (wrapped OpenSea/Blur) ------ */
export interface MarketListing {
  tokenId: number;
  stage: Stage;
  stageName: string; // EMBER | FLAME | FORGE | PYRE (drives the tier filter)
  multiplier: number;
  isLP: boolean;
  isImmolated: boolean;
  priceEth: bigint;
  cumulativeBurnWeight: bigint;
  nextStageThreshold: bigint | null;
  listedAt: number; // ms the listing went live (powers "listed 2h ago" + recent sort)
  externalUrl: string; // link out to OpenSea/Blur listing
  svg: string | null;
}

/** One row of the Black Market's "Recent activity" tab. A branded mirror of the
    marketplace's event stream (OpenSea/Blur), so traders see the Acolyte market
    breathing without leaving the Village. */
export type MarketActivityKind = "sale" | "listing" | "offer" | "delisting";

export interface MarketActivityEvent {
  id: string;
  kind: MarketActivityKind;
  tokenId: number;
  stage: Stage;
  stageName: string; // EMBER | FLAME | FORGE | PYRE
  multiplier: number;
  isLP: boolean;
  isImmolated: boolean;
  priceEth: bigint; // sale price / list price / offer amount
  from: Address; // seller (sale/listing/delisting) or offerer (offer)
  to: Address | null; // buyer (sale only); null otherwise
  at: number; // ms
  externalUrl: string; // deep-link to the marketplace event/listing
  svg: string | null;
}

/* --- Visitor identity: how someone entered the funnel ------------------- */
/** Persisted per session so a visitor's choice (and guest name) survives a
    hard refresh server-side, not just in the browser. Wallet is optional, 
    connecting is never forced; a guest provides a username instead. */
export interface StoredIdentity {
  mode: "wallet" | "guest";
  username: string | null; // set for guests
  wallet: string | null; // set when a wallet is connected/known
}

/* --- Pre-launch quest funnel (lives in The Ashen Cup) ------------------- */
export interface QuestTask {
  id: string;
  title: string;
  description: string;
  done: boolean;
  unlockAt: number | null; // ms; null = available now (time-gated tasks)
  href: string | null; // external action link
  points: number; // "Embers" earned on completion (varies per rite)
  addedAt: number; // ms when this rite was lit (drives the "newly lit" marker)
}

/* --- Generic async UI state used by every hook -------------------------- */
export interface AsyncResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
