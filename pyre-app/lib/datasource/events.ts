/* ============================================================================
   PYRE, on-chain event log  (feeds, history, leaderboards, protocol aggregates)
   ----------------------------------------------------------------------------
   The deployed contracts expose almost no protocol-wide getters (no totalBurned
   on the token, no global staked total, no NFT totalSupply), so everything
   feed- or leaderboard-shaped is DERIVED FROM EVENT LOGS:

     PyreToken     Transfer(→ 0x0)          burns (per-address + series + total)
                   DripClaimed              drip claims
     PyreStaking   Staked / Unstaked        stake moves; `weight` arg = the
                                            account's NEW total weight, so the
                                            latest event per address IS the
                                            leaderboard row
                   RewardAdded              all-time $ETH routed to the pool
                   RewardPaid               yield claims
     Acolyte       AcolyteMinted/Upgraded   Acolyte mints + tier-ups
                   (SpiritMinted/Upgraded   kept as aliases for older Sepolia
                                            deploys that still use those names)
     ImmolatedGate Immolated                Ascend rites
     PoolManager   Swap (our poolId)        swap feed + 24h volume

   Logs are fetched in chunks from DEPLOY_ANCHOR.block, cached in module state,
   and topped up incrementally (fromBlock = last synced + 1) on every read, so
   the 10s feed poll costs one small getLogs round, not a rescan.

   Block→time: linear interpolation between the deploy anchor and the current
   chain head (exact average block time over the window). Good to well under a
   minute across the whole range; no per-block getBlock calls.

   Swap attribution: the Swap event's `sender` is the ROUTER, so the feed
   resolves the transaction's `from` (cached per tx hash) to show the trader.
   ========================================================================== */

import { createPublicClient, http, parseAbiItem, zeroAddress, type Address, type Hex } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { robinhood } from "../chains";
import { CHAIN_ID, CONTRACTS, DEPLOY_ANCHOR, V4 } from "../config";
import { toNumber } from "../format";
import { STAGES, stageFromWeight, type Stage } from "../constants";
import type { ActivityEvent, LeaderboardEntry, SeriesPoint } from "../types";
import { getPoolKey, getPoolId } from "./abis";

/* Log scans need an ARCHIVE-friendly RPC, and free tiers differ wildly
   (verified 2026-07-08): publicnode/ankr/blastapi refuse historical logs
   without a key; drpc (viem's default transport) caps multi-event filters at
   1,000 blocks, which would turn the first sync into hundreds of round trips.
   So the event layer gets ITS OWN client, separate from the wallet transport:
   NEXT_PUBLIC_RPC_LOGS > chain-specific RPC > public fallback (Tenderly on
   Sepolia; Robinhood public RPC on 4663). getLogsAdaptive below bisects
   any window an endpoint still refuses, so a swapped RPC degrades to slower,
   never to broken. */
const LOG_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_LOGS ??
  (CHAIN_ID === 1
    ? process.env.NEXT_PUBLIC_RPC_MAINNET
    : CHAIN_ID === 4663
      ? (process.env.NEXT_PUBLIC_RPC_ROBINHOOD ?? "https://rpc.mainnet.chain.robinhood.com")
      : (process.env.NEXT_PUBLIC_RPC_SEPOLIA ?? "https://sepolia.gateway.tenderly.co"));
const logClient = createPublicClient({
  chain: CHAIN_ID === 1 ? mainnet : CHAIN_ID === 4663 ? robinhood : sepolia,
  transport: http(LOG_RPC_URL),
});

const CHUNK = 10_000n;
const FEED_LIMIT = 30;
const BOARD_LIMIT = 10;
const SWAP_SENDER_LOOKUPS = 200; // resolve tx.from for at most this many recent swaps

/* --- Event definitions (deployed signatures) ------------------------------ */
const EV = {
  burn: parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
  dripClaimed: parseAbiItem("event DripClaimed(address indexed account, uint256 amount)"),
  staked: parseAbiItem("event Staked(address indexed account, uint256 amount, uint256 weight)"),
  unstaked: parseAbiItem("event Unstaked(address indexed account, uint256 amount, uint256 weight)"),
  rewardAdded: parseAbiItem("event RewardAdded(uint256 reward, uint256 duration)"),
  rewardPaid: parseAbiItem("event RewardPaid(address indexed account, uint256 reward)"),
  spiritMinted: parseAbiItem(
    "event AcolyteMinted(address indexed wallet, uint256 indexed tokenId, uint8 stage, uint256 cumulativeBurn)"
  ),
  spiritUpgraded: parseAbiItem(
    "event AcolyteUpgraded(uint256 indexed tokenId, uint8 stage, uint256 cumulativeBurn)"
  ),
  immolated: parseAbiItem("event Immolated(address indexed account, uint256 burnAmount)"),
  swap: parseAbiItem(
    "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)"
  ),
} as const;

