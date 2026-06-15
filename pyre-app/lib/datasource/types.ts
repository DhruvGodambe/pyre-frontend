/* ============================================================================
   PYRE — DataSource interface  ("the one switch")
   ----------------------------------------------------------------------------
   Every read and every write the UI needs is a method here. Two implementations:

     • MockDataSource   — realistic fake data, works with NO contract (today)
     • ChainDataSource  — wagmi/viem reads + writes against the deployed contracts
                          (a stub for now; filled in when the developer ships ABIs)

   The whole UI depends only on this interface. Swapping the implementation
   (lib/config.ts → USE_MOCK) flips the entire app from demo to live. No panel,
   shell, or hook changes.
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

/** Result of a write (transaction). Mirrors what a tx receipt gives us. */
export interface TxResult {
  ok: boolean;
  hash?: string;
  error?: string;
}

export interface MarketFilter {
  stage?: number;
  lpOnly?: boolean;
  immolatedOnly?: boolean;
}

export interface DataSource {
  /* --- Reads ----------------------------------------------------------- */
  getProtocolStats(): Promise<ProtocolStats>;
  getFireSpirit(address: Address): Promise<FireSpirit>;
  getStakingPosition(address: Address): Promise<StakingPosition>;
  getImmolatedPosition(address: Address): Promise<ImmolatedPosition>;
  getUserHistory(address: Address): Promise<ActivityEvent[]>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  getTopBurners(): Promise<LeaderboardEntry[]>;
  getActivityFeed(): Promise<ActivityEvent[]>;
  getAnnouncements(): Promise<Announcement[]>;
  getMarketListings(filter?: MarketFilter): Promise<MarketListing[]>;
  getSwapQuote(direction: SwapDirection, amountIn: bigint): Promise<SwapQuote>;
  getQuestTasks(address: Address | null): Promise<QuestTask[]>;

  /* --- Writes (transactions) ------------------------------------------- */
  stake(address: Address, amount: bigint): Promise<TxResult>;
  unstake(address: Address, amount: bigint): Promise<TxResult>;
  claimDrip(address: Address): Promise<TxResult>;
  burnTokens(address: Address, amount: bigint): Promise<TxResult>;
  burnLP(address: Address, ethAmount: bigint, pyreAmount: bigint): Promise<TxResult>;
  claimStakingRewards(address: Address): Promise<TxResult>;
  immolatedBurn(address: Address, amount: bigint): Promise<TxResult>;
  claimImmolatedYield(address: Address): Promise<TxResult>;
  swap(address: Address, direction: SwapDirection, amountIn: bigint): Promise<TxResult>;

  /* --- Quest funnel ---------------------------------------------------- */
  completeQuestTask(taskId: string): Promise<TxResult>;
  submitWallet(walletText: string): Promise<TxResult>;
}
