/* ============================================================================
   PYRE — Domain types
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
  activeFireSpirits: number;
  totalEthDistributed: bigint; // all-time ETH paid to participants (wei)
  volume24h: bigint; // 24h swap volume (wei of ETH)
  bonfire: BonfireState;
  burnRateSeries: SeriesPoint[]; // for the live burn-rate chart
}

export interface SeriesPoint {
  t: number; // ms timestamp
  value: number; // tokens (human units) burned in that bucket
}

/* --- The Amber Vault: the connected user's Fire Spirit + position -------- */
export interface FireSpirit {
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
    the launch fee — which is intentionally NOT surfaced — and from private KOL
    arrangements, which never appear in the UI.) */
export interface MultiplierBoost {
  factor: number; // e.g. 1.2 = +20%
  expiresAt: number; // ms; boost reverts after this
  source: "quest";
}

/* --- Hall of the Immolated ---------------------------------------------- */
export interface ImmolatedPosition {
  isMember: boolean; // reached stage 4 + min extra burn
  weight: bigint; // your immolated burn weight
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
export type SwapDirection = "buy" | "sell"; // buy = ETH->PYRE, sell = PYRE->ETH

export interface SwapQuote {
  direction: SwapDirection;
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number; // 0..1
  feeBps: number; // effective fee incl. launch fee if buy
  feeDisposition: string; // human note: "burned" | "to reward pool"
  pricePyreInEth: number;
}

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

/* --- The Black Market: Fire Spirit listings (wrapped OpenSea/Blur) ------- */
export interface MarketListing {
  tokenId: number;
  stage: Stage;
  stageName: string;
  multiplier: number;
  isLP: boolean;
  isImmolated: boolean;
  priceEth: bigint;
  cumulativeBurnWeight: bigint;
  nextStageThreshold: bigint | null;
  externalUrl: string; // link out to OpenSea/Blur listing
  svg: string | null;
}

/* --- Visitor identity: how someone entered the funnel ------------------- */
/** Persisted per session so a visitor's choice (and guest name) survives a
    hard refresh server-side, not just in the browser. Wallet is optional —
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