/** Older Sepolia bytecode still emits Spirit*; fetched alongside Acolyte*. */
const LEGACY_SPIRIT = [
  parseAbiItem(
    "event SpiritMinted(address indexed wallet, uint256 indexed tokenId, uint8 stage, uint256 cumulativeBurn)"
  ),
  parseAbiItem(
    "event SpiritUpgraded(uint256 indexed tokenId, uint8 stage, uint256 cumulativeBurn)"
  ),
] as const;

/** viem returns PascalCase ABI event names; our Row/switch keys are camelCase.
    Map both, and fold legacy Spirit* → spiritMinted/spiritUpgraded. */
function rowName(eventName: string): keyof typeof EV | null {
  switch (eventName) {
    case "DripClaimed":
      return "dripClaimed";
    case "Staked":
      return "staked";
    case "Unstaked":
      return "unstaked";
    case "RewardAdded":
      return "rewardAdded";
    case "RewardPaid":
      return "rewardPaid";
    case "AcolyteMinted":
    case "SpiritMinted":
      return "spiritMinted";
    case "AcolyteUpgraded":
    case "SpiritUpgraded":
      return "spiritUpgraded";
    case "Immolated":
      return "immolated";
    case "Swap":
      return "swap";
    case "Transfer":
      return "burn";
    default:
      return null;
  }
}

/* One normalized row for every log we keep. */
interface Row {
  name: keyof typeof EV;
  address: Address; // emitting contract
  block: bigint;
  logIndex: number;
  txHash: Hex;
  // decoded args we actually use (flat, by event)
  account: Address | null;
  amount: bigint; // primary amount of the event (see mapping below)
  weight: bigint; // staking events: the account's NEW total weight
  stage: number; // spirit events: contract stage 0..3
  tokenId: bigint;
  amount0: bigint; // swap: signed ETH delta
}

/* --- Module state (one log store per page load) ---------------------------- */
const store = {
  synced: 0n as bigint, // last block already in `rows` (0n = never synced)
  rows: [] as Row[],
  headBlock: 0n as bigint,
  headTsMs: 0,
  txFrom: new Map<Hex, Address>(), // swap tx hash → tx.from
  inflight: null as Promise<void> | null,
};

function client() {
  return logClient;
}

/** ms timestamp for a block, interpolated deploy-anchor → chain head. */
function blockTime(block: bigint): number {
  const a = DEPLOY_ANCHOR!;
  const span = Number(store.headBlock - a.block);
  if (span <= 0) return a.tsMs;
  const msPerBlock = (store.headTsMs - a.tsMs) / span;
  return Math.round(a.tsMs + Number(block - a.block) * msPerBlock);
}

const rowKey = (r: Row) => `${r.txHash}-${r.logIndex}`;

/** Contract addresses (never leaderboard/feed subjects: the diamond burns the
    LP-path $PYRE from its own balance, etc.). */
function systemAddresses(): Set<string> {
  return new Set(
    [CONTRACTS.token, CONTRACTS.nft, CONTRACTS.staking, CONTRACTS.immolated, CONTRACTS.hook]
      .filter(Boolean)
      .map((a) => (a as string).toLowerCase())
  );
}

/* --- Sync ------------------------------------------------------------------ */

/** getLogs that self-heals free-tier range caps: when an RPC rejects or
    truncates a window ("exceeds defined limit", "invalid parameters", ...),
    bisect it and fetch the halves, down to a small floor. */
async function getLogsAdaptive<T>(
  fetch: (from: bigint, to: bigint) => Promise<T[]>,
  from: bigint,
  to: bigint
): Promise<T[]> {
  try {
    return await fetch(from, to);
  } catch (e) {
    if (to - from < 500n) throw e; // even a tiny window fails → real error
    const mid = from + (to - from) / 2n;
    const lo = await getLogsAdaptive(fetch, from, mid);
    const hi = await getLogsAdaptive(fetch, mid + 1n, to);
    return [...lo, ...hi];
  }
}

