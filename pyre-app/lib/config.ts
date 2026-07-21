/* ============================================================================
   PYRE, App config  ("the switch")
   ----------------------------------------------------------------------------
   USE_MOCK = true  → the whole app runs on realistic fake data (no contract).
   USE_MOCK = false → the app reads/writes the deployed contracts on-chain.

   Today this is true. When the developer ships the contract addresses + ABIs,
   fill in CONTRACTS below, set NEXT_PUBLIC_USE_MOCK=false, and the same UI is
   suddenly live. Nothing else changes.
   ========================================================================== */

import type { Address, TokenInfo } from "./types";

export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK !== "false"; // default: mock on

/* The real wallet (wagmi) is used whenever we're live (USE_MOCK=false). It can
   ALSO be force-enabled on top of mock data with NEXT_PUBLIC_REAL_WALLET=true,
   to test the actual connect flow before the chain data source is wired (mock
   data still serves the app, so nothing crashes; the connected address just
   reads mock positions). Default while mocking: off (pretend-connect). */
export const REAL_WALLET =
  !USE_MOCK || process.env.NEXT_PUBLIC_REAL_WALLET === "true";

/* ----------------------------------------------------------------------------
   LAUNCHED = the launch switch. Pre-launch (false, the default) the whole world
   is a sealed PREVIEW: every building can be entered and admired, but only the
   Ashen Cup actually works (quests + wallet submit), so the entire pre-launch
   funnel points there. At launch, set NEXT_PUBLIC_LAUNCHED=true (alongside
   NEXT_PUBLIC_USE_MOCK=false) and every building opens against the contracts.
   Flipped MANUALLY at launch, decoupled from USE_MOCK so the sealed state can be
   demoed on mock data too. See components/ui/sealed-preview.tsx.
   -------------------------------------------------------------------------- */
export const LAUNCHED = process.env.NEXT_PUBLIC_LAUNCHED === "true"; // default: pre-launch

/** The app is served at the root of app.pyreprotocol.com, so there is no path
    prefix (BASE_PATH = ""). Kept as a single knob: if the app ever moves back
    behind a path (e.g. "/app"), set it here AND next.config.mjs basePath to
    match, and every asset()/api() path follows. Use asset() for any file under
    /public. */
export const BASE_PATH = "";
export const asset = (path: string) => `${BASE_PATH}${path}`;

/** The gated kingdom (the real app: village world + panels) lives under this
    path. The PUBLIC front door ("/", the trailer + gate) and the public Ember
    Codex ("/codex") sit OUTSIDE it, so KOLs can see the trailer/docs without a
    password while the kingdom stays team-only (see middleware.ts). Building
    deep-links are KINGDOM_PATH-relative, e.g. /kingdom/ashencup. */
export const KINGDOM_PATH = `${BASE_PATH}/kingdom`;

/* Target chain. Default: Robinhood Chain mainnet (production deploy).
   Set NEXT_PUBLIC_CHAIN_ID=11155111 for Sepolia testnet dev. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4663);

export const TARGET_CHAIN_NAME =
  CHAIN_ID === 4663 ? "Robinhood Chain" : CHAIN_ID === 11155111 ? "Sepolia" : `Chain ${CHAIN_ID}`;

/* Deployed Sepolia (11155111) addresses from the contracts repo
   (github.com/DhruvGodambe/pyre-protocol, broadcast/DeployAll.s.sol). Used as a
   fallback when the NEXT_PUBLIC_* env vars aren't set, so chain mode works on
   the testnet out of the box. Mainnet addresses must be supplied via env. */
const SEPOLIA_CONTRACTS = {
  token: "0xabd9bf9008090f091729290c4e898cb206edd785",
  nft: "0xc0f652201e9382224d0619d26436664a157b0d50",
  staking: "0xf690b15b4ddab1f3927737d52088d7a0a75f3e42",
  immolated: "0x121c764b9209aab55b46d204ed4af1599d6fb892",
  hook: "0xce9cd7eff1156d566cfebada4c025597cf51bff8",
} as const satisfies Record<string, Address>;

