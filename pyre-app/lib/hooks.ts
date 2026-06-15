"use client";

/* ============================================================================
   PYRE — Data hooks  (the API every panel uses)
   ----------------------------------------------------------------------------
   Read hooks wrap the active DataSource in react-query (loading/error/refetch
   for free). Write hooks run a "transaction" and invalidate the data it touched
   so the UI updates. Panels import ONLY from here — never the data source
   directly — so the mock→chain swap is invisible to them.
   ========================================================================== */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getDataSource } from "./datasource";
import { useWallet } from "./wallet";
import { fetchQuestLeaderboard, fetchReferral } from "./quests/client";
import type { MarketFilter } from "./datasource";
import type { Address, SwapDirection } from "./types";

const ds = () => getDataSource();

/* Keys all live data depends on; write hooks invalidate the relevant ones. */
const KEY = {
  stats: ["protocolStats"] as const,
  fireSpirit: (a: Address | null) => ["fireSpirit", a] as const,
  staking: (a: Address | null) => ["staking", a] as const,
  immolated: (a: Address | null) => ["immolated", a] as const,
  history: (a: Address | null) => ["history", a] as const,
  leaderboard: ["leaderboard"] as const,
  topBurners: ["topBurners"] as const,
  activity: ["activity"] as const,
  announcements: ["announcements"] as const,
  market: (f?: MarketFilter) => ["market", f ?? {}] as const,
  quote: (d: SwapDirection, a: string) => ["quote", d, a] as const,
  quests: (a: Address | null) => ["quests", a] as const,
};

/* ----------------------------------------------------------------- reads */

export function useProtocolStats() {
  return useQuery({ queryKey: KEY.stats, queryFn: () => ds().getProtocolStats(), refetchInterval: 15_000 });
}

export function useFireSpirit() {
  const { address } = useWallet();
  return useQuery({
    queryKey: KEY.fireSpirit(address),
    queryFn: () => ds().getFireSpirit(address!),
    enabled: !!address,
  });
}

export function useStakingPosition() {
  const { address } = useWallet();
  return useQuery({
    queryKey: KEY.staking(address),
    queryFn: () => ds().getStakingPosition(address!),
    enabled: !!address,
  });
}

export function useImmolatedPosition() {
  const { address } = useWallet();
  return useQuery({
    queryKey: KEY.immolated(address),
    queryFn: () => ds().getImmolatedPosition(address!),
    enabled: !!address,
  });
}

export function useUserHistory() {
  const { address } = useWallet();
  return useQuery({
    queryKey: KEY.history(address),
    queryFn: () => ds().getUserHistory(address!),
    enabled: !!address,
  });
}

export function useLeaderboard() {
  return useQuery({ queryKey: KEY.leaderboard, queryFn: () => ds().getLeaderboard() });
}

export function useTopBurners() {
  return useQuery({ queryKey: KEY.topBurners, queryFn: () => ds().getTopBurners() });
}

export function useActivityFeed() {
  return useQuery({ queryKey: KEY.activity, queryFn: () => ds().getActivityFeed(), refetchInterval: 10_000 });
}

export function useAnnouncements() {
  return useQuery({ queryKey: KEY.announcements, queryFn: () => ds().getAnnouncements() });
}

export function useMarketListings(filter?: MarketFilter) {
  return useQuery({ queryKey: KEY.market(filter), queryFn: () => ds().getMarketListings(filter) });
}

export function useSwapQuote(direction: SwapDirection, amountIn: bigint) {
  return useQuery({
    queryKey: KEY.quote(direction, amountIn.toString()),
    queryFn: () => ds().getSwapQuote(direction, amountIn),
    enabled: amountIn > 0n,
  });
}

export function useQuestTasks() {
  const { address } = useWallet();
  return useQuery({ queryKey: KEY.quests(address), queryFn: () => ds().getQuestTasks(address) });
}

/* Quest funnel extras — off-chain, session-based (same in mock + chain), so they
   call the quest client directly rather than going through the data source. */
export function useQuestLeaderboard() {
  return useQuery({ queryKey: ["questLeaderboard"], queryFn: () => fetchQuestLeaderboard() });
}

export function useReferral() {
  return useQuery({ queryKey: ["referral"], queryFn: () => fetchReferral() });
}

/* ---------------------------------------------------------------- writes */

/** Generic tx hook: needs a connected wallet, invalidates keys on success.
   Takes a single `variables` value (use an object when a call needs >1 value),
   matching react-query's mutate(variables) signature. */
function useTx<V = void>(
  run: (address: Address, variables: V) => Promise<{ ok: boolean; error?: string }>,
  invalidate: (a: Address | null) => readonly (readonly unknown[])[]
) {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variables: V) => {
      if (!address) throw new Error("Connect your wallet first");
      const res = await run(address, variables);
      if (!res.ok) throw new Error(res.error ?? "Transaction failed");
      return res;
    },
    onSuccess: () => {
      for (const key of invalidate(address)) qc.invalidateQueries({ queryKey: key });
    },
  });
}

const POSITION_KEYS = (a: Address | null) => [
  KEY.stats,
  KEY.fireSpirit(a),
  KEY.staking(a),
  KEY.immolated(a),
  KEY.history(a),
  KEY.activity,
];

// mutate(amount)
export const useStake = () =>
  useTx<bigint>((a, amount) => ds().stake(a, amount), POSITION_KEYS);
export const useUnstake = () =>
  useTx<bigint>((a, amount) => ds().unstake(a, amount), POSITION_KEYS);
export const useBurnTokens = () =>
  useTx<bigint>((a, amount) => ds().burnTokens(a, amount), POSITION_KEYS);
export const useImmolatedBurn = () =>
  useTx<bigint>((a, amount) => ds().immolatedBurn(a, amount), POSITION_KEYS);
// mutate() — no args
export const useClaimDrip = () =>
  useTx((a) => ds().claimDrip(a), POSITION_KEYS);
export const useClaimStakingRewards = () =>
  useTx((a) => ds().claimStakingRewards(a), POSITION_KEYS);
export const useClaimImmolatedYield = () =>
  useTx((a) => ds().claimImmolatedYield(a), POSITION_KEYS);
// mutate({ eth, pyre }) / mutate({ direction, amountIn })
export const useBurnLP = () =>
  useTx<{ eth: bigint; pyre: bigint }>((a, v) => ds().burnLP(a, v.eth, v.pyre), POSITION_KEYS);
export const useSwap = () =>
  useTx<{ direction: SwapDirection; amountIn: bigint }>(
    (a, v) => ds().swap(a, v.direction, v.amountIn),
    POSITION_KEYS
  );

/* --- Quest funnel (no wallet required — uses an anonymous session) -------- */

/** Generic quest mutation: no connected wallet needed; refreshes the task list
   (and the staking position, which carries the quest-completer boost). */
function useQuestTx<V>(run: (variables: V) => Promise<{ ok: boolean; error?: string }>) {
  const { address } = useWallet();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (variables: V) => {
      const res = await run(variables);
      if (!res.ok) throw new Error(res.error ?? "Something went wrong");
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY.quests(address) });
      qc.invalidateQueries({ queryKey: KEY.staking(address) });
      qc.invalidateQueries({ queryKey: ["questLeaderboard"] });
    },
  });
}

// mutate(taskId)
export const useCompleteQuestTask = () =>
  useQuestTx<string>((taskId) => ds().completeQuestTask(taskId));
// mutate(walletText)
export const useSubmitWallet = () =>
  useQuestTx<string>((wallet) => ds().submitWallet(wallet));
