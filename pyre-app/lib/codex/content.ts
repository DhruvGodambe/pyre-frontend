/* THE EMBER CODEX, the in-world documentation.

   Content lives here as plain structured data so it's easy to edit without
   touching the reader UI (components/codex.tsx). Each chapter maps to a building
   where it makes sense (so "Read the rite" inside a building opens its chapter),
   plus a few global chapters (overview, tokenomics, the tax, security, FAQ).

   Voice: the Emberkeeper. Plain, warm, no hype, no em-dashes. Numbers here are the
   designed mechanics; the final on-chain values are confirmed at launch. */

import type { BuildingId } from "@/components/buildings";

export interface CodexSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface CodexChapter {
  id: string;
  title: string;
  tagline: string;
  /** the building this chapter documents, if any (used by "Read the rite"). */
  building?: BuildingId;
  sections: CodexSection[];
}

export const CODEX: CodexChapter[] = [
  {
    id: "what-is-pyre",
    title: "What is PYRE",
    tagline: "The flame, the decay, the yield",
    sections: [
      {
        paragraphs: [
          "PYRE is a token built around one act: the burn. Tokens that sit idle slowly decay, returning to the fire. Tokens you commit to the flame work for you, earning real ETH yield and forging an Acolyte that grows stronger the more you give.",
          "The village you are standing in is the protocol made visible. Every building is one part of the system. Walk it, and you understand it.",
        ],
      },
      {
        heading: "The two acts",
        bullets: [
          "Stake: lock your $PYRE to earn ETH yield and stop it from decaying.",
          "Burn: send $PYRE into the fire to forge and level your Acolyte, which multiplies your yield.",
        ],
      },
      {
        paragraphs: [
          "Staking earns. Burning multiplies. Neither alone is the whole story, together they are the loop the entire village runs on.",
        ],
      },
    ],
  },
  {
    id: "bonfire",
    title: "The Bonfire",
    tagline: "The living count of all that's burned",
    building: "bonfire",
    sections: [
      {
        paragraphs: [
          "At the heart of the village burns the Bonfire. It is the running total of every $PYRE ever sent to the fire, by everyone, updating live.",
          "Two things feed it. The burns people choose, forging their Acolytes. And decay: $PYRE left idle, unstaked, slowly returns to the flame on its own.",
        ],
      },
      {
        heading: "Decay",
        paragraphs: [
          "Idle $PYRE is not safe $PYRE. Holding without staking means a small, steady share burns away over time. The cure is simple: stake at the Forge, and decay stops.",
        ],
      },
    ],
  },
  {
    id: "forge",
    title: "The Forge",
    tagline: "Stake to earn, burn to ascend",
    building: "forge",
    sections: [
      {
        heading: "Staking",
        paragraphs: [
          "Stake your $PYRE at the Forge and two things happen at once: your tokens stop decaying, and they begin earning you a share of the protocol's ETH yield.",
        ],
      },
      {
        heading: "Burning, and your Acolyte",
        paragraphs: [
          "Burn $PYRE and you forge an Acolyte, a living NFT that is the mark of what you have given. The more you burn, the higher its tier, and the more your ETH yield is multiplied.",
        ],
        bullets: [
          "Ember Acolyte, 10,000 burned, 1x yield",
          "Flame Acolyte, 75,000 burned, 1.5x yield",
          "Forge Acolyte, 150,000 burned, 2x yield",
          "Pyre Acolyte, 300,000 burned, 3x yield",
        ],
      },
      {
        paragraphs: [
          "Burning alone earns nothing. The Acolyte multiplies the yield you earn from staking, so the two acts are meant to be done together: stake to earn, burn to multiply.",
          "A fifth mark, the Immolated Acolyte, waits beyond the top tier. The Hall above will tell you how to claim it.",
        ],
      },
    ],
  },
  {
    id: "vault",
    title: "The Amber Vault",
    tagline: "Everything that is yours",
    building: "vault",
    sections: [
      {
        paragraphs: [
          "The Vault is your own ledger: your Acolyte and its tier, your balances, your staked $PYRE, and the ETH yield waiting to be claimed.",
          "It is the quiet center of your game, with quick paths back to the Forge to stake or burn more.",
        ],
      },
    ],
  },
  {
    id: "observatory",
    title: "The Observatory",
    tagline: "The whole protocol, at a glance",
    building: "observatory",
    sections: [
      {
        paragraphs: [
          "From the Observatory you read the state of the entire protocol: total supply, the rate of decay, total burned, and the ETH yield flowing to stakers.",
          "No wallet is needed to look. It is the honest window on the system, open to anyone deciding whether to step in.",
        ],
      },
    ],
  },
  {
    id: "exchange",
    title: "The Grand Exchange",
    tagline: "Trade $PYRE and ETH",
    building: "exchange",
    sections: [
      {
        paragraphs: [
          "The Grand Exchange is where $PYRE and ETH are swapped, built directly on Uniswap v4. Every fee is shown before you confirm, nothing is hidden in the trade.",
        ],
      },
      {
        heading: "See also",
        paragraphs: ["The sell tax that protects the launch is its own chapter: The Tax."],
      },
    ],
  },
  {
    id: "market",
    title: "The Black Market",
    tagline: "Buy and sell Acolytes",
    building: "market",
    sections: [
      {
        paragraphs: [
          "Acolytes are NFTs, and the Black Market is where they change hands. Browse the Acolytes others have forged and buy one, or list your own.",
          "An Acolyte carries the burn weight that made it, so it is more than art: it is a position in the village.",
        ],
      },
    ],
  },
  {
    id: "immolated",
    title: "The Hall of the Immolated",
    tagline: "The inner order",
    building: "immolated",
    sections: [
      {
        paragraphs: [
          "The Hall is for those who give the most. Reach the top Acolyte tier, the Pyre, then burn 10,000 $PYRE more into the Hall, and you join the Immolated.",
        ],
      },
      {
        heading: "The reward",
        paragraphs: [
          "The Immolated share a dedicated 25% pool of the protocol's ETH yield, split by burn weight. The more you have given to the Hall, the larger your share. It is the deepest commitment in the village, and it pays the most.",
        ],
      },
    ],
  },
  {
    id: "ashen-cup",
    title: "The Ashen Cup",
    tagline: "Earn your place before launch",
    building: "tavern",
    sections: [
      {
        paragraphs: [
          "Before the gates open, the Ashen Cup is the one door already ajar. Complete quests to earn Points, climb the leaderboard, and lock in your standing early.",
          "Invite others and you earn for every real arrival. What Points unlock is revealed closer to launch, but the order of the board is being written now.",
        ],
      },
    ],
  },
  {
    id: "tokenomics",
    title: "Tokenomics",
    tagline: "Supply, decay, and yield",
    sections: [
      {
        heading: "The flow",
        bullets: [
          "Supply shrinks over time: decay and burns both remove $PYRE permanently.",
          "Stakers earn ETH yield; Acolytes multiply that yield up to 3x.",
          "The Immolated draw from a separate 25% ETH pool.",
        ],
      },
      {
        paragraphs: [
          "PYRE is designed to reward conviction. The longer and harder you commit, the more the system bends toward you, while idle supply quietly leaves the board.",
        ],
      },
    ],
  },
  {
    id: "the-tax",
    title: "The Tax",
    tagline: "Launch protection that fades",
    sections: [
      {
        paragraphs: [
          "At launch a sell tax guards the fire from the first wave of mercenaries. It starts high and decays on its own: 23% at the very start, falling in a straight line to 5% over the first two hours, where it settles.",
          "The intent is plain: punish the instant flip, protect everyone who is actually here to stay. Wait out the curve and you trade at the resting rate.",
        ],
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    tagline: "Contracts and audits",
    sections: [
      {
        paragraphs: [
          "PYRE is built on audited, battle-tested foundations and its own contracts are written to be read. Contract addresses, audit reports, and verification links are published here as they are finalized.",
        ],
      },
      {
        heading: "Verify, don't trust",
        paragraphs: [
          "Every number in this Codex can be checked on-chain. When in doubt, read the contract.",
        ],
      },
    ],
  },
  {
    id: "faq",
    title: "Questions",
    tagline: "The things people ask first",
    sections: [
      {
        heading: "Do I have to burn?",
        paragraphs: [
          "No. You can stake and earn ETH yield without ever burning. Burning is how you multiply that yield by forging an Acolyte. Many do both.",
        ],
      },
      {
        heading: "What happens if I just hold?",
        paragraphs: [
          "Idle $PYRE decays slowly into the Bonfire. Staking stops it. Holding without staking is the one position the system works against.",
        ],
      },
      {
        heading: "Is my Acolyte permanent?",
        paragraphs: [
          "Yes. It is an NFT you own, carrying the burn weight that forged it. You can hold it, or sell it at the Black Market.",
        ],
      },
    ],
  },
];

/** Chapter for a building, used by the contextual "Read the rite" links. */
export function codexChapterForBuilding(b: BuildingId): CodexChapter | undefined {
  return CODEX.find((c) => c.building === b);
}
