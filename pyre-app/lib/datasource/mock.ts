/* ============================================================================
   PYRE, MockDataSource
   ----------------------------------------------------------------------------
   Realistic fake data for building & demoing the UI with no contract deployed.
   Holds an in-memory "world" so writes have visible effects (stake moves tokens,
   burn advances the stage, txs go pending -> confirmed). Replaced 1:1 by
   ChainDataSource when the developer ships the contract ABIs.

   To preview different UI states while building, change MOCK_PERSONA below.
   ========================================================================== */

import {
  DECAY_RATE_INITIAL,
  SUPPLY_CAP,
  STAGES,
  stageFromWeight,
  bonfireState,
  pyre,
  WAD,
  LP_BURN_BONUS,
  IMMOLATED_PEAK,
  IMMOLATED_ASCEND_COST,
  IMMOLATED_YIELD_BOOST,
  POOL_FEE_BPS,
  HOOK_FEE_BPS,
  LAUNCH_FEE_MAX_BPS,
  LAUNCH_WINDOW_HOURS,
} from "../constants";
import { toNumber } from "../format";
import { TOKENS, POOL } from "../config";
import type {
  Address,
  ProtocolStats,
  Acolyte,
  StakingPosition,
  ImmolatedPosition,
  LeaderboardEntry,
  ActivityEvent,
  Announcement,
  MarketListing,
  MarketActivityEvent,
  MarketActivityKind,
  SwapQuote,
  SwapQuoteParams,
  SwapDirection,
  PoolState,
  SwapBalances,
  ApprovalState,
  QuestTask,
  SeriesPoint,
} from "../types";
import type { DataSource, TxResult, MarketFilter, SwapParams } from "./types";
import {
  fetchQuestTasks,
  completeQuestTask as completeQuestTaskApi,
  submitWallet as submitWalletApi,
} from "../quests/client";

/* Preview personas, switchable at runtime via the on-screen Design Preview
   control (lib/preview.tsx + components/preview-switcher.tsx), so the designer
   can see EVERY state without meeting on-chain thresholds:
   "fresh"    → a brand-new wallet at launch: 0 $PYRE, nothing staked, no Acolyte.
                Use with the Phase set to "Launched" to test the unlock funnel
                (everything locked until you buy $PYRE → Forge → the rest).
   "newcomer" → test wallet loaded with 1M $PYRE + 100 ETH (burn up the tiers).
   "burner"   → mid-progression (FLAME, climbing, staked).
   "veteran"  → full: Pyre Acolyte, staked, PYRE stage, Immolated member unlocked. */
export type Persona = "fresh" | "newcomer" | "burner" | "veteran";
const DEFAULT_PERSONA: Persona = "veteran";

