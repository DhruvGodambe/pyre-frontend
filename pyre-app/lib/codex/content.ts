/* THE EMBER CODEX, the protocol documentation.

   This is the real documentation for Pyre, not a tour of the buildings. Each
   chapter specifies one subsystem, drawn from the deployed contracts (github
   DhruvGodambe/pyre-protocol) and mirrored in lib/constants.ts. A building's
   "Read the rite" opens the chapter that documents that subsystem.

   Voice: precise, neutral, technical. State mechanisms and parameters; never
   promise outcomes. No hype, no em-dashes. $PYRE and $ETH are always written
   with the $. Numbers here are the designed mechanics; final on-chain values
   are published at launch and are verifiable against the contracts. */

import type { BuildingId } from "@/components/buildings";

/** Functional diagrams the reader can render inside a section (components/codex-diagrams.tsx). */
export type CodexDiagramId = "yield-flow" | "decay-curve";

export interface CodexSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  /** an optional on-brand diagram rendered after this section's text. */
  diagram?: CodexDiagramId;
}

export interface CodexChapter {
  id: string;
  title: string;
  tagline: string;
  /** the building this chapter documents, if any (used by "Read the rite"). */
  building?: BuildingId;
  /** custom art for chapters WITHOUT a building (e.g. the village on the overview):
      a square-ish icon and a full-width hero image, both asset() paths. */
  icon?: string;
  hero?: string;
  heroAlt?: string;
  sections: CodexSection[];
}