async function fetchRange(from: bigint, to: bigint): Promise<Row[]> {
  const c = client();
  const token = CONTRACTS.token!;
  const protocolAddrs = [CONTRACTS.staking, CONTRACTS.nft, CONTRACTS.immolated, token].filter(
    Boolean
  ) as Address[];
  const poolKey = getPoolKey();
  const poolId = poolKey ? getPoolId(poolKey) : null;

  // Sequential on purpose: free public RPCs rate-limit parallel getLogs.
  const protocol = await getLogsAdaptive(
    (f, t) =>
      c.getLogs({
        address: protocolAddrs,
        events: [
          EV.dripClaimed,
          EV.staked,
          EV.unstaked,
          EV.rewardAdded,
          EV.rewardPaid,
          EV.spiritMinted,
          EV.spiritUpgraded,
          ...LEGACY_SPIRIT,
          EV.immolated,
        ],
        fromBlock: f,
        toBlock: t,
      }),
    from,
    to
  );
  const burns = await getLogsAdaptive(
    (f, t) => c.getLogs({ address: token, event: EV.burn, args: { to: zeroAddress }, fromBlock: f, toBlock: t }),
    from,
    to
  );
  const swaps =
    poolId && V4
      ? await getLogsAdaptive(
          (f, t) => c.getLogs({ address: V4.poolManager, event: EV.swap, args: { id: poolId }, fromBlock: f, toBlock: t }),
          from,
          to
        )
      : [];

  const rows: Row[] = [];
  for (const l of protocol) {
    // token also emits its own Staked/Unstaked (different topics, filtered out
    // above); the staking contract's pair is the one we keep, so no dedupe needed.
    const name = rowName(l.eventName);
    if (!name) continue;
    const a = l.args as Record<string, unknown>;
    rows.push({
      name,
      address: l.address as Address,
      block: l.blockNumber!,
      logIndex: l.logIndex!,
      txHash: l.transactionHash!,
      account: (a.account ?? a.wallet ?? null) as Address | null,
      amount: (a.amount ?? a.reward ?? a.burnAmount ?? a.cumulativeBurn ?? 0n) as bigint,
      weight: (a.weight ?? 0n) as bigint,
      stage: Number(a.stage ?? 0),
      tokenId: (a.tokenId ?? 0n) as bigint,
      amount0: 0n,
    });
  }
  for (const l of burns) {
    rows.push({
      name: "burn",
      address: l.address as Address,
      block: l.blockNumber!,
      logIndex: l.logIndex!,
      txHash: l.transactionHash!,
      account: l.args.from as Address,
      amount: l.args.value as bigint,
      weight: 0n,
      stage: 0,
      tokenId: 0n,
      amount0: 0n,
    });
  }
  for (const l of swaps) {
    rows.push({
      name: "swap",
      address: l.address as Address,
      block: l.blockNumber!,
      logIndex: l.logIndex!,
      txHash: l.transactionHash!,
      account: l.args.sender as Address, // router; replaced by tx.from when resolved
      amount: (l.args.amount0 as bigint) < 0n ? -(l.args.amount0 as bigint) : (l.args.amount0 as bigint),
      weight: 0n,
      stage: 0,
      tokenId: 0n,
      amount0: l.args.amount0 as bigint,
    });
  }
  return rows;
}

/** Cap first-time catch-up. Robinhood head can be millions of blocks past
    DEPLOY_ANCHOR; scanning that range on the public RPC freezes the UI
    (Observatory, feeds). Prefer a recent window; incremental sync covers the rest. */
const MAX_FIRST_SYNC_SPAN = 30_000n;

/** Bring the store up to the chain head (single-flight; incremental). */
async function sync(): Promise<void> {
  if (!DEPLOY_ANCHOR || !CONTRACTS.token) return; // no anchor → serve empty history
  if (store.inflight) return store.inflight;
  store.inflight = (async () => {
    const c = client();
    const head = await c.getBlock();
    store.headBlock = head.number;
    store.headTsMs = Number(head.timestamp) * 1000;
    let from = store.synced === 0n ? DEPLOY_ANCHOR.block : store.synced + 1n;
    if (from > head.number) return;
    // First sync: jump forward if the gap is huge so we don't block for minutes.
    if (store.synced === 0n && head.number - from > MAX_FIRST_SYNC_SPAN) {
      from = head.number - MAX_FIRST_SYNC_SPAN + 1n;
    }
    const seen = new Set(store.rows.map(rowKey));
    while (from <= head.number) {
      const to = from + CHUNK - 1n > head.number ? head.number : from + CHUNK - 1n;
      const batch = await fetchRange(from, to);
      for (const r of batch) if (!seen.has(rowKey(r))) store.rows.push(r);
      store.synced = to;
      from = to + 1n;
    }
    store.rows.sort((x, y) =>
      x.block === y.block ? x.logIndex - y.logIndex : x.block < y.block ? -1 : 1
    );
  })();
  try {
    await store.inflight;
  } finally {
    store.inflight = null;
  }
}