/* Robinhood Chain mainnet (4663) — pyre-protocol broadcast/DeployAll.s.sol/4663 */
const ROBINHOOD_CONTRACTS = {
  token: "0x4db57d585fa82ca32d25086ddc069d899f08d455",
  nft: "0xea82487cb1ad960f6beb2572b15cb0770847822d",
  staking: "0xb09d91d97286a546571c50722e95fc4a682a5446",
  immolated: "0xe0362a4c6944178700e53bae831643366eb564ac",
  hook: "0x94fe63792ec58c064f47cdd884b61035d04c7ff8",
} as const satisfies Record<string, Address>;

const onSepolia = CHAIN_ID === 11155111;
const onRobinhood = CHAIN_ID === 4663;
const chainDefaults = onSepolia ? SEPOLIA_CONTRACTS : onRobinhood ? ROBINHOOD_CONTRACTS : null;

/** Resolved from env, with per-chain deploy addresses as fallback. */
export const CONTRACTS: Record<
  "token" | "nft" | "staking" | "immolated" | "hook",
  Address | null
> = {
  token: (process.env.NEXT_PUBLIC_PYRE_TOKEN as Address) ?? chainDefaults?.token ?? null,
  nft: (process.env.NEXT_PUBLIC_PYRE_NFT as Address) ?? chainDefaults?.nft ?? null,
  staking: (process.env.NEXT_PUBLIC_PYRE_STAKING as Address) ?? chainDefaults?.staking ?? null,
  immolated: (process.env.NEXT_PUBLIC_PYRE_IMMOLATED as Address) ?? chainDefaults?.immolated ?? null,
  hook: (process.env.NEXT_PUBLIC_PYRE_HOOK as Address) ?? chainDefaults?.hook ?? null,
};

/* Where on-chain history starts: the block that carried the whole deployment
   (all five contracts + facets landed in one block on Sepolia) and its
   timestamp. The event layer (lib/datasource/events.ts) scans logs from here
   and interpolates block→time between this anchor and the chain head, so feeds
   and charts need no per-block RPC lookups. For mainnet, supply both via env at
   launch; without an anchor the event layer serves empty history rather than
   scanning from genesis. */
export const DEPLOY_ANCHOR: { block: bigint; tsMs: number } | null =
  process.env.NEXT_PUBLIC_DEPLOY_BLOCK && process.env.NEXT_PUBLIC_DEPLOY_TS
    ? {
        block: BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK),
        tsMs: Number(process.env.NEXT_PUBLIC_DEPLOY_TS) * 1000,
      }
    : onRobinhood
      ? { block: 13860500n, tsMs: 1784467431_000 }
      : onSepolia
        ? { block: 11103396n, tsMs: 1781982147_000 }
        : null;

/* The protocol trades through a custom V4 router (IUniswapV4Router04), NOT the
   canonical Universal Router. Sepolia deploy uses the vanity router below; set
   NEXT_PUBLIC_SWAP_ROUTER for other chains. */
export const SWAP_ROUTER: Address | null =
  (process.env.NEXT_PUBLIC_SWAP_ROUTER as Address) ??
  (onSepolia
    ? "0x00000000000044a361Ae3cAc094c9D1b14Eece97"
    : onRobinhood
      ? "0x8876789976dEcBfCbBbe364623C63652db8C0904"
      : null);

/* ============================================================================
   UNISWAP V4, Grand Exchange swap wiring
   ----------------------------------------------------------------------------
   The Grand Exchange swaps PYRE↔ETH against our own v4 pool (which carries the
   PYRE Diamond hook). Everything below is READ by ChainDataSource and is INERT
   while USE_MOCK is true, the mock needs none of it. When the dev deploys the
   pool, pick the network, confirm the PoolKey, set NEXT_PUBLIC_USE_MOCK=false,
   and fill in lib/datasource/chain.ts. Nothing in the UI changes.

   Addresses verified from docs.uniswap.org/contracts/v4/deployments (Jun 2026).
   Permit2 is the same canonical address on every chain.
   ========================================================================== */

export interface V4Addresses {
  poolManager: Address;
  v4Quoter: Address;
  stateView: Address;
  universalRouter: Address;
  positionManager: Address;
  permit2: Address;
}

