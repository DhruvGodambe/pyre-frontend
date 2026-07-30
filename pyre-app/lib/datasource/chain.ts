/* ============================================================================
   PYRE, ChainDataSource (LIVE, wired against the deployed Sepolia contracts)
   ----------------------------------------------------------------------------
   Every DataSource method is implemented on-chain. Three kinds of source:

     • Direct views/writes on PyreToken / PyreStaking / the Acolyte NFT /
       ImmolatedGate / the hook diamond (wagmi readContract / writeContract).
     • The EVENT LOG layer (./events.ts) for everything the contracts have no
       getter for: activity feeds, per-user history, leaderboards, total burned,
       total staked, Acolyte count, all-time $ETH distributed, 24h volume.
     • The Black Market reads return EMPTY until a marketplace carries the
       collection (no marketplace exists on the testnet); the panel's designed
       empty state covers it.

   Writes self-heal the network: every write first asks the wallet to switch to
   the configured chain (ensureChain), so a wallet parked on mainnet gets a
   switch prompt instead of a raw chain-mismatch error.

   ────────────────────────────────────────────────────────────────────────────
   THE GRAND EXCHANGE, Uniswap v4 swap wiring — IMPLEMENTED + Sepolia-verified
   ────────────────────────────────────────────────────────────────────────────
   PYRE↔ETH against our own v4 pool (the one carrying the PYRE Diamond hook).
   Addresses are in lib/config.ts; ABIs + the PoolKey/poolId derivation are in
   ./abis.ts. The pool was verified live on Sepolia (initialized + funded; the
   poolId here matches on-chain, and getSlot0/getLiquidity/the Quoter all answer).

   Reads use the wagmi public transport (work for a disconnected visitor too);
   writes go through the connected wallet (wagmi connector). Buy = ETH→PYRE
   (zeroForOne true), sell = PYRE→ETH (false).

     getSwapQuote   → V4Quoter.quoteExact{Input,Output}Single, OFF-CHAIN via
                      simulateContract (state-mutating-by-signature, reverts to
                      return). The returned amounts already include BOTH the pool
                      fee and the Diamond hook fee, so the numbers we trade on are
                      exact. Spot price / impact split come from StateView slot0 +
                      a virtual-reserve model (L, sqrtP).
     getPoolState   → StateView.getSlot0 + getLiquidity → price, TVL, liquidity.
     getSwapBalances→ getBalance(native ETH) + PyreToken.balanceOf.
     getApprovalState→ Sepolia (V4Router04): plain ERC-20 allowance to router.
                      Robinhood (Universal Router): ERC-20 → Permit2 + Permit2
                      allowance for the UR. Buys: not-required (native ETH).
     approveToken   → Sepolia: approve(router). Robinhood: approve(Permit2) then
                      Permit2.approve(token, UR, max, expiration).
     swap           → Sepolia: IUniswapV4Router04.swapExactTokensForTokens.
                      Robinhood: UniversalRouter.execute(V4_SWAP) with the same
                      PoolKey (hooks = diamond) as quotes.

   STILL APPROXIMATE (display only): the ETH/USD price is a keyless spot feed
   w/ constant fallback (swap for Chainlink before mainnet). The hook fee bps
   now come straight from the diamond (getCurrent{Buy,Sell}FeeBps); the LAUNCH
   portion is derived as (current − 500), because the schedule's final bps
   (DEFAULT_FINAL_*_FEE_BPS = 500) has no on-chain getter. Neither affects the
   amounts you actually trade. */

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
  SwapQuote,
  SwapQuoteParams,
  SwapDirection,
  PoolState,
  SwapBalances,
  ApprovalState,
  QuestTask,
} from "../types";
import type { DataSource, TxResult, MarketFilter, SwapParams, CreateLpParams } from "./types";
import {
  fetchQuestTasks,
  completeQuestTask as completeQuestTaskApi,
  submitWallet as submitWalletApi,
} from "../quests/client";
import {
  createPublicClient,
  http,
  maxUint256,
  parseAbiItem,
  type Hex,
  type PublicClient,
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import {
  readContract,
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
  getBalance,
  getAccount,
  getPublicClient,
  switchChain,
} from "wagmi/actions";
import { wagmiConfig } from "../wagmi";
import {
  CHAIN_ID,
  CONTRACTS,
  DEPLOY_ANCHOR,
  POOL,
  SWAP_ROUTER,
  TOKENS,
  USE_UNIVERSAL_ROUTER,
  V4,
} from "../config";
import { robinhood } from "../chains";
import { toNumber } from "../format";
import {
  ERC20_ABI,
  STATE_VIEW_ABI,
  V4_QUOTER_ABI,
  V4_ROUTER_ABI,
  UNIVERSAL_ROUTER_ABI,
  PERMIT2_ABI,
  IMMOLATED_GATE_ABI,
  ACOLYTE_ABI,
  PYRE_TOKEN_ABI,
  PYRE_STAKING_ABI,
  DIAMOND_ABI,
  POSITION_MANAGER_ABI,
  getPoolKey,
  getPoolId,
  type PoolKey,
} from "./abis";
import { buildV4SwapExecuteArgs } from "./universal-router";
import { encodeMintLpUnlock, liquidityForAmounts } from "./lp-mint";
import {
  getChainActivity,
  getChainHistory,
  getChainLeaderboard,
  getChainTopBurners,
  getChainAggregates,
  type ChainAggregates,
} from "./events";
import {
  WAD,
  IMMOLATED_YIELD_BOOST,
  STAGES,
  stageFromWeight,
  SUPPLY_CAP,
  HALVING_INTERVAL_EPOCHS,
  bonfireState,
} from "../constants";

/** Dedicated read client for Observatory (bypasses wagmi). Same RPC as the
    wallet transport; used so protocol stats never stall on connector setup. */
const READ_RPC =
  CHAIN_ID === 4663
    ? (process.env.NEXT_PUBLIC_RPC_ROBINHOOD ?? "https://rpc.mainnet.chain.robinhood.com")
    : CHAIN_ID === 11155111
      ? (process.env.NEXT_PUBLIC_RPC_SEPOLIA ?? "https://sepolia.gateway.tenderly.co")
      : (process.env.NEXT_PUBLIC_RPC_MAINNET ?? "https://cloudflare-eth.com");

const readClient: PublicClient = createPublicClient({
  chain: CHAIN_ID === 1 ? mainnet : CHAIN_ID === 4663 ? robinhood : sepolia,
  transport: http(READ_RPC, { timeout: 12_000 }),
});

/* ---- Grand Exchange helpers ------------------------------------------------ */

/** The active chain id, typed to the ids registered in wagmiConfig. */
const CHAIN = CHAIN_ID as 1 | 11155111 | 4663;

const Q96 = 2n ** 96n;
const QUOTE_TTL_MS = 30_000; // quote refresh window (~Uniswap)
const GAS_GWEI = 8n; // testnet gas price assumption for the gas-cost display only
const HIGH_IMPACT = 0.08; // 8%+ → surface a price-impact warning
/** Permit2 amount/expiration ceilings (uint160 / uint48). */
const MAX_UINT160 = (1n << 160n) - 1n;
/** uint48 max — fits in JS safe integer; viem types expiration as number. */
const MAX_UINT48 = Number((1n << 48n) - 1n);

/** ETH/USD for the display-only USD fields. Keyless Coinbase spot, cached 60s,
    with a constant fallback so USD never blocks a swap. Replace with a Chainlink
    feed / server route before mainnet (see [[chain_wallet_integration]]). */
let ethUsdCache = { v: 3000, at: 0 };
async function getEthUsd(): Promise<number> {
  const now = Date.now();
  if (now - ethUsdCache.at < 60_000) return ethUsdCache.v;
  try {
    const r = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot");
    const j = await r.json();
    const v = Number(j?.data?.amount);
    if (isFinite(v) && v > 0) ethUsdCache = { v, at: now };
  } catch {
    /* offline / rate-limited: keep the last value */
  }
  return ethUsdCache.v;
}

/** PoolKey + poolId, or throw a clear error if the pool isn't configured. */
function requirePool(): { key: PoolKey; poolId: Hex } {
  const key = getPoolKey();
  if (!key) throw new Error("Pool not configured: missing PYRE token / hook address.");
  if (!V4) throw new Error(`No Uniswap v4 deployment configured for chain ${CHAIN_ID}.`);
  return { key, poolId: getPoolId(key) };
}

function emptyChainAggregates(): ChainAggregates {
  const now = Date.now();
  const dayAgo = now - 24 * 3600_000;
  const bucketMs = 3600_000;
  const firstBucket = Math.floor(dayAgo / bucketMs) * bucketMs;
  const burnRateSeries = [];
  for (let t = firstBucket; t <= now; t += bucketMs) burnRateSeries.push({ t, value: 0 });
  return {
    totalBurned: 0n,
    totalStaked: 0n,
    activeAcolytes: 0,
    totalEthDistributed: 0n,
    volume24h: 0n,
    burnRateSeries,
  };
}

/** Last successful log-derived aggregates (burned / staked / volume / …). */
let cachedAggregates: ChainAggregates | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      () => {
        clearTimeout(t);
        resolve(fallback);
      }
    );
  });
}