/** Resolve tx.from for the newest swaps so the feed shows the trader, not the
    router. Cached per hash; bounded so a busy pool can't trigger N lookups. */
async function resolveSwapSenders(): Promise<void> {
  const c = client();
  const pending = store.rows
    .filter((r) => r.name === "swap" && !store.txFrom.has(r.txHash))
    .slice(-SWAP_SENDER_LOOKUPS);
  await Promise.all(
    pending.map(async (r) => {
      try {
        const tx = await c.getTransaction({ hash: r.txHash });
        store.txFrom.set(r.txHash, tx.from as Address);
      } catch {
        /* keep the router address as the fallback */
      }
    })
  );
}

/* --- Row → ActivityEvent ----------------------------------------------------
   Stage note: contract Stage enum is 0..3 (EMBER..PYRE); the app's Stage type is
   1..4, hence the +1. */

function appStage(contractStage: number): Stage {
  return (Math.min(3, Math.max(0, contractStage)) + 1) as Stage;
}

function toActivity(r: Row, spiritOwner: Map<bigint, Address>): ActivityEvent | null {
  const base = { id: rowKey(r), at: blockTime(r.block) };
  switch (r.name) {
    case "burn":
      return { ...base, kind: "burn", address: r.account!, amount: r.amount, note: "burned $PYRE" };
    case "staked":
      return { ...base, kind: "stake", address: r.account!, amount: r.amount, note: "staked $PYRE" };
    case "unstaked":
      return { ...base, kind: "stake", address: r.account!, amount: r.amount, note: "unstaked $PYRE" };
    case "dripClaimed":
      return { ...base, kind: "claim", address: r.account!, amount: r.amount, note: "claimed $PYRE drip" };
    case "rewardPaid":
      return { ...base, kind: "claim", address: r.account!, amount: r.amount, note: "claimed $ETH yield" };
    case "spiritMinted":
      return {
        ...base,
        kind: "mint",
        address: r.account!,
        amount: r.amount,
        note: `${STAGES[appStage(r.stage)].name} minted`,
      };
    case "spiritUpgraded": {
      const owner = spiritOwner.get(r.tokenId);
      if (!owner) return null;
      return {
        ...base,
        kind: "mint",
        address: owner,
        amount: r.amount,
        note: `${STAGES[appStage(r.stage)].name} unlocked`,
      };
    }
    case "immolated":
      return { ...base, kind: "burn", address: r.account!, amount: r.amount, note: "ascended to the Immolated" };
    case "swap":
      return {
        ...base,
        kind: "swap",
        address: store.txFrom.get(r.txHash) ?? r.account!,
        amount: r.amount, // $ETH side of the trade (wei)
        note: r.amount0 < 0n ? "swapped $ETH → $PYRE" : "swapped $PYRE → $ETH",
      };
    default:
      return null;
  }
}

/** tokenId → minting wallet (upgrades don't carry the wallet). */
function spiritOwners(): Map<bigint, Address> {
  const m = new Map<bigint, Address>();
  for (const r of store.rows) if (r.name === "spiritMinted") m.set(r.tokenId, r.account!);
  return m;
}

/* --- Public reads ----------------------------------------------------------- */

export async function getChainActivity(): Promise<ActivityEvent[]> {
  await sync();
  await resolveSwapSenders();
  const owners = spiritOwners();
  const out: ActivityEvent[] = [];
  for (let i = store.rows.length - 1; i >= 0 && out.length < FEED_LIMIT; i--) {
    const evt = toActivity(store.rows[i], owners);
    if (evt) out.push(evt);
  }
  return out;
}

