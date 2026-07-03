/* ARCHIVED 2026-07-03: pyre-app/lib/codex/content.ts exactly as it was BEFORE
   the professional rewrite (neutral tone + "Under the Hood" architecture
   chapter). To revert, copy this file's content back over
   pyre-app/lib/codex/content.ts. */

/* THE EMBER CODEX, the in-world documentation.

   This is the real documentation for Pyre, not a tour of the buildings. Each
   chapter explains one part of the actual system, drawn from the deployed
   contracts (github DhruvGodambe/pyre-protocol) and mirrored in lib/constants.ts.
   A building's "Read the rite" opens the chapter that documents that subsystem.

   Voice: the Emberkeeper. Plain, warm, precise, no hype, no em-dashes. $PYRE and
   $ETH are always written with the $. Numbers here are the designed mechanics; the
   final on-chain values are confirmed at launch and can be verified on-chain. */

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
    tagline: "The flame, the decay, the yield",
    icon: "/brand/logo-color.png",
    hero: "village",
    heroAlt: "The Pyre kingdom",
    sections: [
      {
        paragraphs: [
          "Welcome to Pyre kingdom, the whole protocol drawn as a place, where every building is one part of the system. The Bonfire burns at its heart, the Forge is where you stake and burn, the Hall of the Immolated crowns those who give the most. Walk the kingdom, building by building, and you understand exactly how Pyre works.",
          "Pyre Protocol rests on a single idea: standing still has a cost, and conviction is paid. Do nothing with your $PYRE and it slowly decays back into the fire. Commit it, and it works for you.",
          "There are two ways to commit. Stake your $PYRE to earn real $ETH and stop the decay. Burn your $PYRE to forge an Acolyte, an NFT that multiplies everything your stake earns. The two are meant to be done together.",
        ],
      },
      {
        diagram: "yield-flow",
      },
      {
        paragraphs: [
          "Everything else here is detail on that loop: how decay is measured, how yield is shared, how the Acolyte tiers work, and how the highest standing, the Immolated, is earned. Each building in the kingdom has its own chapter, so read them in order, or step into whichever draws you.",
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
          "There will only ever be 1,000,000,000 $PYRE, and that number only falls. Supply is never minted after launch. It leaves permanently in two ways: the burns people choose, and the decay of $PYRE left idle.",
          "The Bonfire at the center of the kingdom is the live count of everything ever returned to the fire, from both sources, updating in real time.",
        ],
      },
      {
        heading: "How decay works",
        paragraphs: [
          "Any $PYRE sitting in your wallet unstaked is idle, and idle $PYRE decays. The protocol keeps time in epochs, and one epoch is one hour. A small, steady share of every idle balance is burned away each epoch. Decay only touches idle balances: the moment you stake, it stops.",
        ],
        bullets: [
          "One epoch is one hour, and decay is applied every epoch.",
          "Decay begins at about 0.45% per epoch on idle balances.",
          "The rate halves every 2,000 epochs, roughly 83 days, easing over time.",
          "It never reaches zero: a permanent floor of about 0.01% per epoch remains forever.",
        ],
      },
      {
        diagram: "decay-curve",
      },
      {
        paragraphs: [
          "The design is deliberate. The early days punish idleness hardest, so the patient are rewarded for committing early, and the pressure to act never fully disappears. There is no safe idle position, only staked or decaying.",
        ],
      },
    ],
  },
  {
    id: "forge",
    title: "The Forge",
    tagline: "Stake and burn",
    building: "forge",
    sections: [
      {
        heading: "Staking, and how $ETH yield is earned",
        paragraphs: [
          "Stake your $PYRE and two things happen at once: it stops decaying, and it begins earning real $ETH. Not more $PYRE dressed up as yield, real $ETH, paid to the wallets that hold their ground.",
          "The $ETH gathers from the life of the protocol as $PYRE moves through the kingdom, and it is shared among stakers in proportion to their weight. Your weight is your staked balance lifted by every multiplier you have earned: your Acolyte tier, your burn path (regular burn or LP burn), and your Immolated standing. Higher weight, larger share.",
        ],
      },
      {
        heading: "Claiming and unstaking",
        paragraphs: [
          "Your earned $ETH accrues continuously and can be claimed at any time; claiming never touches your staked $PYRE. Unstaking, though, is not instant. It opens a 7 day drip: your $PYRE returns to your liquid balance steadily across the week, and only once it has fully returned can it move or be swapped. The fire lets go slowly.",
        ],
      },
      {
        heading: "Burning, and your Acolyte",
        paragraphs: [
          "Burn $PYRE and you forge an Acolyte, a living NFT that is the mark of what you have given. Its tier is set by your cumulative burn, the running total of everything you have ever sent to the fire, and it only rises. The first Acolyte is minted once your burns reach the Ember threshold.",
        ],
        bullets: [
          "Ember Acolyte, 10,000 burned, 1x yield",
          "Flame Acolyte, 75,000 burned, 1.5x yield",
          "Forge Acolyte, 150,000 burned, 2x yield",
          "Pyre Acolyte, 300,000 burned, 3x yield",
        ],
      },
      {
        heading: "Two ways to burn",
        paragraphs: [
          "There are two burn paths, each its own track with the same four tiers and the same amounts. Burn tokens: send $PYRE alone into the fire. Burn LP: pair your $PYRE with $ETH and commit both to the fire's liquidity, permanently, and neither can ever be withdrawn.",
          "The LP path forges a rarer Acolyte that earns more, and the liquidity you commit keeps generating $ETH long after the burn. The two kinds of Acolyte, and why burned liquidity keeps paying, are covered in the chapter on Acolytes.",
        ],
      },
      {
        paragraphs: [
          "One rule ties it together: burning alone earns nothing. The Acolyte only multiplies yield you are already earning from staking. Stake to earn, burn to multiply, and do both to pull hardest on the fire.",
          "A final standing waits beyond the top tier, the Immolated. Reach Pyre first, then read the chapter on the Hall.",
        ],
      },
    ],
  },
  {
    id: "vault",
    title: "The Amber Vault",
    tagline: "Your position",
    building: "vault",
    sections: [
      {
        paragraphs: [
          "The Amber Vault is your own ledger. Everything you hold sits in one of three states, and the Vault shows all of them at once, alongside your Acolyte, its tier, and the $ETH waiting to be claimed.",
        ],
      },
      {
        heading: "Liquid, staked, and returning",
        bullets: [
          "Liquid: free $PYRE in your wallet. It can be staked, burned, or swapped, and it is the only balance that decays.",
          "Staked: $PYRE committed at the Forge. It does not decay and it earns $ETH.",
          "Returning: $PYRE mid-way through the 7 day unstake drip, flowing back to liquid a little at a time.",
        ],
      },
      {
        paragraphs: [
          "Reading these three tells you your whole standing at a glance: what is working for you, what is at rest, and what is on its way back. From here every path leads back to the Forge, to stake or burn more.",
        ],
      },
    ],
  },
  {
    id: "observatory",
    title: "The Observatory",
    tagline: "Reading the protocol",
    building: "observatory",
    sections: [
      {
        paragraphs: [
          "The Observatory is the honest window on the system, open to anyone, no wallet required. It reports the live state of the whole protocol so you can judge it before you step in.",
        ],
      },
      {
        heading: "What the readings mean",
        bullets: [
          "Total supply: how much $PYRE remains. It only falls.",
          "Total burned: everything ever returned to the fire, by burns and by decay.",
          "Decay rate: the current hourly rate eating idle balances.",
          "$ETH yield: the flow currently being shared among stakers.",
        ],
      },
      {
        paragraphs: [
          "Nothing here is a promise or a projection. Every figure is read straight from the chain, the same numbers anyone else can verify.",
        ],
      },
    ],
  },
  {
    id: "exchange",
    title: "The Grand Exchange",
    tagline: "Trading $PYRE",
    building: "exchange",
    sections: [
      {
        paragraphs: [
          "The Grand Exchange is where $PYRE and $ETH are swapped, built directly on Uniswap v4. It is the way in and the way out.",
          "What you will receive is shown in full before you confirm, with nothing hidden in the trade. You always see the exact amount you are getting, and you approve it yourself.",
        ],
      },
      {
        paragraphs: [
          "$PYRE you buy here arrives liquid, and liquid $PYRE decays. To make it work for you, take it to the Forge and stake or burn.",
        ],
      },
    ],
  },
  {
    id: "market",
    title: "The Black Market",
    tagline: "Acolytes as NFTs",
    building: "market",
    sections: [
      {
        paragraphs: [
          "An Acolyte is the living mark of what you have given to the fire. You forge one at the Forge by burning $PYRE, and from then on it is yours, an NFT that carries the full weight of everything you have burned.",
          "Acolytes are how the kingdom grows. Every Acolyte forged is $PYRE gone from the world for good, feeding the Bonfire at the center of the kingdom and drawing the fire higher. The more Acolytes the kingdom holds, and the higher they rise, the stronger its flame. To forge one is to give something up so the whole fire is greater.",
        ],
      },
      {
        heading: "The four tiers",
        paragraphs: [
          "An Acolyte's tier is set by its cumulative burn, and it only ever rises. From Ember to Pyre, each tier marks a deeper burn than the last: rarer, more elaborate, and wearing more of the fire. The burn each tier takes and the multiplier it grants are set at the Forge.",
        ],
        bullets: [
          "Ember, the first flame.",
          "Flame, brighter and rarer.",
          "Forge, tempered and stronger.",
          "Pyre, the peak, rarest and most elaborate.",
        ],
      },
      {
        heading: "Regular and LP Acolytes",
        paragraphs: [
          "There are two kinds of Acolyte, one for each burn path. A regular Acolyte is forged by burning $PYRE alone. An LP Acolyte is forged by burning liquidity: pairing your $PYRE with $ETH and committing both to the fire forever.",
          "The LP Acolyte is the rarer of the two, visibly set apart from a regular Acolyte of the same tier, and it earns twice the yield: tier 2x to 6x against the regular 1x to 3x. It is the deeper commitment, since you give $ETH as well and can never take either back.",
        ],
      },
      {
        heading: "LP burn: liquidity that never stops working",
        paragraphs: [
          "This is what makes the LP path more than a bigger multiplier. A plain burn removes $PYRE from the world once, and is done. An LP burn leaves something behind: the $PYRE and $ETH you commit become permanent liquidity, locked into the fire forever, and they never go idle.",
          "That liquidity keeps working for as long as Pyre lives. It draws $ETH from the life of the protocol block after block, deepening the fire's liquidity and feeding the yield that every staker shares, and it can never be pulled back out. A plain burn is a single act; an LP burn is a source of $ETH that keeps generating on its own, forever.",
          "So an LP burner gives the most and is paid twice: a rarer Acolyte with the strongest tier multiplier, and a permanent engine that keeps paying $ETH into the kingdom, one they themselves, as a staker, pull hardest on.",
        ],
      },
      {
        heading: "The Immolated",
        paragraphs: [
          "Beyond the top tier waits one last form: the Immolated, the rarest Acolyte in the kingdom and the highest prestige it offers. It is not a tier you grow into but a mark you choose, taken only after you have reached Pyre. How it is earned, the Ascend rite, is told in the chapter on the Hall of the Immolated.",
        ],
      },
      {
        heading: "Yours to hold, or to trade",
        paragraphs: [
          "An Acolyte is an NFT you fully own, and the Black Market is where Acolytes change hands. Browse the ones others have forged and acquire one, or list your own.",
          "Because an Acolyte carries its cumulative burn and the tier that burn earned, buying one is buying a standing in the kingdom and the yield multiplier that comes with it. It is never only art. It is a position.",
        ],
      },
    ],
  },
  {
    id: "immolated",
    title: "The Hall of the Immolated",
    tagline: "The highest prestige",
    building: "immolated",
    sections: [
      {
        paragraphs: [
          "The Immolated is the deepest commitment Pyre Protocol offers. It is a prestige, not a fifth tier: you do not grow into it, you choose it, and only once you have already reached the top.",
        ],
      },
      {
        heading: "How it is earned",
        paragraphs: [
          "First reach Pyre, the highest Acolyte tier, at the Forge. That makes you eligible. Then, here in the Hall, take the Ascend rite: burn 100,000 $PYRE to join the Immolated. If you walked the LP path, you pair the equivalent $ETH as well, and become LP Immolated. The rite is taken once, and it cannot be undone.",
        ],
      },
      {
        heading: "What it grants",
        paragraphs: [
          "The Immolated carry a permanent +20% to their $ETH yield, a 1.2x multiplier stacked on top of their tier. It lifts your weight, so of everyone staking, the Immolated draw the largest share of the flow.",
          "This is where the ceiling sits. A regular Acolyte tops out at 3x and an LP Acolyte at 6x. The Immolated +20% stacks on top of your tier, so the highest any wallet can reach in Pyre Protocol is 6x plus that 20%: a 7.2x multiplier on staked yield, earned the hard way, by giving the most to the fire.",
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
          "Before launch, the Ashen Cup is the one door already open. Complete quests to earn Points and climb the leaderboard, and invite others to earn for every real arrival.",
          "What Points unlock is revealed closer to launch. The rewards come later, but the order of the board is being written now, and early standing is remembered.",
        ],
      },
    ],
  },
];

/** Chapter for a building, used by the contextual "Read the rite" links. */
export function codexChapterForBuilding(b: BuildingId): CodexChapter | undefined {
  return CODEX.find((c) => c.building === b);
}