const LATENCY_MS = 280; // simulated read latency
const TX_MS = 1600; // simulated transaction confirmation time

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randHex = (n: number) =>
  Array.from({ length: n }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
const addr = (): Address => `0x${randHex(40)}` as Address;

/* ============================================================================
   Grand Exchange, mock swap "backend"
   ----------------------------------------------------------------------------
   A real constant-product (x·y=k) AMM over a seeded PYRE↔ETH pool, so the swap
   UI behaves like an actual swap: outputs, price impact, slippage floors and
   fees all respond to trade size. On-chain this is replaced by V4Quoter; the
   shapes returned here are identical, so the UI is unchanged. All pool math is
   done in human float (display-only); ChainDataSource returns exact integers.
   ========================================================================== */
const ETH_USD = 3000; // mock fiat price of ETH
const RESERVE_ETH = 2_000; // ETH in the pool (human)
const RESERVE_PYRE = 950_000_000; // PYRE in the pool (human)
const POOL_K = RESERVE_ETH * RESERVE_PYRE; // x·y invariant
const PRICE_ETH_PER_PYRE = RESERVE_ETH / RESERVE_PYRE; // ~2.105e-6
const PYRE_USD = PRICE_ETH_PER_PYRE * ETH_USD;
const TVL_USD = RESERVE_ETH * ETH_USD * 2;
const HIGH_IMPACT = 0.05; // 5%+ → warn (like Uniswap)
const QUOTE_TTL_MS = 30_000; // quote refresh window
const GAS_UNITS = 180_000; // ~v4 single-hop swap
const GAS_GWEI = 12;
/** Hours since launch (mock). Drives the decaying buy-side launch fee so the
    designer sees a non-zero launch fee in the breakdown. */
const LAUNCH_ELAPSED_HOURS = 20;
/** Stable mock identifiers so the route panel shows a real pool id + the
    Diamond hook chip. On-chain: poolId = keccak256(abi.encode(poolKey)),
    hook = CONTRACTS.hook. */
const MOCK_POOL_ID = `0x${"7f".repeat(32)}`;
const MOCK_HOOK = `0x${"d1a".repeat(13)}0` as Address; // 40 hex, clearly a placeholder

/** Human number → 18-decimal base units, exponent-safe (toFixed avoids 1e-7). */
function toWei(human: number): bigint {
  if (!isFinite(human) || human <= 0) return 0n;
  const [w, f] = human.toFixed(18).split(".");
  return BigInt(w) * WAD + BigInt(f);
}

/** The core AMM quote. Pure function of the request, same call the V4Quoter
    answers on-chain. Returns everything the swap UI displays. */
function computePoolQuote(p: SwapQuoteParams): SwapQuote {
  const isBuy = p.direction === "buy";
  const slip = Math.max(0, p.slippageBps) / 10_000;

  // Fees: pool LP fee + hook fee always; launch fee only on buys, decaying to 0.
  const launchBps = isBuy
    ? Math.round(
        LAUNCH_FEE_MAX_BPS *
          Math.max(0, (LAUNCH_WINDOW_HOURS - LAUNCH_ELAPSED_HOURS) / LAUNCH_WINDOW_HOURS)
      )
    : 0;
  const totalBps = POOL_FEE_BPS + HOOK_FEE_BPS + launchBps;
  const feeRate = totalBps / 10_000;

  // in/out reserves for this direction
  const reserveIn = isBuy ? RESERVE_ETH : RESERVE_PYRE;
  const reserveOut = isBuy ? RESERVE_PYRE : RESERVE_ETH;
  const spotOutPerIn = reserveOut / reserveIn; // ideal price, fee-excluded

  let amountIn: number;
  let amountOut: number;
  let warning: SwapQuote["warning"] = null;

  if (p.kind === "exactIn") {
    amountIn = toNumber(p.amount);
    const inAfterFee = amountIn * (1 - feeRate);
    amountOut = reserveOut - POOL_K / (reserveIn + inAfterFee);
  } else {
    amountOut = toNumber(p.amount);
    if (amountOut >= reserveOut * 0.95) {
      warning = { kind: "insufficientLiquidity" };
      amountOut = reserveOut * 0.95; // clamp so the curve stays finite
    }
    const inAfterFee = POOL_K / (reserveOut - amountOut) - reserveIn;
    amountIn = inAfterFee / (1 - feeRate);
  }

  const inAfterFee = amountIn * (1 - feeRate);
  const idealOut = inAfterFee * spotOutPerIn;
  const priceImpact = idealOut > 0 ? Math.max(0, (idealOut - amountOut) / idealOut) : 0;
  const feeAmountIn = amountIn * feeRate; // fee, denominated in the input token
  const inUsdRate = isBuy ? ETH_USD : PYRE_USD;
  const outUsdRate = isBuy ? PYRE_USD : ETH_USD;

  if (!warning && priceImpact >= HIGH_IMPACT) {
    warning = { kind: "highPriceImpact", impact: priceImpact };
  } else if (!warning && amountOut > 0 && toWei(amountOut) === 0n) {
    warning = { kind: "minimalOutput" };
  }

  const gasEth = (GAS_UNITS * GAS_GWEI) / 1e9;

  return {
    kind: p.kind,
    direction: p.direction,
    input: {
      token: isBuy ? TOKENS.eth : TOKENS.pyre,
      amount: toWei(amountIn),
      usd: amountIn * inUsdRate,
    },
    output: {
      token: isBuy ? TOKENS.pyre : TOKENS.eth,
      amount: toWei(amountOut),
      usd: amountOut * outUsdRate,
    },
    executionPrice: amountIn > 0 ? amountOut / amountIn : spotOutPerIn,
    midPrice: spotOutPerIn,
    priceImpact,
    fee: {
      lpFeeBps: POOL_FEE_BPS,
      hookFeeBps: HOOK_FEE_BPS,
      launchFeeBps: launchBps,
      totalFeeBps: totalBps,
      feeAmount: toWei(feeAmountIn),
      feeUsd: feeAmountIn * inUsdRate,
      disposition: isBuy ? "to the reward pool" : "burned permanently",
    },
    minReceived: p.kind === "exactIn" ? toWei(amountOut * (1 - slip)) : 0n,
    maxSold: p.kind === "exactOut" ? toWei(amountIn * (1 + slip)) : 0n,
    slippageBps: p.slippageBps,
    route: [
      {
        poolId: MOCK_POOL_ID,
        feeTier: POOL.feeTier,
        isDynamicFee: POOL.isDynamicFee,
        hook: MOCK_HOOK,
        tokenIn: isBuy ? "$ETH" : "PYRE",
        tokenOut: isBuy ? "PYRE" : "$ETH",
      },
    ],
    gasEstimate: toWei(gasEth),
    gasUsd: gasEth * ETH_USD,
    expiresAt: Date.now() + QUOTE_TTL_MS,
    warning,
  };
}

/* --- The in-memory world ------------------------------------------------- */
interface World {
  liquid: bigint;
  staked: bigint;
  ethBalance: bigint; // native ETH, for the Grand Exchange rows + buys
  pendingRewardsEth: bigint;
  cumulativeBurnWeight: bigint;
  immolatedWeight: bigint;
  immolatedPendingEth: bigint;
  isLP: boolean;
  drip: StakingPosition["drip"];
  boost: StakingPosition["boost"];
  totalBurned: bigint;
  scalingFactor: number;
  /** Permit2 approval progress for selling PYRE: 0 = none (needs-approval),
      1 = approved to Permit2 (needs-permit), 2 = permit signed (ready). */
  pyrePermitPhase: 0 | 1 | 2;
}

/** ETH amount (human) → wei. */
const eth = (amount: number): bigint => toWei(amount);

// Quest-completer boost, ~5 days left (shown only to the earner).
const questBoost = (): StakingPosition["boost"] => ({
  factor: 1.2,
  expiresAt: Date.now() + 5 * 24 * 3600_000,
  source: "quest",
});

function seedWorld(persona: Persona): World {
  switch (persona) {
    case "fresh":
      // A brand-new wallet at launch: holds nothing, just a little ETH to buy
      // with, so the post-launch unlock funnel starts fully locked.
      return {
        liquid: 0n,
        staked: 0n,
        ethBalance: eth(0.5),
        pendingRewardsEth: 0n,
        cumulativeBurnWeight: 0n,
        immolatedWeight: 0n,
        immolatedPendingEth: 0n,
        isLP: false,
        drip: null,
        boost: null,
        totalBurned: pyre(2_400_000),
        scalingFactor: 0.91,
        pyrePermitPhase: 0,
      };
    case "newcomer":
      return {
        liquid: pyre(1_000_000), // test wallet: 1M $PYRE to burn up the tiers + stake
        staked: 0n,
        ethBalance: eth(100), // enough ETH to also test LP burns

        pendingRewardsEth: 0n,
        cumulativeBurnWeight: 0n,
        immolatedWeight: 0n,
        immolatedPendingEth: 0n,
        isLP: false,
        drip: null,
        boost: null, // hasn't completed the quests
        totalBurned: pyre(2_400_000),
        scalingFactor: 0.91,
        pyrePermitPhase: 0,
      };
    case "veteran":
      return {
        liquid: pyre(128_500),
        staked: pyre(540_000),
        ethBalance: eth(18.6),
        pendingRewardsEth: 318_000_000_000_000_000n, // 0.318 ETH
        cumulativeBurnWeight: pyre(320_000),
        immolatedWeight: pyre(45_000),
        immolatedPendingEth: 92_000_000_000_000_000n,
        isLP: true,
        drip: null,
        boost: questBoost(),
        totalBurned: pyre(2_400_000),
        scalingFactor: 0.91,
        pyrePermitPhase: 0,
      };
    case "burner":
    default:
      return {
        liquid: pyre(61_300),
        staked: pyre(180_000),
        ethBalance: eth(3.2),
        pendingRewardsEth: 74_000_000_000_000_000n, // 0.074 ETH
        cumulativeBurnWeight: pyre(92_000), // FLAME, climbing to FORGE
        immolatedWeight: 0n,
        immolatedPendingEth: 0n,
        isLP: false,
        drip: null,
        boost: questBoost(),
        totalBurned: pyre(2_400_000),
        scalingFactor: 0.91,
        pyrePermitPhase: 0,
      };
  }
}

function burnSeries(): SeriesPoint[] {
  const now = Date.now();
  const pts: SeriesPoint[] = [];
  for (let i = 47; i >= 0; i--) {
    // gentle wave, ~30k-90k burned per hour bucket
    const base = 55_000 + Math.sin(i / 4) * 22_000 + Math.random() * 8_000;
    pts.push({ t: now - i * 3600_000, value: Math.round(base) });
  }
  return pts;
}

export class MockDataSource implements DataSource {
  private world = seedWorld(DEFAULT_PERSONA);

  /** Switch the previewed user state (Design Preview control). Re-seeds the
      in-memory world; callers invalidate react-query so the UI refetches. */
  setPersona(persona: Persona) {
    this.world = seedWorld(persona);
  }

  /* ---------------------------------------------------------------- reads */
  async getProtocolStats(): Promise<ProtocolStats> {
    await wait(LATENCY_MS);
    const w = this.world;
    const circulating = pyre(412_000_000);
    return {
      totalSupply: circulating,
      totalBurned: w.totalBurned,
      supplyCap: SUPPLY_CAP,
      decayRatePerHour: DECAY_RATE_INITIAL,
      era: 0,
      epochsUntilHalving: 1_640,
      nextEpochAt: nextHourBoundary(),
      scalingFactor: w.scalingFactor,
      stakingRatio: 0.37,
      totalStaked: w.staked,
      activeAcolytes: 1_284,
      totalEthDistributed: pyre(2_190).valueOf(), // ~2190 ETH all-time (display only)
      pendingYieldPoolEth: eth(41.7), // sitting in the reward pool, awaiting next distribution
      totalEthToYieldPool: eth(41.7),
      totalEthToTeam: eth(10.4),
      volume24h: 940_000_000_000_000_000_000n, // ~940 ETH
      bonfire: bonfireState(w.totalBurned),
      burnRateSeries: burnSeries(),
    };
  }

  async getAcolyte(_address: Address): Promise<Acolyte> {
    await wait(LATENCY_MS);
    const w = this.world;
    const exists = w.cumulativeBurnWeight >= STAGES[1].threshold;
    const { stage, nextThreshold } = stageFromWeight(w.cumulativeBurnWeight);
    return {
      exists,
      tokenId: exists ? 742 : null,
      stage,
      stageName: STAGES[stage].name,
      multiplier: STAGES[stage].multiplier,
      cumulativeBurnWeight: w.cumulativeBurnWeight,
      nextStageThreshold: nextThreshold,
      isLP: w.isLP,
      isImmolated: w.immolatedWeight > 0n,
      seed: exists ? `0x${randHex(16)}` : null,
      svg: null, // on-chain SVG arrives with the contract
    };
  }

  async getStakingPosition(_address: Address): Promise<StakingPosition> {
    await wait(LATENCY_MS);
    const w = this.world;
    const { stage } = stageFromWeight(w.cumulativeBurnWeight);
    // effectiveWeight = staked × tierMult × lpBonus × immolatedBonus (Model B,
    // mirrors PyreStaking._calculateWeight). All are YIELD multipliers on stake;
    // staked == 0 → 0. The temporary quest boost (w.boost) stacks separately.
    const mult = BigInt(Math.round(STAGES[stage].multiplier * 1000));
    let effectiveWeight = (w.staked * mult) / 1000n;
    if (w.isLP) effectiveWeight = (effectiveWeight * BigInt(Math.round(LP_BURN_BONUS * 100))) / 100n; // LP 2× yield
    if (w.immolatedWeight > 0n) effectiveWeight = (effectiveWeight * 12n) / 10n; // Immolated +20%
    return {
      liquidBalance: w.liquid,
      stakedBalance: w.staked,
      pendingRewardsEth: w.pendingRewardsEth,
      effectiveWeight,
      drip: w.drip,
      boost: w.boost,
    };
  }

  async getUserHistory(address: Address): Promise<ActivityEvent[]> {
    await wait(LATENCY_MS);
    const w = this.world;
    if (w.staked === 0n && w.cumulativeBurnWeight === 0n) return []; // new wallet
    const now = Date.now();
    const mk = (
      i: number,
      kind: ActivityEvent["kind"],
      amount: bigint,
      note: string
    ): ActivityEvent => ({ id: `me-${i}`, kind, address, amount, note, at: now - i * 5_400_000 });
    return [
      mk(1, "claim", w.pendingRewardsEth, "claimed $ETH yield"),
      mk(2, "burn", pyre(40_000), "burned $PYRE"),
      mk(3, "stake", pyre(180_000), "staked $PYRE"),
      mk(4, "mint", pyre(10_000), "EMBER minted"),
      mk(5, "burn", pyre(10_000), "burned $PYRE"),
    ];
  }

  async getImmolatedPosition(_address: Address): Promise<ImmolatedPosition> {
    await wait(LATENCY_MS);
    const w = this.world;
    // Eligible = REACHED Pyre (the top tier). The honor itself is earned here via
    // the Ascend rite (a 100K burn), not by burning past Pyre at the Forge. Member
    // = has taken the rite (immolatedWeight set to their burn weight).
    const eligible = w.cumulativeBurnWeight >= IMMOLATED_PEAK;
    const isMember = w.immolatedWeight > 0n;
    // Immolated members carry a +20% yield boost: their effective pull on the pool
    // is their burn weight × the boost. (A separate yield multiplier that stacks
    // with the LP 2× yield flag; both are applied to staked weight, not here.)
    const boostedWeight = BigInt(Math.round(Number(w.immolatedWeight) * IMMOLATED_YIELD_BOOST));
    return {
      isMember,
      eligible,
      weight: w.immolatedWeight,
      yieldBoost: IMMOLATED_YIELD_BOOST,
      boostedWeight,
      pendingYieldEth: w.immolatedPendingEth,
      rank: isMember ? 23 : null,
      poolTotalWeight: pyre(6_400_000),
      isLP: w.isLP,
    };
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    await wait(LATENCY_MS);
    return Array.from({ length: 10 }, (_, i) => ({
      address: addr(),
      weight: pyre(900_000 - i * 70_000 + Math.round(Math.random() * 20_000)),
      stage: (i < 3 ? 4 : i < 6 ? 3 : 2) as 2 | 3 | 4,
      rank: i + 1,
    }));
  }

  async getTopBurners(): Promise<LeaderboardEntry[]> {
    return this.getLeaderboard();
  }

  async getActivityFeed(): Promise<ActivityEvent[]> {
    await wait(LATENCY_MS);
    const kinds: ActivityEvent["kind"][] = ["burn", "stake", "mint", "claim", "swap"];
    const notes: Record<string, string> = {
      burn: "burned $PYRE",
      stake: "staked $PYRE",
      mint: "FLAME unlocked",
      claim: "claimed $ETH yield",
      swap: "swapped $ETH → $PYRE",
    };
    const now = Date.now();
    return Array.from({ length: 20 }, (_, i) => {
      const kind = kinds[Math.floor(Math.random() * kinds.length)];
      return {
        id: `evt-${i}`,
        kind,
        address: addr(),
        amount: pyre(Math.round(2_000 + Math.random() * 40_000)),
        note: notes[kind],
        at: now - i * 47_000,
      };
    });
  }

  async getAnnouncements(): Promise<Announcement[]> {
    await wait(LATENCY_MS);
    const now = Date.now();
    return [
      {
        id: "a1",
        title: "Era 0 is live, the fire is lit",
        body: "Decay runs at 0.45%/hr. Stake to preserve, burn to forge.",
        pinned: true,
        at: now - 3600_000 * 6,
      },
      {
        id: "a2",
        title: "First halving in ~68 days",
        body: "Decay halves to 0.225%/hr at epoch 2,000.",
        pinned: false,
        at: now - 3600_000 * 30,
      },
    ];
  }

  async getMarketListings(filter?: MarketFilter): Promise<MarketListing[]> {
    await wait(LATENCY_MS);
    const now = Date.now();
    const all: MarketListing[] = Array.from({ length: 12 }, (_, i) => {
      const stage = ((i % 4) + 1) as 1 | 2 | 3 | 4;
      const isLP = i % 3 === 0;
      const w = STAGES[stage].threshold + pyre(i * 1_500);
      const { nextThreshold } = stageFromWeight(w);
      return {
        tokenId: 700 + i,
        stage,
        stageName: STAGES[stage].name,
        multiplier: STAGES[stage].multiplier,
        isLP,
        isImmolated: stage === 4 && i % 2 === 0,
        priceEth: pyre(0.4 + i * 0.15),
        cumulativeBurnWeight: w,
        nextStageThreshold: nextThreshold,
        listedAt: now - (i * 37 + 11) * 60_000, // staggered "listed Xm ago"
        externalUrl: "https://opensea.io/",
        svg: null,
      };
    });
    const rows = all.filter(
      (l) =>
        (filter?.stage ? l.stage === filter.stage : true) &&
        (filter?.lpOnly ? l.isLP : true) &&
        (filter?.immolatedOnly ? l.isImmolated : true)
    );
    const cmp = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);
    switch (filter?.sort ?? "price-asc") {
      case "price-desc":
        rows.sort((a, b) => cmp(b.priceEth, a.priceEth));
        break;
      case "recent":
        rows.sort((a, b) => b.listedAt - a.listedAt);
        break;
      case "tier-desc":
        rows.sort((a, b) => b.stage - a.stage || cmp(a.priceEth, b.priceEth));
        break;
      case "price-asc":
      default:
        rows.sort((a, b) => cmp(a.priceEth, b.priceEth));
    }
    return rows;
  }

  async getMarketActivity(filter?: MarketFilter): Promise<MarketActivityEvent[]> {
    await wait(LATENCY_MS);
    // Weighted toward sales/listings (what the marketplace event stream is mostly
    // made of); offers + delistings sprinkled in so every row type is designable.
    const sequence: MarketActivityKind[] = [
      "sale", "listing", "offer", "sale", "listing", "sale", "delisting", "listing",
    ];
    const now = Date.now();
    const all: MarketActivityEvent[] = Array.from({ length: 18 }, (_, i) => {
      const stage = (((i * 3) % 4) + 1) as 1 | 2 | 3 | 4;
      const kind = sequence[i % sequence.length];
      const isLP = i % 4 === 0;
      return {
        id: `mkt-evt-${i}`,
        kind,
        tokenId: 700 + (i % 12),
        stage,
        stageName: STAGES[stage].name,
        multiplier: STAGES[stage].multiplier,
        isLP,
        isImmolated: stage === 4 && i % 3 === 0,
        priceEth: pyre(0.35 + (i % 7) * 0.22 + stage * 0.08),
        from: addr(),
        to: kind === "sale" ? addr() : null,
        at: now - i * 137_000, // newest first, ~2-3 min apart
        externalUrl: "https://opensea.io/",
        svg: null,
      };
    });
    return all.filter(
      (e) =>
        (filter?.stage ? e.stage === filter.stage : true) &&
        (filter?.lpOnly ? e.isLP : true) &&
        (filter?.immolatedOnly ? e.isImmolated : true)
    );
  }

  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    await wait(120); // quote latency (V4Quoter eth_call round-trip on-chain)
    return computePoolQuote(params);
  }

  async getPoolState(): Promise<PoolState> {
    await wait(LATENCY_MS);
    // sqrtPriceX96 / tick are display approximations here; on-chain they come
    // straight from StateView.getSlot0(poolId).
    const price1per0 = RESERVE_PYRE / RESERVE_ETH; // currency1(PYRE) per currency0(ETH)
    const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(price1per0) * 2 ** 96));
    const tick = Math.floor(Math.log(price1per0) / Math.log(1.0001));
    return {
      poolId: MOCK_POOL_ID,
      currency0: TOKENS.eth, // address(0) sorts first
      currency1: TOKENS.pyre,
      feeTier: POOL.feeTier,
      isDynamicFee: POOL.isDynamicFee,
      tickSpacing: POOL.tickSpacing,
      hook: MOCK_HOOK,
      sqrtPriceX96,
      tick,
      liquidity: toWei(Math.sqrt(POOL_K)), // ~active liquidity proxy
      tvlUsd: TVL_USD,
      pricePyreInEth: PRICE_ETH_PER_PYRE,
      pricePyreUsd: PYRE_USD,
      ethUsd: ETH_USD,
    };
  }

  async getSwapBalances(_address: Address): Promise<SwapBalances> {
    await wait(LATENCY_MS);
    const w = this.world;
    return {
      pyre: w.liquid,
      eth: w.ethBalance,
      pyreUsd: toNumber(w.liquid) * PYRE_USD,
      ethUsd: toNumber(w.ethBalance) * ETH_USD,
    };
  }

  async getApprovalState(
    _address: Address,
    direction: SwapDirection,
    amount: bigint
  ): Promise<ApprovalState> {
    await wait(90);
    // Buying spends native ETH → no ERC-20 allowance needed.
    if (direction === "buy") return { status: "not-required" };
    if (amount <= 0n) return { status: "ready" };
    // Selling PYRE goes through Permit2: approve once, then sign a permit.
    switch (this.world.pyrePermitPhase) {
      case 0:
        return { status: "needs-approval" };
      case 1:
        return { status: "needs-permit" };
      default:
        return { status: "ready" };
    }
  }

  // Quests are off-chain + permanent, real backend in every mode (see
  // lib/quests/client.ts). The mock world doesn't simulate them.
  getQuestTasks(_address: Address | null): Promise<QuestTask[]> {
    return fetchQuestTasks();
  }

  /* --------------------------------------------------------------- writes */
  async stake(_address: Address, amount: bigint): Promise<TxResult> {
    await wait(TX_MS);
    if (amount > this.world.liquid) return { ok: false, error: "Insufficient liquid balance" };
    this.world.liquid -= amount;
    this.world.staked += amount;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async unstake(_address: Address, amount: bigint): Promise<TxResult> {
    await wait(TX_MS);
    if (amount > this.world.staked) return { ok: false, error: "Insufficient staked balance" };
    this.world.staked -= amount;
    const now = Date.now();
    this.world.drip = {
      total: amount,
      claimable: 0n,
      claimed: 0n,
      decayLoss: (amount * 53n) / 100n, // ~53% lost to decay over 7 days (Era 0)
      startedAt: now,
      completeAt: now + 7 * 24 * 3600_000,
    };
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async claimDrip(_address: Address): Promise<TxResult> {
    await wait(TX_MS);
    if (!this.world.drip) return { ok: false, error: "No active drip" };
    this.world.liquid += this.world.drip.total / 2n; // ~half lost to decay (Era 0)
    this.world.drip = null;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async burnTokens(_address: Address, amount: bigint): Promise<TxResult> {
    await wait(TX_MS);
    if (amount > this.world.liquid) return { ok: false, error: "Insufficient liquid balance" };
    this.world.liquid -= amount;
    this.world.cumulativeBurnWeight += amount;
    this.world.totalBurned += amount;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async burnLP(_address: Address, ethAmount: bigint, pyreAmount: bigint): Promise<TxResult> {
    await wait(TX_MS);
    // An LP burn pairs $PYRE WITH ETH, both are required and both are spent.
    if (ethAmount <= 0n) return { ok: false, error: "LP burn requires $ETH paired with your $PYRE" };
    if (pyreAmount <= 0n) return { ok: false, error: "Enter a $PYRE amount" };
    if (pyreAmount > this.world.liquid) return { ok: false, error: "Insufficient $PYRE balance" };
    if (ethAmount > this.world.ethBalance) return { ok: false, error: "Insufficient $ETH balance" };
    this.world.liquid -= pyreAmount;
    this.world.ethBalance -= ethAmount;
    // LP burns accumulate tier weight 1:1, exactly like token burns (the contract
    // does NOT climb tiers faster for LP). The LP reward is a PERMANENT +20% YIELD
    // flag, applied to staked weight in getStakingPosition (mirrors the contract's
    // lpBurners flag + LP_BURN_BONUS).
    this.world.cumulativeBurnWeight += pyreAmount;
    this.world.totalBurned += pyreAmount;
    this.world.isLP = true;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async claimStakingRewards(_address: Address): Promise<TxResult> {
    await wait(TX_MS);
    this.world.pendingRewardsEth = 0n;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async ascendImmolated(_address: Address): Promise<TxResult> {
    await wait(TX_MS);
    const w = this.world;
    if (w.cumulativeBurnWeight < IMMOLATED_PEAK)
      return { ok: false, error: "Reach Pyre first, the top tier, then take the rite" };
    if (w.immolatedWeight > 0n) return { ok: false, error: "Already ascended" };
    if (w.liquid < IMMOLATED_ASCEND_COST)
      return { ok: false, error: "The Ascend rite burns 100K $PYRE; not enough $PYRE" };
    // The Ascend rite burns 100K $PYRE here in the Hall (the LP path also pairs the
    // equivalent $ETH, both locked forever). It counts as burn and enrols you; your
    // share of the Hall is weighted by your total burn weight.
    w.liquid -= IMMOLATED_ASCEND_COST;
    w.cumulativeBurnWeight += IMMOLATED_ASCEND_COST;
    w.immolatedWeight = w.cumulativeBurnWeight;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async claimImmolatedYield(_address: Address): Promise<TxResult> {
    await wait(TX_MS);
    this.world.immolatedPendingEth = 0n;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  /** Permit2 flow for the sell side: first call = approve PYRE to Permit2
      (an on-chain tx), second call = sign the permit (gasless on-chain, modeled
      as instant here). Each call advances one phase so the designer sees every
      step. ETH buys never reach here. */
  async approveToken(_address: Address): Promise<TxResult> {
    await wait(TX_MS);
    if (this.world.pyrePermitPhase < 2) {
      this.world.pyrePermitPhase = (this.world.pyrePermitPhase + 1) as 0 | 1 | 2;
    }
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async swap(_address: Address, params: SwapParams): Promise<TxResult> {
    await wait(TX_MS);
    const quote = computePoolQuote(params);
    if (quote.warning?.kind === "insufficientLiquidity") {
      return { ok: false, error: "Insufficient liquidity for this trade" };
    }
    const payIn = quote.input.amount;
    const getOut = quote.output.amount;
    if (params.direction === "buy") {
      if (payIn > this.world.ethBalance) return { ok: false, error: "Insufficient $ETH balance" };
      this.world.ethBalance -= payIn;
      this.world.liquid += getOut;
    } else {
      if (payIn > this.world.liquid) return { ok: false, error: "Insufficient $PYRE balance" };
      this.world.liquid -= payIn;
      this.world.ethBalance += getOut;
    }
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  completeQuestTask(taskId: string): Promise<TxResult> {
    return completeQuestTaskApi(taskId);
  }

  submitWallet(walletText: string): Promise<TxResult> {
    return submitWalletApi(walletText);
  }
}

/* Next hourly decay-tick boundary, in ms (for the rebase countdown). */
function nextHourBoundary(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next.getTime();
}
