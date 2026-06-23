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

/** The app is served under /app (next.config.mjs basePath). Raw assets, the
    intro video, and <Image> sources (Next does NOT reliably prefix basePath on
    image src in this multi-zone setup), must add it. Use asset() for any file
    under /public. */
export const BASE_PATH = "/app";
export const asset = (path: string) => `${BASE_PATH}${path}`;

/* Testing phase → default to Sepolia (the dev tests the pool + hook on a
   testnet). Flips to mainnet (1) at launch via NEXT_PUBLIC_CHAIN_ID, or set it
   to 84532 (Base Sepolia) / 1301 (Unichain Sepolia), all four are in
   V4_DEPLOYMENTS below. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111); // Sepolia

/** Filled in at contract handoff. Empty until then. */
export const CONTRACTS: Record<
  "token" | "nft" | "staking" | "immolated" | "hook",
  Address | null
> = {
  token: (process.env.NEXT_PUBLIC_PYRE_TOKEN as Address) ?? null,
  nft: (process.env.NEXT_PUBLIC_PYRE_NFT as Address) ?? null,
  staking: (process.env.NEXT_PUBLIC_PYRE_STAKING as Address) ?? null,
  immolated: (process.env.NEXT_PUBLIC_PYRE_IMMOLATED as Address) ?? null,
  hook: (process.env.NEXT_PUBLIC_PYRE_HOOK as Address) ?? null,
};

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
  feeTier: 100, // pool LP fee in bps (1%), see POOL_FEE_BPS in constants.ts
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
    symbol: "ETH",
    name: "Ether",
    address: null,
    decimals: 18,
    logoURI: asset("/tokens/eth.svg"),
    isNative: true,
  },
};
