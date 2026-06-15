/* ============================================================================
   PYRE — MockDataSource
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
  IMMOLATED_MIN_BURN,
  TOTAL_FEE_BPS,
  LP_WEIGHT_BONUS,
} from "../constants";
import type {
  Address,
  ProtocolStats,
  FireSpirit,
  StakingPosition,
  ImmolatedPosition,
  LeaderboardEntry,
  ActivityEvent,
  Announcement,
  MarketListing,
  SwapQuote,
  SwapDirection,
  QuestTask,
  SeriesPoint,
} from "../types";
import type { DataSource, TxResult, MarketFilter } from "./types";
import {
  fetchQuestTasks,
  completeQuestTask as completeQuestTaskApi,
  submitWallet as submitWalletApi,
} from "../quests/client";

/* Preview personas — switchable at runtime via the on-screen Design Preview
   control (lib/preview.tsx + components/preview-switcher.tsx), so the designer
   can see EVERY state without meeting on-chain thresholds:
   "newcomer" → empty / locked states (no Fire Spirit, nothing staked, Hall sealed).
   "burner"   → mid-progression (FLAME, climbing, staked).
   "veteran"  → full: Fire Spirit, staked, PYRE stage, Immolated member unlocked. */
export type Persona = "newcomer" | "burner" | "veteran";
const DEFAULT_PERSONA: Persona = "veteran";

