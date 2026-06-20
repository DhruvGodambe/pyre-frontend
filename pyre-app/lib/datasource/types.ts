/* ============================================================================
   PYRE, DataSource interface  ("the one switch")
   ----------------------------------------------------------------------------
   Every read and every write the UI needs is a method here. Two implementations:

     • MockDataSource, realistic fake data, works with NO contract (today)
     • ChainDataSource, wagmi/viem reads + writes against the deployed contracts
                          (a stub for now; filled in when the developer ships ABIs)

   The whole UI depends only on this interface. Swapping the implementation
   (lib/config.ts → USE_MOCK) flips the entire app from demo to live. No panel,
   shell, or hook changes.
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

/** Everything the swap write needs: the user-fixed amount/side, the slippage
    floor (minReceived/maxSold), and the deadline. Mirrors what Universal
    Router's V4_SWAP command is built from. */
export interface SwapParams extends SwapQuoteParams {
  /** exactIn: floor on output. exactOut: ceiling on input. Base units. */
  limitAmount: bigint;
  deadlineMinutes: number;
}

export interface DataSource {
  /* --- Reads ----------------------------------------------------------- */
  getProtocolStats(): Promise<ProtocolStats>;
  getAcolyte(address: Address): Promise<Acolyte>;
  getStakingPosition(address: Address): Promise<StakingPosition>;
  getImmolatedPosition(address: Address): Promise<ImmolatedPosition>;
  getUserHistory(address: Address): Promise<ActivityEvent[]>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  getTopBurners(): Promise<LeaderboardEntry[]>;
  getActivityFeed(): Promise<ActivityEvent[]>;
  getAnnouncements(): Promise<Announcement[]>;
  getMarketListings(filter?: MarketFilter): Promise<MarketListing[]>;
  /* --- The Grand Exchange (Uniswap-v4 swap) ---------------------------- */
  getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote>;
  getPoolState(): Promise<PoolState>;
  getSwapBalances(address: Address): Promise<SwapBalances>;
  getApprovalState(
    address: Address,
    direction: SwapDirection,
    amount: bigint
  ): Promise<ApprovalState>;
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
  /** Approve PYRE to Permit2 (sell side). No-op/native on the buy side. */
  approveToken(address: Address): Promise<TxResult>;
  swap(address: Address, params: SwapParams): Promise<TxResult>;

  /* --- Quest funnel ---------------------------------------------------- */
  completeQuestTask(taskId: string): Promise<TxResult>;
  submitWallet(walletText: string): Promise<TxResult>;
}
