/* ============================================================================
   PYRE, ChainDataSource (STUB, fill in at contract handoff)
   ----------------------------------------------------------------------------
   This is where the real on-chain reads/writes go once the developer ships the
   contract ABIs + addresses. Each method maps 1:1 to a contract call:

     getProtocolStats()      → PyreToken.scalingFactor / totalSupply, etc.
     getAcolyte(addr)        → PyreNFT.tokenOf / currentStage / immolatedWeight
     getStakingPosition(addr)→ PyreStaking.positions / pendingRewards / drips
     stake/unstake/burn...   → write calls via wagmi/viem

   Because it implements the same DataSource interface as MockDataSource, the
   panels and hooks do not change at all when this goes live. Wire wagmi here.

   ────────────────────────────────────────────────────────────────────────────
   THE GRAND EXCHANGE, Uniswap v4 swap wiring (the dev's checklist)
   ────────────────────────────────────────────────────────────────────────────
   We trade PYRE↔ETH against our own v4 pool (the pool that carries the PYRE
   Diamond hook). Contract addresses for the active chain are in
   lib/config.ts → V4 (and the PoolKey scaffold in config POOL). Build the
   PoolKey once:

     poolKey = {
       currency0: POOL.nativeCurrency,   // address(0), native ETH sorts first
       currency1: POOL.currency1,        // CONTRACTS.token (PYRE)
       fee:       POOL.isDynamicFee ? DYNAMIC_FEE_FLAG : POOL.feeTier, // 0x800000 or 100
       tickSpacing: POOL.tickSpacing,
       hooks:     POOL.hook,             // CONTRACTS.hook (the Diamond proxy)
     }
     poolId = keccak256(abi.encode(poolKey))   // viem: keccak256(encodeAbiParameters(...))

   For a buy (ETH→PYRE) zeroForOne = true; for a sell (PYRE→ETH) zeroForOne = false.

   getSwapQuote(params)  → V4Quoter (config V4.v4Quoter)
       exactIn  : quoteExactInputSingle({ poolKey, zeroForOne, exactAmount: params.amount, hookData })
                  returns (amountOut, gasEstimate)
       exactOut : quoteExactOutputSingle({ poolKey, zeroForOne, exactAmount: params.amount, hookData })
                  returns (amountIn,  gasEstimate)
       NOTE: these functions are state-mutating in signature (they unlock the
       PoolManager and revert to return). Call them OFF-CHAIN via eth_call /
       viem `simulateContract` / `publicClient.call`, never send a tx.
       hookData: bytes the Diamond hook's beforeSwap expects (likely 0x).
       Derive priceImpact from amountOut vs the spot price (StateView slot0),
       fees from POOL_FEE_BPS + HOOK_FEE_BPS (+ launch fee from the hook's
       AppStorage), minReceived/maxSold by applying params.slippageBps.

   getPoolState()        → StateView (config V4.stateView), gas-free reads:
       getSlot0(poolId)     → (sqrtPriceX96, tick, protocolFee, lpFee)
       getLiquidity(poolId) → active liquidity
       Convert sqrtPriceX96 → price; multiply by an ETH/USD oracle for USD/TVL.

   getSwapBalances(addr) → native ETH balance (publicClient.getBalance) +
       PyreToken.balanceOf(addr). USD via the same ETH/USD oracle.

   getApprovalState(addr, dir, amount) → Permit2 (config V4.permit2):
       buy  (native ETH) → "not-required".
       sell (PYRE)       → read PyreToken.allowance(addr, permit2). If 0 (or <
       amount) → "needs-approval". Else read permit2.allowance(addr, PYRE,
       universalRouter) → if expired/insufficient → "needs-permit", else "ready".

   approveToken(addr)    → write PyreToken.approve(permit2, MaxUint160). The
       per-swap Permit2 signature (AllowanceTransfer) is gathered in the UI
       (sign typed data) and passed into the Universal Router call below.

   swap(addr, params)    → Universal Router (config V4.universalRouter):
       router.execute(commands, inputs, deadline) with a V4_SWAP command whose
       actions encode SWAP_EXACT_IN_SINGLE / SWAP_EXACT_OUT_SINGLE + SETTLE_ALL
       + TAKE_ALL. Pass params.limitAmount as amountOutMinimum (exactIn) /
       amountInMaximum (exactOut), and params.deadlineMinutes as the deadline.
       For buys, send native ETH as msg.value; for sells, include the Permit2
       permit + signature in the inputs. Use @uniswap/v4-sdk to build calldata.
   ========================================================================== */

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
  getMarketListings(_f?: MarketFilter): Promise<MarketListing[]> { return NOT_WIRED(); }
  // --- The Grand Exchange (see the header for the exact v4 call mapping) ---
  getSwapQuote(_p: SwapQuoteParams): Promise<SwapQuote> { return NOT_WIRED(); } // → V4Quoter
  getPoolState(): Promise<PoolState> { return NOT_WIRED(); } // → StateView
  getSwapBalances(_a: Address): Promise<SwapBalances> { return NOT_WIRED(); } // → balanceOf + getBalance
  getApprovalState(_a: Address, _d: SwapDirection, _amt: bigint): Promise<ApprovalState> { return NOT_WIRED(); } // → Permit2
  // Quests are off-chain + permanent, already live, even before contracts ship.
  getQuestTasks(_a: Address | null): Promise<QuestTask[]> { return fetchQuestTasks(); }
  stake(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  unstake(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimDrip(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  burnTokens(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  burnLP(_a: Address, _e: bigint, _p: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimStakingRewards(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  immolatedBurn(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimImmolatedYield(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  approveToken(_a: Address): Promise<TxResult> { return NOT_WIRED(); } // → PyreToken.approve(permit2)
  swap(_a: Address, _p: SwapParams): Promise<TxResult> { return NOT_WIRED(); } // → Universal Router.execute
  completeQuestTask(id: string): Promise<TxResult> { return completeQuestTaskApi(id); }
  submitWallet(t: string): Promise<TxResult> { return submitWalletApi(t); }
}
