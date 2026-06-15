/* ============================================================================
   PYRE — ChainDataSource (STUB — fill in at contract handoff)
   ----------------------------------------------------------------------------
   This is where the real on-chain reads/writes go once the developer ships the
   contract ABIs + addresses. Each method maps 1:1 to a contract call:

     getProtocolStats()      → PyreToken.scalingFactor / totalSupply, etc.
     getFireSpirit(addr)     → PyreNFT.tokenOf / currentStage / immolatedWeight
     getStakingPosition(addr)→ PyreStaking.positions / pendingRewards / drips
     stake/unstake/burn...   → write calls via wagmi/viem

   Because it implements the same DataSource interface as MockDataSource, the
   panels and hooks do not change at all when this goes live. Wire wagmi here.
   ========================================================================== */

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
} from "../types";
import type { DataSource, TxResult, MarketFilter } from "./types";
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
  getFireSpirit(_a: Address): Promise<FireSpirit> { return NOT_WIRED(); }
  getStakingPosition(_a: Address): Promise<StakingPosition> { return NOT_WIRED(); }
  getImmolatedPosition(_a: Address): Promise<ImmolatedPosition> { return NOT_WIRED(); }
  getUserHistory(_a: Address): Promise<ActivityEvent[]> { return NOT_WIRED(); }
  getLeaderboard(): Promise<LeaderboardEntry[]> { return NOT_WIRED(); }
  getTopBurners(): Promise<LeaderboardEntry[]> { return NOT_WIRED(); }
  getActivityFeed(): Promise<ActivityEvent[]> { return NOT_WIRED(); }
  getAnnouncements(): Promise<Announcement[]> { return NOT_WIRED(); }
  getMarketListings(_f?: MarketFilter): Promise<MarketListing[]> { return NOT_WIRED(); }
  getSwapQuote(_d: SwapDirection, _a: bigint): Promise<SwapQuote> { return NOT_WIRED(); }
  // Quests are off-chain + permanent — already live, even before contracts ship.
  getQuestTasks(_a: Address | null): Promise<QuestTask[]> { return fetchQuestTasks(); }
  stake(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  unstake(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimDrip(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  burnTokens(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  burnLP(_a: Address, _e: bigint, _p: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimStakingRewards(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  immolatedBurn(_a: Address, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  claimImmolatedYield(_a: Address): Promise<TxResult> { return NOT_WIRED(); }
  swap(_a: Address, _d: SwapDirection, _amt: bigint): Promise<TxResult> { return NOT_WIRED(); }
  completeQuestTask(id: string): Promise<TxResult> { return completeQuestTaskApi(id); }
  submitWallet(t: string): Promise<TxResult> { return submitWalletApi(t); }
}
