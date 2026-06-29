/* ============================================================================
   PYRE, ChainDataSource (STUB, fill in at contract handoff)
   ----------------------------------------------------------------------------
   This is where the real on-chain reads/writes go once the developer ships the
   contract ABIs + addresses. Each method maps 1:1 to a contract call:

     getProtocolStats()      → PyreToken.scalingFactor / totalSupply, etc.
                               pendingYieldPoolEth = ETH gathered into the reward
                               pool but not yet distributed. Expose a view on the
                               distributor/hook (undistributed balance = the
                               pool's ETH balance minus already-allocated), and
                               read it here.
     getAcolyte(addr)        → PyreNFT.tokenOf / currentStage / immolatedWeight
     getStakingPosition(addr)→ PyreStaking.positions / pendingRewards / drips
     stake/unstake/burn...   → write calls via wagmi/viem

   Because it implements the same DataSource interface as MockDataSource, the
   panels and hooks do not change at all when this goes live. Wire wagmi here.

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
     getApprovalState→ the custom router takes a PLAIN ERC-20 approval (NO Permit2):
                      buy → not-required; sell → PYRE.allowance(addr, router).
     approveToken   → PyreToken.approve(router, MaxUint256).
     swap           → IUniswapV4Router04.swap{ExactTokensForTokens|TokensForExact
                      Tokens}; buys send ETH as msg.value, sells need the approval.

   STILL APPROXIMATE (display only, flagged for the dev): the ETH/USD price is a
   keyless spot feed w/ constant fallback; the fee BREAKDOWN's hook-vs-launch
   split needs the hook's FeeLogicFacet getter (the TOTAL fee is measured from the
   quote, but we can't isolate the launch portion yet). Neither affects the amounts
   you actually trade. */

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
import type { DataSource, TxResult, MarketFilter, SwapParams } from "./types";
import {
  fetchQuestTasks,
  completeQuestTask as completeQuestTaskApi,
  submitWallet as submitWalletApi,
} from "../quests/client";
import { maxUint256, type Hex } from "viem";
import {
  readContract,
  simulateContract,
  writeContract,
  waitForTransactionReceipt,
  getBalance,
} from "wagmi/actions";
import { wagmiConfig } from "../wagmi";
import { CHAIN_ID, CONTRACTS, POOL, SWAP_ROUTER, TOKENS, V4 } from "../config";
import { toNumber } from "../format";
import {
  ERC20_ABI,
  STATE_VIEW_ABI,
  V4_QUOTER_ABI,
  V4_ROUTER_ABI,
  getPoolKey,
  getPoolId,
  type PoolKey,
} from "./abis";

/* ---- Grand Exchange helpers ------------------------------------------------ */

/** The active chain id, typed to the ids registered in wagmiConfig (Sepolia +
    mainnet) so the wagmi actions accept it. */
const CHAIN = CHAIN_ID as 1 | 11155111;

const Q96 = 2n ** 96n;
const QUOTE_TTL_MS = 30_000; // quote refresh window (~Uniswap)
const GAS_GWEI = 8n; // testnet gas price assumption for the gas-cost display only
const HIGH_IMPACT = 0.08; // 8%+ → surface a price-impact warning

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

const NOT_WIRED = () =>
  Promise.reject(
    new Error(
      "ChainDataSource is not wired yet. Set NEXT_PUBLIC_USE_MOCK=true, or implement this against the deployed contracts."
    )
  );

export class ChainDataSource implements DataSource {
  getProtocolStats(): Promise<ProtocolStats> { return NOT_WIRED(); }
  getAcolyte(_a: Address): Promise<Acolyte> { return NOT_WIRED(); }
  getStakingPosition(_a: Address): Promise<StakingPosition> { return NOT_WIRED(); }
  getImmolatedPosition(_a: Address): Promise<ImmolatedPosition> { return NOT_WIRED(); }
  getUserHistory(_a: Address): Promise<ActivityEvent[]> { return NOT_WIRED(); }
  getLeaderboard(): Promise<LeaderboardEntry[]> { return NOT_WIRED(); }
  getTopBurners(): Promise<LeaderboardEntry[]> { return NOT_WIRED(); }
  getActivityFeed(): Promise<ActivityEvent[]> { return NOT_WIRED(); }
  getAnnouncements(): Promise<Announcement[]> { return NOT_WIRED(); }
  // Black Market = a branded window over OpenSea/Blur. getMarketListings →
  // their listings API filtered by the PyreNFT collection + trait (stage/LP/
  // immolated) + sort; getMarketActivity → their events API (sale/listing/
  // offer/delisting) for the same collection. Both map the filter 1:1.
  getMarketListings(_f?: MarketFilter): Promise<MarketListing[]> { return NOT_WIRED(); }
  getMarketActivity(_f?: MarketFilter): Promise<MarketActivityEvent[]> { return NOT_WIRED(); }
  // --- The Grand Exchange (implemented; see the header) --------------------
  async getSwapQuote(p: SwapQuoteParams): Promise<SwapQuote> {
    const { key, poolId } = requirePool();
    const isBuy = p.direction === "buy";
    const zeroForOne = isBuy; // ETH(currency0) → PYRE(currency1)

    const [slot0, liquidity, ethUsd] = await Promise.all([
      readContract(wagmiConfig, { chainId: CHAIN, address: V4!.stateView, abi: STATE_VIEW_ABI, functionName: "getSlot0", args: [poolId] }),
      readContract(wagmiConfig, { chainId: CHAIN, address: V4!.stateView, abi: STATE_VIEW_ABI, functionName: "getLiquidity", args: [poolId] }),
      getEthUsd(),
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
    const hookFeeBps = Math.max(0, totalFeeBps - lpFeeBps);

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
        launchFeeBps: 0, // folded into hookFeeBps until the FeeLogicFacet getter exists
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
    // The custom router takes a plain ERC-20 approval (no Permit2 / no permit step).
    const allowance = await readContract(wagmiConfig, { chainId: CHAIN, address: token, abi: ERC20_ABI, functionName: "allowance", args: [address, SWAP_ROUTER] });
    return allowance >= amount ? { status: "ready" } : { status: "needs-approval" };
  }
  // Quests are off-chain + permanent, already live, even before contracts ship.
  getQuestTasks(_a: Address | null): Promise<QuestTask[]> { return fetchQuestTasks(); }
  stake(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  unstake(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimDrip(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  burnTokens(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  burnLP(_a: Address, _e: bigint, _p: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimStakingRewards(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  ascendImmolated(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  claimImmolatedYield(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  async approveToken(address: Address): Promise<TxResult> {
    const token = CONTRACTS.token;
    if (!token || !SWAP_ROUTER) return { ok: false, error: "Pool not configured: missing PYRE token / router address." };
    try {
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
      let hash: Hex;
      if (p.kind === "exactIn") {
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
  completeQuestTask(id: string): Promise<TxResult> { return completeQuestTaskApi(id); }
  submitWallet(t: string): Promise<TxResult> { return submitWalletApi(t); }
}