/** sqrtPriceX96 → currency1-per-currency0 (PYRE per ETH; both 18 decimals). */
function priceFromSqrt(sqrtPriceX96: bigint): number {
  const sp = Number(sqrtPriceX96) / Number(Q96);
  return sp * sp;
}

/** Virtual reserves at the current price from active liquidity (full-range
    approximation): amount0 = L·2^96/√P, amount1 = L·√P/2^96. Used for TVL and to
    split fee vs price-impact; the traded amounts come from the Quoter regardless. */
function virtualReserves(L: bigint, sqrtPriceX96: bigint): { eth: bigint; pyre: bigint } {
  if (sqrtPriceX96 === 0n) return { eth: 0n, pyre: 0n };
  return { eth: (L * Q96) / sqrtPriceX96, pyre: (L * sqrtPriceX96) / Q96 };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
/** Scale a base-unit amount by a 0..1 fraction without precision loss. */
const scaleBy = (amount: bigint, frac: number): bigint =>
  (amount * BigInt(Math.round(clamp(frac, 0, 1_000_000) * 1_000_000))) / 1_000_000_000_000n;

function errMsg(e: unknown): string {
  if (e && typeof e === "object") {
    const o = e as { shortMessage?: string; message?: string };
    if (o.shortMessage) return o.shortMessage;
    if (o.message) return o.message;
  }
  return "Transaction failed.";
}

export class ChainDataSource implements DataSource {
  /** protocolStartTime is immutable; cache it after the first read. */
  private startTime: bigint | null = null;
  private async getStartTime(token: Address): Promise<bigint> {
    if (this.startTime === null) {
      this.startTime = await readClient.readContract({
        address: token,
        abi: PYRE_TOKEN_ABI,
        functionName: "protocolStartTime",
      });
    }
    return this.startTime;
  }

  /** Ask the wallet to switch to the configured chain before any write, so a
      wallet parked on another network gets a switch prompt, not a raw
      chain-mismatch error. Reads never need this (public transport is pinned). */
  private async ensureChain(): Promise<void> {
    const account = getAccount(wagmiConfig);
    if (account.isConnected && account.chainId !== CHAIN) {
      await switchChain(wagmiConfig, { chainId: CHAIN });
    }
  }

  // The Observatory's global stats. Live token/staking reads go through a
  // dedicated viem client (not wagmi). Burned / staking-ratio / volume / ETH
  // distributed come from event-log aggregates (no on-chain getters). Sync is
  // capped (see events.ts) and waited on with a timeout so the panel still
  // paints; a successful sync is cached for the next refetch.
  async getProtocolStats(): Promise<ProtocolStats> {
    const token = CONTRACTS.token;
    const staking = CONTRACTS.staking;
    if (!token) throw new Error("Token address not configured.");
    const fallbackAgg = cachedAggregates ?? emptyChainAggregates();
    const aggPromise = getChainAggregates()
      .then((a) => {
        cachedAggregates = a;
        return a;
      })
      .catch(() => fallbackAgg);

    const hook = CONTRACTS.hook;
    const [totalSupply, epoch, decayIdx, startTime, poolBal, agg, hookFees] = await Promise.all([
      readClient.readContract({ address: token, abi: PYRE_TOKEN_ABI, functionName: "totalSupply" }),
      readClient.readContract({ address: token, abi: PYRE_TOKEN_ABI, functionName: "currentEpoch" }),
      readClient.readContract({ address: token, abi: PYRE_TOKEN_ABI, functionName: "globalDecayIndex" }),
      this.getStartTime(token),
      staking ? readClient.getBalance({ address: staking }) : Promise.resolve(0n),
      withTimeout(aggPromise, 20_000, fallbackAgg),
      hook
        ? readClient
            .readContract({ address: hook, abi: DIAMOND_ABI, functionName: "getTotalEthDistributed" })
            .catch(() => [0n, 0n] as const)
        : Promise.resolve([0n, 0n] as const),
    ]);
    const decayBps = await readClient.readContract({
      address: token,
      abi: PYRE_TOKEN_ABI,
      functionName: "decayRateBps",
      args: [epoch],
    });
    const [totalEthToYieldPool, totalEthToTeam] = hookFees;
    // Prefer the diamond's cumulative yield routing over log-derived RewardAdded
    // (more accurate for dust fees; logs can lag).
    const totalEthDistributed =
      totalEthToYieldPool > 0n ? totalEthToYieldPool : agg.totalEthDistributed;
    const halving = BigInt(HALVING_INTERVAL_EPOCHS);
    const supply = toNumber(totalSupply);
    return {
      totalSupply,
      totalBurned: agg.totalBurned,
      supplyCap: SUPPLY_CAP,
      decayRatePerHour: Number(decayBps) / 10_000,
      era: Number(epoch / halving),
      epochsUntilHalving: HALVING_INTERVAL_EPOCHS - Number(epoch % halving),
      nextEpochAt: Number(startTime + (epoch + 1n) * 3600n) * 1000,
      scalingFactor: toNumber(decayIdx), // WAD-scaled index, starts at 1.0
      stakingRatio: supply > 0 ? clamp(toNumber(agg.totalStaked) / supply, 0, 1) : 0,
      totalStaked: agg.totalStaked,
      activeAcolytes: agg.activeAcolytes,
      totalEthDistributed,
      pendingYieldPoolEth: poolBal,
      totalEthToYieldPool,
      totalEthToTeam,
      volume24h: agg.volume24h,
      bonfire: bonfireState(agg.totalBurned),
      burnRateSeries: agg.burnRateSeries,
    };
  }

  // The Forge's Acolyte: the burn NFT. tokenId 0 = none yet, in which case the
  // burn accrued toward the 10k EMBER mint lives in pendingBurn (so the panel can
  // show a "progress to your first Acolyte" bar). Tier + next threshold come from
  // the cumulative burn via the SAME thresholds the contract uses.
  async getAcolyte(address: Address): Promise<Acolyte> {
    const nft = CONTRACTS.nft;
    if (!nft) throw new Error("Acolyte (NFT) address not configured.");
    const [tokenId, isLP, isImmolated] = await Promise.all([
      readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "walletToTokenId", args: [address] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "lpBurners", args: [address] }),
      CONTRACTS.immolated
        ? readContract(wagmiConfig, { chainId: CHAIN, address: CONTRACTS.immolated, abi: IMMOLATED_GATE_ABI, functionName: "isImmolated", args: [address] })
        : Promise.resolve(false),
    ]);
    const exists = tokenId !== 0n;
    const cumulative = exists
      ? await readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "acolyteCumulativeBurn", args: [tokenId] })
      : await readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "pendingBurn", args: [address] });
    const { stage, nextThreshold } = stageFromWeight(cumulative);
    return {
      exists,
      tokenId: exists ? Number(tokenId) : null,
      stage,
      stageName: STAGES[stage].name,
      multiplier: STAGES[stage].multiplier,
      cumulativeBurnWeight: cumulative,
      nextStageThreshold: nextThreshold,
      isLP,
      isImmolated,
      seed: null,
      svg: null,
    };
  }

  // The Vault's staking position. Stake earns the ETH yield; burning (the Forge)
  // raises the multiplier baked into effectiveWeight. Unstaking opens a 7-day
  // drip on the token, claimed via claimDrip; the schedule's start isn't exposed
  // on-chain, so the countdown is a 7-day approximation while the amounts are exact.
  async getStakingPosition(address: Address): Promise<StakingPosition> {
    const token = CONTRACTS.token;
    const staking = CONTRACTS.staking;
    if (!token || !staking) throw new Error("Token / staking address not configured.");
    const [liquid, staked, pendingRewardsEth, effectiveWeight, lockedDrip] = await Promise.all([
      readContract(wagmiConfig, { chainId: CHAIN, address: token, abi: PYRE_TOKEN_ABI, functionName: "liquidBalanceOf", args: [address] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: staking, abi: PYRE_STAKING_ABI, functionName: "stakedBalanceOf", args: [address] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: staking, abi: PYRE_STAKING_ABI, functionName: "earned", args: [address] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: staking, abi: PYRE_STAKING_ABI, functionName: "weightOf", args: [address] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: token, abi: PYRE_TOKEN_ABI, functionName: "dripBalanceOf", args: [address] }),
    ]);
    // No view returns the vested-but-unclaimed drip, so preview claimDrip off-chain.
    let claimableDrip = 0n;
    try {
      const sim = await simulateContract(wagmiConfig, { chainId: CHAIN, account: address, address: token, abi: PYRE_TOKEN_ABI, functionName: "claimDrip", args: [] });
      claimableDrip = sim.result;
    } catch {
      /* nothing vesting */
    }
    const dripTotal = lockedDrip + claimableDrip;
    const drip =
      dripTotal > 0n
        ? {
            total: dripTotal,
            claimable: claimableDrip,
            claimed: 0n,
            decayLoss: 0n,
            startedAt: Date.now(),
            completeAt: Date.now() + 7 * 24 * 3600 * 1000, // schedule start not on-chain; 7-day cap
          }
        : null;
    return { liquidBalance: liquid, stakedBalance: staked, pendingRewardsEth, effectiveWeight, drip, boost: null };
  }
  // The Hall of the Immolated: membership + eligibility, so the panel can pick its
  // state (not-eligible / eligible→Ascend / member). isMember is the ImmolatedGate
  // flag; eligibility is derived from the Acolyte's cumulative burn.
  // TODO(contract): the DEPLOYED gate uses "burned past Pyre" and no Ascend-burn cost.
  // TARGET (see mock + concept/CORE.md): eligible on REACHING Pyre, then the Ascend
  // rite burns 100K $PYRE (LP path pairs equivalent $ETH). Update when the contract lands.
  // The yield itself arrives via PyreStaking (one shared pool), so there's no
  // separate Immolated pending/pool to read here.
  async getImmolatedPosition(address: Address): Promise<ImmolatedPosition> {
    const gate = CONTRACTS.immolated;
    const nft = CONTRACTS.nft;
    if (!gate || !nft) throw new Error("Pool not configured: missing Immolated gate / Acolyte address.");

    const [isMember, tokenId, pyreThreshold, lpBonus] = await Promise.all([
      readContract(wagmiConfig, { chainId: CHAIN, address: gate, abi: IMMOLATED_GATE_ABI, functionName: "isImmolated", args: [address] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "walletToTokenId", args: [address] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "PYRE_THRESHOLD", args: [] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "lpBurnBonus", args: [address] }),
    ]);

    const weight = tokenId > 0n
      ? await readContract(wagmiConfig, { chainId: CHAIN, address: nft, abi: ACOLYTE_ABI, functionName: "acolyteCumulativeBurn", args: [tokenId] })
      : 0n;

    // Eligible = own an Acolyte that REACHED Pyre (token + LP burns both
    // accumulate here), matching the deployed gate's stage check. The rite then
    // burns its own extra cost via burnFrom (see ascendImmolated); immolate()
    // enforces the real rule on chain either way.
    const eligible = tokenId > 0n && weight >= pyreThreshold;

    return {
      isMember,
      eligible,
      weight,
      yieldBoost: IMMOLATED_YIELD_BOOST,
      boostedWeight: (weight * 12n) / 10n, // +20% Immolated yield
      pendingYieldEth: 0n, // one shared pool: Immolated yield is paid through staking rewards
      rank: null, // the gate doesn't rank members; the Hall of Fame uses the leaderboard source
      poolTotalWeight: 0n, // not tracked on-chain by the gate
      isLP: lpBonus > WAD,
    };
  }
  // Feeds, history and leaderboards are pure event-log derivations (./events.ts).
  getUserHistory(address: Address): Promise<ActivityEvent[]> { return getChainHistory(address); }
  getLeaderboard(): Promise<LeaderboardEntry[]> { return getChainLeaderboard(); }
  getTopBurners(): Promise<LeaderboardEntry[]> { return getChainTopBurners(); }
  getActivityFeed(): Promise<ActivityEvent[]> { return getChainActivity(); }

  // The Bonfire's announcements, computed from the live decay clock so they are
  // always true without anyone editing copy: which era burns now, and when the
  // decay next halves.
  async getAnnouncements(): Promise<Announcement[]> {
    const token = CONTRACTS.token;
    if (!token) return [];
    const [epoch, startTime] = await Promise.all([
      readContract(wagmiConfig, { chainId: CHAIN, address: token, abi: PYRE_TOKEN_ABI, functionName: "currentEpoch", args: [] }),
      this.getStartTime(token),
    ]);
    const decayBps = await readContract(wagmiConfig, { chainId: CHAIN, address: token, abi: PYRE_TOKEN_ABI, functionName: "decayRateBps", args: [epoch] });
    const halving = BigInt(HALVING_INTERVAL_EPOCHS);
    const era = Number(epoch / halving);
    const epochsLeft = HALVING_INTERVAL_EPOCHS - Number(epoch % halving);
    const days = Math.max(1, Math.round(epochsLeft / 24));
    const rate = Number(decayBps) / 100; // bps → %/hr
    const nextRate = Math.max(0.01, rate / 2);
    const halvingEpoch = ((era + 1) * HALVING_INTERVAL_EPOCHS).toLocaleString("en-US");
    return [
      {
        id: "era",
        title: `Era ${era} is live, the fire is lit`,
        body: `Decay runs at ${rate}%/hr. Stake to preserve, burn to forge.`,
        pinned: true,
        at: Number(startTime) * 1000,
      },
      {
        id: "halving",
        title: `Next halving in ~${days} day${days === 1 ? "" : "s"}`,
        body: `Decay halves to ${nextRate}%/hr at epoch ${halvingEpoch}.`,
        pinned: false,
        at: Date.now(),
      },
    ];
  }

  // Black Market = a branded window over OpenSea/Blur. No marketplace carries
  // the collection yet (and none exists on the testnet), so both reads answer
  // EMPTY and the panel's designed cold-market state shows. When the collection
  // lists at launch: listings → the marketplace's listings API filtered by
  // collection + trait (stage/LP/immolated) + sort; activity → its events API.
  async getMarketListings(_f?: MarketFilter): Promise<MarketListing[]> { return []; }
  async getMarketActivity(_f?: MarketFilter): Promise<MarketActivityEvent[]> { return []; }
  // --- The Grand Exchange (implemented; see the header) --------------------
  async getSwapQuote(p: SwapQuoteParams): Promise<SwapQuote> {
    const { key, poolId } = requirePool();
    const isBuy = p.direction === "buy";
    const zeroForOne = isBuy; // ETH(currency0) → PYRE(currency1)

    const [slot0, liquidity, ethUsd, hookBps] = await Promise.all([
      readContract(wagmiConfig, { chainId: CHAIN, address: V4!.stateView, abi: STATE_VIEW_ABI, functionName: "getSlot0", args: [poolId] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: V4!.stateView, abi: STATE_VIEW_ABI, functionName: "getLiquidity", args: [poolId] }),
      getEthUsd(),
      // The live hook fee for this side (launch decay included), straight from
      // the diamond. Falls back to the measured split if the read fails.
      CONTRACTS.hook
        ? readContract(wagmiConfig, { chainId: CHAIN, address: CONTRACTS.hook, abi: DIAMOND_ABI, functionName: isBuy ? "getCurrentBuyFeeBps" : "getCurrentSellFeeBps", args: [] }).catch(() => null)
        : Promise.resolve(null),
    ]);
    const sqrtPriceX96 = slot0[0];
    const lpFeePips = Number(slot0[3]);
    const price1per0 = priceFromSqrt(sqrtPriceX96); // PYRE per ETH
    const pricePyreInEth = price1per0 > 0 ? 1 / price1per0 : 0;
    const pricePyreUsd = pricePyreInEth * ethUsd;
    const midOutPerIn = isBuy ? price1per0 : pricePyreInEth; // output per input, spot

    // The Quoter answers the real swap (pool fee + hook fee included). It reverts
    // when the pool can't fill the size → surface as an insufficient-liquidity quote.
    let amountIn: bigint;
    let amountOut: bigint;
    let gasUnits: bigint;
    try {
      const params = { poolKey: key, zeroForOne, exactAmount: p.amount, hookData: "0x" as Hex };
      if (p.kind === "exactIn") {
        const sim = await simulateContract(wagmiConfig, { chainId: CHAIN, address: V4!.v4Quoter, abi: V4_QUOTER_ABI, functionName: "quoteExactInputSingle", args: [params] });
        amountIn = p.amount;
        [amountOut, gasUnits] = sim.result;
      } else {
        const sim = await simulateContract(wagmiConfig, { chainId: CHAIN, address: V4!.v4Quoter, abi: V4_QUOTER_ABI, functionName: "quoteExactOutputSingle", args: [params] });
        amountOut = p.amount;
        [amountIn, gasUnits] = sim.result;
      }
    } catch {
      throw new Error("No quote available — the pool may lack liquidity for this size.");
    }

    const inHuman = toNumber(amountIn);
    const outHuman = toNumber(amountOut);
    const inUsdRate = isBuy ? ethUsd : pricePyreUsd;
    const outUsdRate = isBuy ? pricePyreUsd : ethUsd;

    // Split fee vs price-impact against a no-fee constant-product curve built from
    // the virtual reserves. Approximate (the real LP may be concentrated), and the
    // hook/launch split needs the hook getter — but the TOTAL fee is measured.
    const r = virtualReserves(liquidity, sqrtPriceX96);
    const reserveIn = toNumber(isBuy ? r.eth : r.pyre);
    const reserveOut = toNumber(isBuy ? r.pyre : r.eth);
    const idealOut = inHuman * midOutPerIn; // spot, no fee/impact
    const ammNoFeeOut = reserveIn > 0 ? reserveOut - (reserveOut * reserveIn) / (reserveIn + inHuman) : 0;
    const priceImpact = idealOut > 0 ? clamp((idealOut - ammNoFeeOut) / idealOut, 0, 1) : 0;
    const feeFraction = ammNoFeeOut > 0 ? clamp((ammNoFeeOut - outHuman) / ammNoFeeOut, 0, 1) : 0;
    const lpFeeBps = Math.round(lpFeePips / 100);
    const totalFeeBps = Math.round(feeFraction * 10_000);
    // Hook fee: exact from the diamond when readable, else measured-minus-lp.
    // The launch portion = whatever sits above the schedule's resting fee
    // (DEFAULT_FINAL_*_FEE_BPS = 500; the final bps has no on-chain getter).
    const hookFeeBps = hookBps !== null ? Number(hookBps) : Math.max(0, totalFeeBps - lpFeeBps);
    const launchFeeBps = hookBps !== null ? Math.max(0, Number(hookBps) - 500) : 0;

    let warning: SwapQuote["warning"] = null;
    if (priceImpact >= HIGH_IMPACT) warning = { kind: "highPriceImpact", impact: priceImpact };
    else if (outHuman > 0 && amountOut === 0n) warning = { kind: "minimalOutput" };

    const slip = Math.max(0, p.slippageBps) / 10_000;
    const gasCostWei = gasUnits * GAS_GWEI * 1_000_000_000n;

    return {
      kind: p.kind,
      direction: p.direction,
      input: { token: isBuy ? TOKENS.eth : TOKENS.pyre, amount: amountIn, usd: inHuman * inUsdRate },
      output: { token: isBuy ? TOKENS.pyre : TOKENS.eth, amount: amountOut, usd: outHuman * outUsdRate },
      executionPrice: inHuman > 0 ? outHuman / inHuman : midOutPerIn,
      midPrice: midOutPerIn,
      priceImpact,
      fee: {
        lpFeeBps,
        hookFeeBps,
        launchFeeBps,
        totalFeeBps,
        feeAmount: scaleBy(amountIn, feeFraction),
        feeUsd: inHuman * feeFraction * inUsdRate,
        disposition: isBuy ? "to the reward pool" : "burned permanently",
      },
      minReceived: p.kind === "exactIn" ? scaleBy(amountOut, 1 - slip) : 0n,
      maxSold: p.kind === "exactOut" ? scaleBy(amountIn, 1 + slip) : 0n,
      slippageBps: p.slippageBps,
      route: [{
        poolId,
        feeTier: POOL.feeTier,
        isDynamicFee: POOL.isDynamicFee,
        hook: key.hooks,
        tokenIn: isBuy ? "$ETH" : "PYRE",
        tokenOut: isBuy ? "PYRE" : "$ETH",
      }],
      gasEstimate: gasCostWei,
      gasUsd: toNumber(gasCostWei) * ethUsd,
      expiresAt: Date.now() + QUOTE_TTL_MS,
      warning,
    };
  }

  async getPoolState(): Promise<PoolState> {
    const { key, poolId } = requirePool();
    const [slot0, liquidity, ethUsd] = await Promise.all([
      readContract(wagmiConfig, { chainId: CHAIN, address: V4!.stateView, abi: STATE_VIEW_ABI, functionName: "getSlot0", args: [poolId] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: V4!.stateView, abi: STATE_VIEW_ABI, functionName: "getLiquidity", args: [poolId] }),
      getEthUsd(),
    ]);
    const sqrtPriceX96 = slot0[0];
    const price1per0 = priceFromSqrt(sqrtPriceX96); // PYRE per ETH
    const pricePyreInEth = price1per0 > 0 ? 1 / price1per0 : 0;
    const pricePyreUsd = pricePyreInEth * ethUsd;
    const r = virtualReserves(liquidity, sqrtPriceX96);
    const tvlUsd = toNumber(r.eth) * ethUsd + toNumber(r.pyre) * pricePyreUsd;
    return {
      poolId,
      currency0: TOKENS.eth,
      currency1: TOKENS.pyre,
      feeTier: POOL.feeTier,
      isDynamicFee: POOL.isDynamicFee,
      tickSpacing: POOL.tickSpacing,
      hook: key.hooks,
      sqrtPriceX96,
      tick: Number(slot0[1]),
      liquidity,
      tvlUsd,
      pricePyreInEth,
      pricePyreUsd,
      ethUsd,
    };
  }

  async getSwapBalances(address: Address): Promise<SwapBalances> {
    const { poolId } = requirePool();
    const token = CONTRACTS.token;
    const [ethBal, pyreBal, slot0, ethUsd] = await Promise.all([
      getBalance(wagmiConfig, { address, chainId: CHAIN }),
      token
        ? readContract(wagmiConfig, { chainId: CHAIN, address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [address] })
        : Promise.resolve(0n),
      readContract(wagmiConfig, { chainId: CHAIN, address: V4!.stateView, abi: STATE_VIEW_ABI, functionName: "getSlot0", args: [poolId] }),
      getEthUsd(),
    ]);
    const price1per0 = priceFromSqrt(slot0[0]);
    const pricePyreUsd = (price1per0 > 0 ? 1 / price1per0 : 0) * ethUsd;
    return {
      pyre: pyreBal,
      eth: ethBal.value,
      pyreUsd: toNumber(pyreBal) * pricePyreUsd,
      ethUsd: toNumber(ethBal.value) * ethUsd,
    };
  }

  async getApprovalState(address: Address, direction: SwapDirection, amount: bigint): Promise<ApprovalState> {
    if (direction === "buy") return { status: "not-required" }; // native ETH input
    if (amount <= 0n) return { status: "ready" };
    const token = CONTRACTS.token;
    if (!token || !SWAP_ROUTER) throw new Error("Pool not configured: missing PYRE token / router address.");

    if (USE_UNIVERSAL_ROUTER) {
      // UR settles ERC-20 via Permit2: need token→Permit2 allowance AND
      // Permit2 allowance for the Universal Router (unexpired, covering amount).
      if (!V4) throw new Error(`No Uniswap v4 deployment configured for chain ${CHAIN_ID}.`);
      const permit2 = V4.permit2;
      const [erc20Allowance, permit2Allowance] = await Promise.all([
        readContract(wagmiConfig, {
          chainId: CHAIN,
          address: token,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, permit2],
        }),
        readContract(wagmiConfig, {
          chainId: CHAIN,
          address: permit2,
          abi: PERMIT2_ABI,
          functionName: "allowance",
          args: [address, token, SWAP_ROUTER],
        }),
      ]);
      const now = BigInt(Math.floor(Date.now() / 1000));
      const [p2Amount, p2Expiration] = permit2Allowance;
      const permit2Ok = p2Amount >= amount && p2Expiration >= now;
      return erc20Allowance >= amount && permit2Ok
        ? { status: "ready" }
        : { status: "needs-approval" };
    }

    // V4Router04: plain ERC-20 approval to the router.
    const allowance = await readContract(wagmiConfig, {
      chainId: CHAIN,
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, SWAP_ROUTER],
    });
    return allowance >= amount ? { status: "ready" } : { status: "needs-approval" };
  }
  // Quests are off-chain + permanent, already live, even before contracts ship.
  getQuestTasks(_a: Address | null): Promise<QuestTask[]> { return fetchQuestTasks(); }
  // --- Forge / Vault writes. Stake, unstake and burn are INTERNAL balance moves
  // in PyreToken, so NONE need an ERC-20 approval. ---
  async stake(address: Address, amount: bigint): Promise<TxResult> {
    return this.send(address, CONTRACTS.staking, PYRE_STAKING_ABI, "stake", [amount]);
  }
  async unstake(address: Address, amount: bigint): Promise<TxResult> {
    // Begins the 7-day drip; tokens return to liquid via claimDrip.
    return this.send(address, CONTRACTS.staking, PYRE_STAKING_ABI, "unstake", [amount]);
  }
  async claimDrip(address: Address): Promise<TxResult> {
    return this.send(address, CONTRACTS.token, PYRE_TOKEN_ABI, "claimDrip", []);
  }
  async burnTokens(address: Address, amount: bigint): Promise<TxResult> {
    // One call: burns liquid $PYRE and (via the Acolyte callback) mints at 10k /
    // levels the tier. No separate mint or level-up step.
    return this.send(address, CONTRACTS.token, PYRE_TOKEN_ABI, "burn", [amount]);
  }
  // LP burn, the deployed rite: LpBurnFacet.burnLpPosition(tokenId) consumes a
  // Uniswap v4 POSITION NFT (verifies it sits in OUR pool, locks it at the dead
  // address, flags the wallet as an LP burner). The panel's (eth, pyre) figures
  // describe the position being offered; the contract takes the whole NFT, so
  // this finds the caller's position in our pool, approves the diamond, and
  // burns it. TODO(contract): revisit if the dev's locker redesign changes the
  // entry point (see the afterRemoveLiquidity hookData path).
  async burnLP(address: Address, _ethAmount: bigint, _pyreAmount: bigint): Promise<TxResult> {
    const hook = CONTRACTS.hook;
    if (!hook || !V4) return { ok: false, error: "Pool not configured: missing hook / position manager." };
    try {
      await this.ensureChain();
      const pm = V4.positionManager;
      const c = getPublicClient(wagmiConfig, { chainId: CHAIN });
      if (!c) return { ok: false, error: "No RPC client for the configured chain." };
      // Candidates: every position NFT ever sent to this wallet (the pool did
      // not exist before our deploy, so the anchor bounds the scan).
      const logs = await c.getLogs({
        address: pm,
        event: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed id)"),
        args: { to: address },
        fromBlock: DEPLOY_ANCHOR ? DEPLOY_ANCHOR.block : "earliest",
      });
      const ids = [...new Set(logs.map((l) => l.args.id!))];
      let target: bigint | null = null;
      for (const id of ids) {
        try {
          const owner = await readContract(wagmiConfig, { chainId: CHAIN, address: pm, abi: POSITION_MANAGER_ABI, functionName: "ownerOf", args: [id] });
          if (owner.toLowerCase() !== address.toLowerCase()) continue; // moved on / already burned
          const [key] = await readContract(wagmiConfig, { chainId: CHAIN, address: pm, abi: POSITION_MANAGER_ABI, functionName: "getPoolAndPositionInfo", args: [id] });
          if (key.hooks.toLowerCase() === hook.toLowerCase()) { target = id; break; }
        } catch {
          /* burned/invalid id: skip */
        }
      }
      if (target === null) {
        return { ok: false, error: "No liquidity position in the Pyre pool was found in this wallet. Add liquidity to the pool first, then offer the position here." };
      }
      // The diamond pulls the NFT via transferFrom, so it needs the ERC-721 approval.
      const approved = await readContract(wagmiConfig, { chainId: CHAIN, address: pm, abi: POSITION_MANAGER_ABI, functionName: "getApproved", args: [target] });
      if (approved.toLowerCase() !== hook.toLowerCase()) {
        const approveHash = await writeContract(wagmiConfig, { chainId: CHAIN, account: address, address: pm, abi: POSITION_MANAGER_ABI, functionName: "approve", args: [hook, target] });
        const approveReceipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash: approveHash });
        if (approveReceipt.status !== "success") return { ok: false, error: "Approving the position for the burn failed." };
      }
      const hash = await writeContract(wagmiConfig, { chainId: CHAIN, account: address, address: hook, abi: DIAMOND_ABI, functionName: "burnLpPosition", args: [target] });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
      return { ok: receipt.status === "success", hash };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  }
  async claimStakingRewards(address: Address): Promise<TxResult> {
    return this.send(address, CONTRACTS.staking, PYRE_STAKING_ABI, "claimReward", []);
  }

  /** Send a write tx through the connected wallet and await the receipt. */
  private async send(
    account: Address,
    address: Address | null,
    abi: typeof PYRE_STAKING_ABI | typeof PYRE_TOKEN_ABI,
    functionName: string,
    args: readonly bigint[]
  ): Promise<TxResult> {
    if (!address) return { ok: false, error: "Contract address not configured." };
    try {
      await this.ensureChain();
      const hash = await writeContract(wagmiConfig, {
        chainId: CHAIN,
        account,
        address,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi: abi as any,
        functionName: functionName as never,
        args: args as never,
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
      return { ok: receipt.status === "success", hash };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  }
  // The Ascend rite: ImmolatedGate.immolate(). One-time claim once you hold a
  // Pyre-tier Acolyte. The rite burns an EXTRA ADDITIONAL_BURN of liquid $PYRE
  // via burnFrom, so the gate needs an ERC-20 allowance first; this handles the
  // approval inline when it's missing. useAscendImmolated() calls this; the
  // panel refetches the position keys on success and flips to the member state.
  async ascendImmolated(address: Address): Promise<TxResult> {
    const gate = CONTRACTS.immolated;
    const token = CONTRACTS.token;
    if (!gate || !token) return { ok: false, error: "Pool not configured: missing Immolated gate address." };
    try {
      await this.ensureChain();
      const [cost, allowance] = await Promise.all([
        readContract(wagmiConfig, { chainId: CHAIN, address: gate, abi: IMMOLATED_GATE_ABI, functionName: "ADDITIONAL_BURN", args: [] }),
        readContract(wagmiConfig, { chainId: CHAIN, address: token, abi: ERC20_ABI, functionName: "allowance", args: [address, gate] }),
      ]);
      if (allowance < cost) {
        const approveHash = await writeContract(wagmiConfig, { chainId: CHAIN, account: address, address: token, abi: ERC20_ABI, functionName: "approve", args: [gate, maxUint256] });
        const approveReceipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash: approveHash });
        if (approveReceipt.status !== "success") return { ok: false, error: "Approving the Ascend burn failed." };
      }
      const hash = await writeContract(wagmiConfig, {
        chainId: CHAIN,
        account: address,
        address: gate,
        abi: IMMOLATED_GATE_ABI,
        functionName: "immolate",
        args: [],
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
      return { ok: receipt.status === "success", hash };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  }
  // One shared pool: Immolated yield arrives through PyreStaking's stream (the
  // +20% is baked into the member's weight), so the claim IS claimReward. Kept
  // as its own method so the Hall can label the action.
  async claimImmolatedYield(address: Address): Promise<TxResult> {
    return this.send(address, CONTRACTS.staking, PYRE_STAKING_ABI, "claimReward", []);
  }
  async approveToken(address: Address): Promise<TxResult> {
    const token = CONTRACTS.token;
    if (!token || !SWAP_ROUTER) return { ok: false, error: "Pool not configured: missing PYRE token / router address." };
    try {
      await this.ensureChain();

      if (USE_UNIVERSAL_ROUTER) {
        if (!V4) return { ok: false, error: `No Uniswap v4 deployment configured for chain ${CHAIN_ID}.` };
        const permit2 = V4.permit2;
        // 1) ERC-20 approve Permit2 (if needed)
        const erc20Allowance = await readContract(wagmiConfig, {
          chainId: CHAIN,
          address: token,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, permit2],
        });
        if (erc20Allowance < maxUint256 / 2n) {
          const approveHash = await writeContract(wagmiConfig, {
            chainId: CHAIN,
            account: address,
            address: token,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [permit2, maxUint256],
          });
          const approveReceipt = await waitForTransactionReceipt(wagmiConfig, {
            chainId: CHAIN,
            hash: approveHash,
          });
          if (approveReceipt.status !== "success") {
            return { ok: false, error: "Approving PYRE for Permit2 failed." };
          }
        }
        // 2) Permit2 allowance for Universal Router
        const hash = await writeContract(wagmiConfig, {
          chainId: CHAIN,
          account: address,
          address: permit2,
          abi: PERMIT2_ABI,
          functionName: "approve",
          args: [token, SWAP_ROUTER, MAX_UINT160, MAX_UINT48],
        });
        const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
        return { ok: receipt.status === "success", hash };
      }

      const hash = await writeContract(wagmiConfig, {
        chainId: CHAIN,
        account: address,
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SWAP_ROUTER, maxUint256],
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
      return { ok: receipt.status === "success", hash };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  }

  async swap(address: Address, p: SwapParams): Promise<TxResult> {
    const { key } = requirePool();
    if (!SWAP_ROUTER) return { ok: false, error: "Pool not configured: missing router address." };
    const isBuy = p.direction === "buy";
    const zeroForOne = isBuy; // ETH(currency0) → PYRE(currency1)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Math.max(1, p.deadlineMinutes) * 60);
    try {
      await this.ensureChain();
      let hash: Hex;

      if (USE_UNIVERSAL_ROUTER) {
        // Same PoolKey as quotes — hooks = diamond — so PoolManager invokes
        // beforeSwap/afterSwap on the PYRE hook.
        if (key.hooks.toLowerCase() !== CONTRACTS.hook?.toLowerCase()) {
          return { ok: false, error: "PoolKey.hooks does not match the configured PYRE diamond." };
        }
        const exec = buildV4SwapExecuteArgs({
          kind: p.kind,
          zeroForOne,
          key,
          amount: p.amount,
          limitAmount: p.limitAmount,
          deadline,
        });
        hash = await writeContract(wagmiConfig, {
          chainId: CHAIN,
          account: address,
          address: SWAP_ROUTER,
          abi: UNIVERSAL_ROUTER_ABI,
          functionName: "execute",
          args: [exec.commands, exec.inputs, exec.deadline],
          value: exec.value,
        });
      } else if (p.kind === "exactIn") {
        // amount = exact input; limitAmount = min output (slippage floor).
        hash = await writeContract(wagmiConfig, {
          chainId: CHAIN,
          account: address,
          address: SWAP_ROUTER,
          abi: V4_ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [p.amount, p.limitAmount, zeroForOne, key, "0x", address, deadline],
          value: isBuy ? p.amount : 0n, // buy: send the input ETH as msg.value
        });
      } else {
        // amount = exact output; limitAmount = max input (slippage ceiling). On a
        // buy we forward the max input as msg.value and the router refunds the rest.
        hash = await writeContract(wagmiConfig, {
          chainId: CHAIN,
          account: address,
          address: SWAP_ROUTER,
          abi: V4_ROUTER_ABI,
          functionName: "swapTokensForExactTokens",
          args: [p.amount, p.limitAmount, zeroForOne, key, "0x", address, deadline],
          value: isBuy ? p.limitAmount : 0n,
        });
      }
      const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
      return { ok: receipt.status === "success", hash };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  }

  /** Mint a full-range Pyre-pool LP NFT via Uniswap v4 PositionManager
      (same path as CreateLpPosition.s.sol — not a Pyre contract call). */
  async createLpPosition(address: Address, params: CreateLpParams): Promise<TxResult> {
    const token = CONTRACTS.token;
    if (!token || !V4) {
      return { ok: false, error: "Pool not configured: missing PYRE token / v4 addresses." };
    }
    if (params.ethAmount <= 0n || params.pyreAmount <= 0n) {
      return { ok: false, error: "Enter both $ETH and $PYRE amounts." };
    }

    try {
      await this.ensureChain();
      const { key, poolId } = requirePool();
      const pm = V4.positionManager;
      const permit2 = V4.permit2;

      const [sqrtPriceX96] = await readContract(wagmiConfig, {
        chainId: CHAIN,
        address: V4.stateView,
        abi: STATE_VIEW_ABI,
        functionName: "getSlot0",
        args: [poolId],
      });
      if (sqrtPriceX96 === 0n) {
        return { ok: false, error: "Pool is not initialized yet." };
      }

      const liquidity = liquidityForAmounts(
        sqrtPriceX96,
        params.ethAmount,
        params.pyreAmount
      );
      if (liquidity <= 0n) {
        return { ok: false, error: "Amounts too small to mint liquidity at the current price." };
      }

      // 1) ERC-20 approve Permit2
      const erc20Allowance = await readContract(wagmiConfig, {
        chainId: CHAIN,
        address: token,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, permit2],
      });
      if (erc20Allowance < params.pyreAmount) {
        const approveHash = await writeContract(wagmiConfig, {
          chainId: CHAIN,
          account: address,
          address: token,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [permit2, maxUint256],
        });
        const approveReceipt = await waitForTransactionReceipt(wagmiConfig, {
          chainId: CHAIN,
          hash: approveHash,
        });
        if (approveReceipt.status !== "success") {
          return { ok: false, error: "Approving $PYRE for Permit2 failed." };
        }
      }

      // 2) Permit2 allowance for PositionManager
      const now = BigInt(Math.floor(Date.now() / 1000));
      const [p2Amount, p2Expiration] = await readContract(wagmiConfig, {
        chainId: CHAIN,
        address: permit2,
        abi: PERMIT2_ABI,
        functionName: "allowance",
        args: [address, token, pm],
      });
      if (p2Amount < params.pyreAmount || BigInt(p2Expiration) < now + 600n) {
        const p2Hash = await writeContract(wagmiConfig, {
          chainId: CHAIN,
          account: address,
          address: permit2,
          abi: PERMIT2_ABI,
          functionName: "approve",
          args: [token, pm, MAX_UINT160, MAX_UINT48],
        });
        const p2Receipt = await waitForTransactionReceipt(wagmiConfig, {
          chainId: CHAIN,
          hash: p2Hash,
        });
        if (p2Receipt.status !== "success") {
          return { ok: false, error: "Permit2 approval for the position manager failed." };
        }
      }

      const minutes = params.deadlineMinutes ?? 20;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
      const { unlockData, ethValue } = encodeMintLpUnlock({
        key,
        recipient: address,
        liquidity,
        amount0Max: params.ethAmount,
        amount1Max: params.pyreAmount,
      });

      const hash = await writeContract(wagmiConfig, {
        chainId: CHAIN,
        account: address,
        address: pm,
        abi: POSITION_MANAGER_ABI,
        functionName: "modifyLiquidities",
        args: [unlockData, deadline],
        value: ethValue,
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
      return { ok: receipt.status === "success", hash };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  }

  async getAcolyteBaseURI(): Promise<string> {
    const nft = CONTRACTS.nft;
    if (!nft) return "";
    try {
      return await readContract(wagmiConfig, {
        chainId: CHAIN,
        address: nft,
        abi: ACOLYTE_ABI,
        functionName: "baseURI",
      });
    } catch {
      // Pre-upgrade deployments have no baseURI selector yet.
      return "";
    }
  }

  async setAcolyteBaseURI(address: Address, baseURI: string): Promise<TxResult> {
    const nft = CONTRACTS.nft;
    if (!nft) return { ok: false, error: "Acolyte (NFT) address not configured." };
    const uri = baseURI.trim();
    if (!uri) return { ok: false, error: "baseURI is empty." };
    try {
      await this.ensureChain();
      const hash = await writeContract(wagmiConfig, {
        chainId: CHAIN,
        account: address,
        address: nft,
        abi: ACOLYTE_ABI,
        functionName: "setBaseURI",
        args: [uri],
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { chainId: CHAIN, hash });
      return { ok: receipt.status === "success", hash };
    } catch (e) {
      return { ok: false, error: errMsg(e) };
    }
  }

  completeQuestTask(id: string): Promise<TxResult> { return completeQuestTaskApi(id); }
  submitWallet(t: string): Promise<TxResult> { return submitWalletApi(t); }
}
