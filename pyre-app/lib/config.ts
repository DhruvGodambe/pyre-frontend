/* ============================================================================
   PYRE — App config  ("the switch")
   ----------------------------------------------------------------------------
   USE_MOCK = true  → the whole app runs on realistic fake data (no contract).
   USE_MOCK = false → the app reads/writes the deployed contracts on-chain.

   Today this is true. When the developer ships the contract addresses + ABIs,
   fill in CONTRACTS below, set NEXT_PUBLIC_USE_MOCK=false, and the same UI is
   suddenly live. Nothing else changes.
   ========================================================================== */

import type { Address } from "./types";

export const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK !== "false"; // default: mock on

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 1); // mainnet

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