const PERMIT2: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/** v4 deployment addresses by chain id. Default test target: Sepolia. */
export const V4_DEPLOYMENTS: Record<number, V4Addresses> = {
  1: {
    poolManager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
    v4Quoter: "0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203",
    stateView: "0x7ffe42c4a5deea5b0fec41c94c136cf115597227",
    universalRouter: "0x4c82d1fbfe28c977cbb58d8c7ff8fcf9f70a2cca",
    positionManager: "0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e",
    permit2: PERMIT2,
  },
  11155111: {
    // Sepolia
    poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
    v4Quoter: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227",
    stateView: "0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c",
    universalRouter: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
    positionManager: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
    permit2: PERMIT2,
  },
  84532: {
    // Base Sepolia
    poolManager: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408",
    v4Quoter: "0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba",
    stateView: "0x571291b572ed32ce6751a2cb2486ebee8defb9b4",
    universalRouter: "0x492e6456d9528771018deb9e87ef7750ef184104",
    positionManager: "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80",
    permit2: PERMIT2,
  },
  1301: {
    // Unichain Sepolia
    poolManager: "0x00b036b58a818b1bc34d502d3fe730db729e62ac",
    v4Quoter: "0x56dcd40a3f2d466f48e7f48bdbe5cc9b92ae4472",
    stateView: "0xc199f1072a74d4e905aba1a84d9a45e2546b6222",
    universalRouter: "0xf70536b3bcc1bd1a972dc186a2cf84cc6da6be5d",
    positionManager: "0xf969aee60879c54baaed9f3ed26147db216fd664",
    permit2: PERMIT2,
  },
  4663: {
    // Robinhood Chain mainnet
    poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
    v4Quoter: "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94",
    stateView: "0xF3334192D15450CdD385c8B70e03f9A6bD9E673b",
    universalRouter: "0x8876789976dEcBfCbBbe364623C63652db8C0904",
    positionManager: "0x58daec3116aae6d93017baaea7749052e8a04fa7",
    permit2: PERMIT2,
  },
};

/** The active deployment for the configured CHAIN_ID (undefined if unsupported). */
export const V4 = V4_DEPLOYMENTS[CHAIN_ID];

/** Dynamic-fee sentinel: a v4 pool whose LP fee is set by its hook at swap time
    carries this flag as its PoolKey.fee. PYRE uses a static pool fee + a hook
    fee, so this is false, but the field is here for the dev to flip if the
    Diamond hook is reconfigured to a dynamic fee. */
export const DYNAMIC_FEE_FLAG = 0x800000;

/** The PoolKey of our PYRE↔ETH pool. currency0 < currency1 by address; native
    ETH is address(0), so it sorts first → currency0 = ETH, currency1 = PYRE.
    fee/tickSpacing/hooks are confirmed at deploy time. */
export const POOL = {
  // Uniswap v4 fee param of the deployed PYRE↔ETH pool (3000 = 0.30%), matching
  // the contracts repo deploy default (PYRE_POOL_FEE=3000). The live hook fee
  // (buy 10%→5% / sell 23%→5%, linear over the launch window) is read from the
  // diamond's getCurrent{Buy,Sell}FeeBps in getSwapQuote, so the chain-mode fee
  // display is exact. The old POOL_FEE_BPS/HOOK_FEE_BPS constants only feed the
  // mock's demo quotes.
  feeTier: 3000,
  tickSpacing: 60,
  isDynamicFee: false,
  /** address(0) sentinel for native ETH as currency0. */
  nativeCurrency: "0x0000000000000000000000000000000000000000" as Address,
  /** Resolved from CONTRACTS at handoff: token = PYRE (currency1), hook = Diamond. */
  get currency1(): Address | null {
    return CONTRACTS.token;
  },
  get hook(): Address | null {
    return CONTRACTS.hook;
  },
};

/** The two tradable tokens, styled like a Uniswap token row. Logos live under
    /public (asset()); swap them when the designer ships final marks. */
export const TOKENS: { pyre: TokenInfo; eth: TokenInfo } = {
  pyre: {
    symbol: "PYRE",
    name: "Pyre",
    address: CONTRACTS.token,
    decimals: 18,
    logoURI: asset("/tokens/pyre.svg"),
    isNative: false,
  },
  eth: {
    symbol: "$ETH", // brand style: ETH is shown as $ETH everywhere
    name: "Ether",
    address: null,
    decimals: 18,
    logoURI: asset("/tokens/eth.svg"),
    isNative: true,
  },
};