export async function getChainHistory(address: Address): Promise<ActivityEvent[]> {
  await sync();
  await resolveSwapSenders();
  const owners = spiritOwners();
  const me = address.toLowerCase();
  const out: ActivityEvent[] = [];
  for (let i = store.rows.length - 1; i >= 0; i--) {
    const evt = toActivity(store.rows[i], owners);
    if (evt && evt.address.toLowerCase() === me) out.push(evt);
  }
  return out;
}

/** Stage for a leaderboard row, from that wallet's cumulative burn (the same
    thresholds the Acolyte contract uses). */
function stageOf(address: Address, burnedBy: Map<string, bigint>): Stage {
  return stageFromWeight(burnedBy.get(address.toLowerCase()) ?? 0n).stage;
}

function burnedByAddress(): Map<string, bigint> {
  const sys = systemAddresses();
  const m = new Map<string, bigint>();
  for (const r of store.rows) {
    if (r.name !== "burn" && r.name !== "immolated") continue;
    const a = r.account!.toLowerCase();
    if (sys.has(a)) continue;
    m.set(a, (m.get(a) ?? 0n) + r.amount);
  }
  return m;
}

/** Stakers ranked by current effective weight (`weight` = new total per event,
    so the LAST staking event per address is its live weight). */
export async function getChainLeaderboard(): Promise<LeaderboardEntry[]> {
  await sync();
  const weight = new Map<string, { address: Address; weight: bigint }>();
  for (const r of store.rows) {
    if (r.name !== "staked" && r.name !== "unstaked") continue;
    weight.set(r.account!.toLowerCase(), { address: r.account!, weight: r.weight });
  }
  const burned = burnedByAddress();
  return [...weight.values()]
    .filter((w) => w.weight > 0n)
    .sort((a, b) => (b.weight > a.weight ? 1 : b.weight < a.weight ? -1 : 0))
    .slice(0, BOARD_LIMIT)
    .map((w, i) => ({ address: w.address, weight: w.weight, stage: stageOf(w.address, burned), rank: i + 1 }));
}

export async function getChainTopBurners(): Promise<LeaderboardEntry[]> {
  await sync();
  const burned = burnedByAddress();
  return [...burned.entries()]
    .sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0))
    .slice(0, BOARD_LIMIT)
    .map(([addr, w], i) => ({
      address: addr as Address,
      weight: w,
      stage: stageFromWeight(w).stage,
      rank: i + 1,
    }));
}

/** Protocol-wide aggregates that only the logs can answer (no on-chain getters
    exist for any of these; see the header). */
export interface ChainAggregates {
  totalBurned: bigint;
  totalStaked: bigint; // raw $PYRE currently staked (sum of stake moves)
  activeAcolytes: number;
  totalEthDistributed: bigint; // sum of staking RewardAdded (wei)
  volume24h: bigint; // wei of $ETH through our pool, last 24h
  burnRateSeries: SeriesPoint[];
}

export async function getChainAggregates(): Promise<ChainAggregates> {
  await sync();
  let totalBurned = 0n;
  let totalStaked = 0n;
  let totalEthDistributed = 0n;
  let volume24h = 0n;
  let activeAcolytes = 0;
  const now = Date.now();
  const dayAgo = now - 24 * 3600_000;

  // 24 hourly buckets, oldest first, zero-filled so the chart always has a floor.
  const bucketMs = 3600_000;
  const firstBucket = Math.floor(dayAgo / bucketMs) * bucketMs;
  const series = new Map<number, number>();
  for (let t = firstBucket; t <= now; t += bucketMs) series.set(t, 0);

  for (const r of store.rows) {
    switch (r.name) {
      case "burn": {
        totalBurned += r.amount;
        const at = blockTime(r.block);
        if (at >= dayAgo) {
          const bucket = Math.floor(at / bucketMs) * bucketMs;
          series.set(bucket, (series.get(bucket) ?? 0) + toNumber(r.amount));
        }
        break;
      }
      case "staked":
        totalStaked += r.amount;
        break;
      case "unstaked":
        totalStaked -= r.amount;
        break;
      case "rewardAdded":
        totalEthDistributed += r.amount;
        break;
      case "spiritMinted":
        activeAcolytes += 1;
        break;
      case "swap":
        if (blockTime(r.block) >= dayAgo) volume24h += r.amount;
        break;
    }
  }
  if (totalStaked < 0n) totalStaked = 0n;

  const burnRateSeries: SeriesPoint[] = [...series.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, value]) => ({ t, value }));

  return { totalBurned, totalStaked, activeAcolytes, totalEthDistributed, volume24h, burnRateSeries };
}