export const CODEX: CodexChapter[] = [
  {
    id: "what-is-pyre",
    title: "What is Pyre",
    tagline: "Protocol overview",
    icon: "/brand/logo-color.png",
    hero: "village",
    heroAlt: "The Pyre kingdom",
    sections: [
      {
        paragraphs: [
          "Pyre Protocol is a token economy deployed on Ethereum and built directly on Uniswap v4. It combines three mechanisms: a hard-capped token with epoch-based decay on idle balances, single-sided staking that accrues yield denominated in $ETH, and a burn-to-mint NFT, the Acolyte, whose tier acts as a multiplier on staking yield.",
          "The design premise is simple to state: every liquid $PYRE balance carries a holding cost, applied per epoch, while committed balances do not. Holders choose between two forms of commitment. Staking exempts a balance from decay and earns a pro rata share of $ETH yield. Burning permanently removes supply and mints or upgrades an Acolyte, raising the multiplier on everything the stake earns. The two mechanisms are designed to be combined.",
          "The Ember Codex documents each subsystem in its own chapter, and each subsystem is drawn as a building in the kingdom: the Bonfire is supply and decay, the Forge is staking and burning, the Black Market is the Acolyte. Read the chapters in order for the full specification, or open the chapter behind any building.",
        ],
      },
      {
        diagram: "yield-flow",
      },
      {
        paragraphs: [
          "The chapters that follow specify the system in full: the on-chain architecture, the decay schedule and its halvings, the staking weight formula, the Acolyte tiers and both burn tracks, and the Immolated prestige. Every parameter quoted in this Codex mirrors the deployed contracts, and all of it can be verified on-chain once addresses are published at launch.",
        ],
      },
    ],
  },
  {
    id: "architecture",
    title: "Under the Hood",
    tagline: "Uniswap v4, hooks, and the Diamond",
    icon: "/brand/logo-color.png",
    sections: [
      {
        paragraphs: [
          "Pyre is implemented as a Uniswap v4 hook with a set of periphery contracts around it. This chapter describes the on-chain architecture: what v4 provides, how the hook is structured, and which contract owns each mechanism.",
        ],
      },
      {
        heading: "Why Uniswap v4",
        paragraphs: [
          "Uniswap v4 replaces the contract-per-pool model of earlier versions with a singleton: one PoolManager contract holds every pool. Alongside the singleton design, v4 introduces hooks, external contracts that a pool registers at creation and that the PoolManager invokes at fixed points in the pool's lifecycle, including beforeSwap and afterSwap.",
          "Hooks are what allow Pyre to exist as a protocol rather than a token with off-chain promises. Protocol logic executes inside the same transaction as the swap that triggers it, atomically: either the swap and the protocol logic both execute, or neither does. The core path depends on no keepers, schedulers, or trusted operators.",
        ],
        bullets: [
          "The canonical market is a single $PYRE/$ETH pool on the v4 PoolManager.",
          "The Pyre hook is registered on that pool and runs on every swap through it.",
          "Hook execution is atomic with the swap it accompanies.",
        ],
      },
      {
        heading: "The hook is a Diamond (EIP-2535)",
        paragraphs: [
          "The Pyre hook follows the Diamond standard, EIP-2535, a modular contract architecture. Rather than one monolithic contract, the hook's logic is divided into facets, each owning a single concern. The pool registers one stable hook address, and every subsystem operates behind it.",
        ],
        bullets: [
          "SwapHook facet: implements the v4 callbacks and routes each swap through the protocol's logic.",
          "Burn facet: accounting for token burns and cumulative burn weight.",
          "LpBurn facet: executes the LP burn track and locks the v4 liquidity position permanently.",
          "YieldDistribution facet: moves $ETH into the staking contract's yield accumulator for distribution.",
        ],
      },
      {
        paragraphs: [
          "Uniswap v4 encodes a hook's permission set, the list of callbacks it is allowed to implement, into the hook's own address, which is mined with CREATE2 at deployment. The set of callbacks is therefore fixed the moment the pool is created: callbacks not claimed at deployment can never be added.",
        ],
      },
      {
        heading: "The periphery contracts",
        paragraphs: [
          "Four contracts around the hook own the protocol's state:",
        ],
        bullets: [
          "PyreToken (ERC-20): the $PYRE token. Enforces the 1,000,000,000 hard cap and implements epoch decay on liquid balances.",
          "PyreStaking: holds staked $PYRE, computes each staker's effective weight, accrues the $ETH yield accumulator, and manages the 7 day unstake release.",
          "Acolyte (ERC-721): the Acolyte NFT. Records cumulative burn weight, resolves tier and burn track, and is read directly by the staking contract when weighting yield.",
          "ImmolatedGate: the Ascend rite. Verifies Pyre-tier eligibility and executes the one-time Immolation.",
        ],
      },
      {
        paragraphs: [
          "Decay is not applied by any external process. The token contract maintains a global decay index that compounds per epoch, and each account settles lazily against that index whenever the account is next touched. Balances are therefore correct at every block without any keeper iterating over holders.",
        ],
      },
      {
        heading: "Verifiability",
        paragraphs: [
          "The hook's permission set, the supply cap, and the structure of the decay schedule are fixed at deployment. Contract addresses are published at launch, and every figure in this Codex can be checked against them directly on-chain.",
        ],
      },
    ],
  },
  {
    id: "supply-and-decay",
    title: "The Bonfire",
    tagline: "Supply, decay, and tokenomics",
    building: "bonfire",
    sections: [
      {
        paragraphs: [
          "$PYRE has a hard cap of 1,000,000,000 tokens, enforced by the token contract. There is no emissions schedule and no inflation: supply moves in one direction only. It falls through two channels, the burns holders execute at the Forge and the epoch decay applied to idle balances.",
          "The Bonfire at the center of the kingdom is the live counter of cumulative burned supply from both channels, read from the chain.",
        ],
      },
      {
        heading: "Decay mechanics",
        paragraphs: [
          "The protocol keeps time in epochs. Each epoch, a fixed percentage of every liquid balance is burned, compounding per epoch. Decay applies exclusively to liquid $PYRE: balances held by the staking contract are exempt for as long as they remain staked.",
        ],
        bullets: [
          "Epoch length: one hour (3,600 seconds).",
          "Initial decay rate: 0.45% per epoch on liquid balances.",
          "Halving schedule: the rate halves every 2,000 epochs, roughly every 83 days.",
          "Floor: the rate never falls below 0.01% per epoch.",
        ],
      },
      {
        diagram: "decay-curve",
      },
      {
        heading: "Design rationale",
        paragraphs: [
          "The schedule front-loads the cost of idleness. Decay is steepest in the protocol's earliest epochs, when the incentive to commit matters most, and eases with each halving toward the floor. The floor is deliberate: the holding cost of an idle balance never reaches zero, so the decision between staking and decaying remains live for the life of the protocol.",
          "Decayed tokens are burned, not redistributed. Every epoch of decay is a permanent reduction of supply, indistinguishable on-chain from a chosen burn.",
        ],
      },
    ],
  },
  {
    id: "forge",
    title: "The Forge",
    tagline: "Staking and burning",
    building: "forge",
    sections: [
      {
        heading: "Staking",
        paragraphs: [
          "Staking transfers $PYRE into the staking contract, where it is exempt from decay and begins accruing yield. Yield is denominated and paid in $ETH, not in additional $PYRE, and it accrues continuously against the staking contract's yield accumulator.",
          "Distribution is pro rata by effective weight. A staker's effective weight is their staked balance multiplied by every multiplier the wallet holds: the Acolyte tier multiplier, the burn track multiplier (token burn or LP burn), and the Immolated boost. Effective weight = staked balance x tier multiplier x track multiplier x Immolated boost. A larger weight draws a proportionally larger share of the same flow.",
        ],
      },
      {
        heading: "Claiming and unstaking",
        paragraphs: [
          "Accrued $ETH can be claimed at any time. Claiming is independent of principal: it never unstakes or otherwise touches staked $PYRE.",
          "Unstaking is not instant. It initiates a 7 day linear release during which the position returns to the liquid balance steadily across the window. The returning portion accrues no yield, and each portion that arrives is liquid $PYRE again, subject to decay like any other liquid balance. The release exists to make exits gradual rather than atomic.",
        ],
      },
      {
        heading: "Burning and the Acolyte",
        paragraphs: [
          "Burning permanently removes $PYRE from supply and credits the wallet's cumulative burn weight, the running total of everything it has ever burned. When cumulative burn weight first crosses the Ember threshold, the Acolyte, an ERC-721, is minted to the wallet; the same token then upgrades in place as later burns cross each subsequent threshold. Tier is monotonic: it only rises, and no single burn needs to cross a threshold on its own.",
        ],
        bullets: [
          "Ember Acolyte: 10,000 $PYRE cumulative burn, 1x yield multiplier.",
          "Flame Acolyte: 75,000 $PYRE cumulative burn, 1.5x yield multiplier.",
          "Forge Acolyte: 150,000 $PYRE cumulative burn, 2x yield multiplier.",
          "Pyre Acolyte: 300,000 $PYRE cumulative burn, 3x yield multiplier.",
        ],
      },
      {
        heading: "Two burn tracks",
        paragraphs: [
          "There are two burn tracks with identical thresholds. The token burn track burns $PYRE alone. The LP burn track pairs $PYRE with $ETH as liquidity in the canonical pool and locks the resulting position permanently: principal can never be withdrawn, by anyone, including the burner.",
          "An LP Acolyte carries double the multiplier of a token-burn Acolyte at every tier, 2x to 6x against 1x to 3x, reflecting the deeper and two-sided commitment. The mechanics of the position lock, and why locked liquidity keeps contributing after the burn, are specified in the Acolyte chapter.",
        ],
      },
      {
        paragraphs: [
          "One rule governs the entire Forge: burning alone earns nothing. The Acolyte is a multiplier on staking yield, not a yield source. A wallet holding a Pyre Acolyte with zero staked $PYRE accrues zero $ETH. Staking earns, burning multiplies, and the protocol is designed for both together.",
          "Beyond the top tier sits one further standing, the Immolated, reached through the Ascend rite. It is specified in the chapter on the Hall of the Immolated.",
        ],
      },
    ],
  },
  {
    id: "vault",
    title: "The Amber Vault",
    tagline: "Position accounting",
    building: "vault",
    sections: [
      {
        paragraphs: [
          "The Amber Vault is the position ledger. Every $PYRE balance a wallet holds sits in exactly one of three states, and the Vault reports all three at once, alongside the wallet's Acolyte, its tier and track, and unclaimed $ETH.",
        ],
      },
      {
        heading: "Liquid, staked, and returning",
        bullets: [
          "Liquid: undeployed $PYRE in the wallet. It can be staked, burned, or swapped, and it is the only state subject to epoch decay.",
          "Staked: $PYRE held by the staking contract. Exempt from decay, accruing $ETH pro rata by effective weight.",
          "Returning: $PYRE inside the 7 day unstake release, flowing back to liquid steadily. It accrues no yield during the window.",
        ],
      },
      {
        paragraphs: [
          "Together, the three states and the Acolyte are a wallet's complete protocol position: what is accruing, what is idle, and what is in transit between the two. Every action that changes the position is taken at the Forge.",
        ],
      },
    ],
  },
  {
    id: "observatory",
    title: "The Observatory",
    tagline: "Protocol metrics",
    building: "observatory",
    sections: [
      {
        paragraphs: [
          "The Observatory is the protocol's public dashboard, readable without a wallet, signature, or account. Every figure is read from the chain, so the protocol's state can be audited before anything is committed to it.",
        ],
      },
      {
        heading: "What the readings mean",
        bullets: [
          "Total supply: remaining $PYRE. Monotonically decreasing.",
          "Total burned: cumulative supply removed, across chosen burns and epoch decay.",
          "Decay rate: the per-epoch rate currently applied to liquid balances, reflecting all halvings to date.",
          "$ETH yield: the current flow being distributed across total staked weight.",
        ],
      },
      {
        paragraphs: [
          "Nothing shown here is a projection or an estimate. The same values are exposed by the contracts directly, and every parameter quoted in this Codex can be checked against them at any time.",
        ],
      },
    ],
  },
  {
    id: "exchange",
    title: "The Grand Exchange",
    tagline: "Swapping $PYRE",
    building: "exchange",
    sections: [
      {
        paragraphs: [
          "The Grand Exchange is the swap interface for the canonical $PYRE/$ETH pool on Uniswap v4, the pool the Pyre hook is registered on. It is the protocol's venue for entering and exiting $PYRE.",
          "Quotes are shown in full before execution: the exact amount to be received is displayed and nothing executes without explicit confirmation. Execution settles against the v4 PoolManager in a single transaction.",
        ],
      },
      {
        paragraphs: [
          "Swapped-in $PYRE arrives as a liquid balance, and liquid balances decay per epoch. The intended next step after acquiring $PYRE is the Forge: stake it, burn it, or both.",
        ],
      },
    ],
  },
  {
    id: "market",
    title: "The Black Market",
    tagline: "The Acolyte NFT",
    building: "market",
    sections: [
      {
        paragraphs: [
          "The Acolyte is Pyre's ERC-721. It is minted by burning, it records the wallet's cumulative burn weight on-chain, and its tier multiplies staking yield. A wallet holds at most one Acolyte, and the token is freely transferable.",
          "An Acolyte is not a claim on anything external. It is the on-chain record of the burn itself, and the staking contract reads it directly when computing effective weight. Its value derives from the supply permanently removed to create it and the multiplier that removal earned.",
        ],
      },
      {
        heading: "The four tiers",
        paragraphs: [
          "Tier resolves from cumulative burn weight and never falls. Thresholds and multipliers are set in the Acolyte contract and mirrored at the Forge. Each tier's art is rarer and more elaborate than the last.",
        ],
        bullets: [
          "Ember: 10,000 burned. 1x on the token track, 2x on the LP track.",
          "Flame: 75,000 burned. 1.5x on the token track, 3x on the LP track.",
          "Forge: 150,000 burned. 2x on the token track, 4x on the LP track.",
          "Pyre: 300,000 burned. 3x on the token track, 6x on the LP track.",
        ],
      },
      {
        heading: "Token-burn and LP-burn Acolytes",
        paragraphs: [
          "The two burn tracks mint mechanically and visually distinct Acolytes. A token-burn Acolyte is minted by burning $PYRE alone. An LP Acolyte is minted by pairing $PYRE with $ETH into the canonical pool and locking the position; it is the rarer of the two and carries twice the multiplier at every tier, pricing the two-sided, irreversible commitment it represents.",
        ],
      },
      {
        heading: "The LP lock",
        paragraphs: [
          "In Uniswap v4 a liquidity position is not a fungible LP token but a position NFT. An LP burn deposits the pair and transfers that position into a locker contract which permanently blocks principal withdrawal. The liquidity itself never leaves the pool: it remains active market depth for $PYRE for the life of the protocol, and the locked position continues to contribute $ETH to the yield stakers share.",
          "This is the structural difference between the tracks. A token burn reduces supply once and is complete. An LP burn reduces circulating supply, permanently deepens the pool, and keeps contributing to protocol yield indefinitely. The doubled multiplier prices that difference.",
        ],
      },
      {
        heading: "The Immolated",
        paragraphs: [
          "Beyond the top tier sits one further form: the Immolated, the rarest state the Acolyte takes and the protocol's terminal prestige. It is not a tier reached by accumulation but a rite chosen after reaching Pyre. Its mechanics are specified in the chapter on the Hall of the Immolated.",
        ],
      },
      {
        heading: "The secondary market",
        paragraphs: [
          "Acolytes trade on the Black Market. Because tier and cumulative burn weight travel with the token, acquiring an Acolyte acquires its multiplier: the buyer's staked $PYRE is weighted by the purchased tier from acquisition onward. An Acolyte is a transferable position in the protocol, not only a collectible.",
        ],
      },
    ],
  },
  {
    id: "immolated",
    title: "The Hall of the Immolated",
    tagline: "The Ascend rite",
    building: "immolated",
    sections: [
      {
        paragraphs: [
          "The Immolated is the protocol's terminal prestige. It is not a fifth tier: it is a one-time, irreversible rite, available only to wallets that have already reached the Pyre tier.",
        ],
      },
      {
        heading: "The Ascend rite",
        paragraphs: [
          "Eligibility requires the Pyre tier, 300,000 $PYRE of cumulative burn weight. The rite itself burns a further 100,000 $PYRE in the Hall, executed through the ImmolatedGate contract. A wallet on the LP track pairs the equivalent $ETH as well, both locked permanently, and becomes LP Immolated. The rite executes once per wallet and cannot be undone.",
        ],
      },
      {
        heading: "What it grants",
        paragraphs: [
          "Immolation grants a permanent 1.2x multiplier on staking yield, stacking multiplicatively with tier and track. Of all staked weight, Immolated wallets are therefore the most heavily weighted per token staked.",
          "This also defines the protocol's ceiling. The maximum tier multiplier is 6x, the Pyre tier on the LP track. With the Immolated boost, the highest effective multiplier any wallet can reach is 6 x 1.2, a 7.2x weight on staked yield. Beyond the multiplier, the Immolated Acolyte is visually distinct from every form beneath it.",
        ],
      },
    ],
  },
  {
    id: "ashen-cup",
    title: "The Ashen Cup",
    tagline: "Quests and Points",
    building: "tavern",
    sections: [
      {
        paragraphs: [
          "Before launch, the Ashen Cup is the only unlocked building. It hosts the quest program: complete quests to earn Points and climb the leaderboard, and earn additional Points for every invited participant who arrives and takes part.",
          "What Points redeem for is disclosed closer to launch. Standings accumulate now, are recorded, and are retained through launch.",
        ],
      },
    ],
  },
];

/** Chapter for a building, used by the contextual "Read the rite" links. */
export function codexChapterForBuilding(b: BuildingId): CodexChapter | undefined {
  return CODEX.find((c) => c.building === b);
}