const LATENCY_MS = 280; // simulated read latency
const TX_MS = 1600; // simulated transaction confirmation time

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randHex = (n: number) =>
  Array.from({ length: n }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
const addr = (): Address => `0x${randHex(40)}` as Address;

/* --- The in-memory world ------------------------------------------------- */
interface World {
  liquid: bigint;
  staked: bigint;
  pendingRewardsEth: bigint;
  cumulativeBurnWeight: bigint;
  immolatedWeight: bigint;
  immolatedPendingEth: bigint;
  isLP: boolean;
  drip: StakingPosition["drip"];
  boost: StakingPosition["boost"];
  totalBurned: bigint;
  scalingFactor: number;
}

// Quest-completer boost, ~5 days left (shown only to the earner).
const questBoost = (): StakingPosition["boost"] => ({
  factor: 1.2,
  expiresAt: Date.now() + 5 * 24 * 3600_000,
  source: "quest",
});

function seedWorld(persona: Persona): World {
  switch (persona) {
    case "newcomer":
      return {
        liquid: pyre(4_200),
        staked: 0n,
        pendingRewardsEth: 0n,
        cumulativeBurnWeight: 0n,
        immolatedWeight: 0n,
        immolatedPendingEth: 0n,
        isLP: false,
        drip: null,
        boost: null, // hasn't completed the quests
        totalBurned: pyre(2_400_000),
        scalingFactor: 0.91,
      };
    case "veteran":
      return {
        liquid: pyre(128_500),
        staked: pyre(540_000),
        pendingRewardsEth: 318_000_000_000_000_000n, // 0.318 ETH
        cumulativeBurnWeight: pyre(320_000),
        immolatedWeight: pyre(45_000),
        immolatedPendingEth: 92_000_000_000_000_000n,
        isLP: true,
        drip: null,
        boost: questBoost(),
        totalBurned: pyre(2_400_000),
        scalingFactor: 0.91,
      };
    case "burner":
    default:
      return {
        liquid: pyre(61_300),
        staked: pyre(180_000),
        pendingRewardsEth: 74_000_000_000_000_000n, // 0.074 ETH
        cumulativeBurnWeight: pyre(92_000), // FLAME, climbing to FORGE
        immolatedWeight: 0n,
        immolatedPendingEth: 0n,
        isLP: false,
        drip: null,
        boost: questBoost(),
        totalBurned: pyre(2_400_000),
        scalingFactor: 0.91,
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
      activeFireSpirits: 1_284,
      totalEthDistributed: pyre(2_190).valueOf(), // ~2190 ETH all-time (display only)
      volume24h: 940_000_000_000_000_000_000n, // ~940 ETH
      bonfire: bonfireState(w.totalBurned),
      burnRateSeries: burnSeries(),
    };
  }

  async getFireSpirit(_address: Address): Promise<FireSpirit> {
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
    const mult = BigInt(Math.round(STAGES[stage].multiplier * 1000));
    return {
      liquidBalance: w.liquid,
      stakedBalance: w.staked,
      pendingRewardsEth: w.pendingRewardsEth,
      effectiveWeight: (w.staked * mult) / 1000n,
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
      mk(1, "claim", w.pendingRewardsEth, "claimed ETH yield"),
      mk(2, "burn", pyre(40_000), "burned $PYRE"),
      mk(3, "stake", pyre(180_000), "staked $PYRE"),
      mk(4, "mint", pyre(10_000), "EMBER minted"),
      mk(5, "burn", pyre(10_000), "burned $PYRE"),
    ];
  }

  async getImmolatedPosition(_address: Address): Promise<ImmolatedPosition> {
    await wait(LATENCY_MS);
    const w = this.world;
    const { stage } = stageFromWeight(w.cumulativeBurnWeight);
    const isMember = stage >= 4 && w.immolatedWeight >= IMMOLATED_MIN_BURN;
    return {
      isMember,
      weight: w.immolatedWeight,
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
      claim: "claimed ETH yield",
      swap: "swapped ETH → $PYRE",
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
        title: "Era 0 is live — the fire is lit",
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
        externalUrl: "https://opensea.io/",
        svg: null,
      };
    });
    return all.filter(
      (l) =>
        (filter?.stage ? l.stage === filter.stage : true) &&
        (filter?.lpOnly ? l.isLP : true) &&
        (filter?.immolatedOnly ? l.isImmolated : true)
    );
  }

  async getSwapQuote(direction: SwapDirection, amountIn: bigint): Promise<SwapQuote> {
    await wait(120);
    const price = 0.0000021; // PYRE price in ETH (placeholder)
    const out =
      direction === "buy"
        ? (amountIn * WAD) / BigInt(Math.round(price * 1e18)) // eth->pyre
        : (amountIn * BigInt(Math.round(price * 1e18))) / WAD; // pyre->eth
    const feeBps = TOTAL_FEE_BPS; // launch fee layered on in ChainDataSource later
    return {
      direction,
      amountIn,
      amountOut: (out * BigInt(10_000 - feeBps)) / 10_000n,
      priceImpact: Number(amountIn) / 1e24, // tiny placeholder
      feeBps,
      feeDisposition: direction === "sell" ? "burned permanently" : "to the reward pool",
      pricePyreInEth: price,
    };
  }

  // Quests are off-chain + permanent — real backend in every mode (see
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

  async burnLP(_address: Address, _ethAmount: bigint, pyreAmount: bigint): Promise<TxResult> {
    await wait(TX_MS);
    const weight = BigInt(Math.round(Number(pyreAmount) * LP_WEIGHT_BONUS));
    this.world.cumulativeBurnWeight += weight;
    this.world.totalBurned += pyreAmount;
    this.world.isLP = true;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async claimStakingRewards(_address: Address): Promise<TxResult> {
    await wait(TX_MS);
    this.world.pendingRewardsEth = 0n;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async immolatedBurn(_address: Address, amount: bigint): Promise<TxResult> {
    await wait(TX_MS);
    if (amount < IMMOLATED_MIN_BURN) return { ok: false, error: "Below minimum burn" };
    this.world.immolatedWeight += amount;
    this.world.totalBurned += amount;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async claimImmolatedYield(_address: Address): Promise<TxResult> {
    await wait(TX_MS);
    this.world.immolatedPendingEth = 0n;
    return { ok: true, hash: `0x${randHex(64)}` };
  }

  async swap(_address: Address, _direction: SwapDirection, _amountIn: bigint): Promise<TxResult> {
    await wait(TX_MS);
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
