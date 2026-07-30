/* ============================================================================
   Acolyte NFT metadata (OpenSea-compatible JSON for Pinata / IPFS)
   ----------------------------------------------------------------------------
   Per-stage image CIDs are filled after Pinata upload
   (see lib/pinata.ts + POST /api/nft/metadata).
   ========================================================================== */

import { STAGES, type Stage, acolyteName } from "@/lib/constants";

export type NftAttribute = {
  trait_type: string;
  value: string | number;
  display_type?: "number" | "boost_percentage" | "boost_number";
};

export type AcolyteMetadata = {
  name: string;
  description: string;
  image: string;
  external_url: string;
  background_color: string;
  attributes: NftAttribute[];
};

/** On-chain Stage enum index (EMBER=0 … PYRE=3) ↔ UI Stage (1…4). */
export function onChainStageIndex(stage: Stage): number {
  return stage - 1;
}

export function stageFromOnChainIndex(index: number): Stage {
  if (index < 0 || index > 3) throw new Error(`Invalid on-chain stage index: ${index}`);
  return (index + 1) as Stage;
}

export const ON_CHAIN_STAGE_INDICES = [0, 1, 2, 3] as const;
export type OnChainStageIndex = (typeof ON_CHAIN_STAGE_INDICES)[number];

const STAGE_FLAVOR: Record<
  Stage,
  { blurb: string; background: string; burnThreshold: string; fileStem: string }
> = {
  1: {
    blurb:
      "The first mark of the fire. Forged when cumulative burns reach the Ember threshold — proof you gave something to the flame.",
    background: "1a0f0a",
    burnThreshold: "10,000 PYRE",
    fileStem: "ember",
  },
  2: {
    blurb:
      "Brighter and rarer. The Flame Acolyte carries deeper commitment — yield rises as the fire claims more.",
    background: "2a1208",
    burnThreshold: "75,000 PYRE",
    fileStem: "flame",
  },
  3: {
    blurb:
      "Tempered in the forge. Twice the yield weight of Ember, earned only by those who keep feeding the fire.",
    background: "1f0c06",
    burnThreshold: "150,000 PYRE",
    fileStem: "forge",
  },
  4: {
    blurb:
      "The peak form. A Pyre Acolyte is permanent on-chain proof of what you were willing to give up — and who you are here.",
    background: "140805",
    burnThreshold: "300,000 PYRE",
    fileStem: "pyre",
  },
};

export function stageFileStem(stage: Stage): string {
  return STAGE_FLAVOR[stage].fileStem;
}

/** Build OpenSea-style metadata for a given Acolyte stage. Pass that stage's
    pinned image URI (`ipfs://…`); until then a placeholder is fine. */
export function buildStageMetadata(
  stage: Stage,
  imageUri = "ipfs://PENDING_ACOLYTE_ART"
): AcolyteMetadata {
  const flavor = STAGE_FLAVOR[stage];
  const tier = STAGES[stage];

  return {
    name: acolyteName(stage),
    description: [
      flavor.blurb,
      "",
      "Pyre Acolytes are soulbound progression NFTs earned by burning $PYRE.",
      "Tier rises with cumulative burn and never falls. LP burners and Immolated",
      "members carry additional yield marks on top of their stage.",
    ].join("\n"),
    image: imageUri,
    external_url: "https://pyreprotocol.com",
    background_color: flavor.background,
    attributes: [
      { trait_type: "Stage", value: tier.name },
      { trait_type: "Stage Rank", value: stage, display_type: "number" },
      { trait_type: "Yield Multiplier", value: `${tier.multiplier}x` },
      { trait_type: "Burn Threshold", value: flavor.burnThreshold },
      { trait_type: "Collection", value: "Pyre Acolyte" },
    ],
  };
}

/** All four stage templates. Pass one shared URI, or a per-stage map. */
export function initialStageMetadata(
  images?: string | Partial<Record<Stage, string>>
): Record<Stage, AcolyteMetadata> {
  const uriFor = (stage: Stage) => {
    if (!images) return "ipfs://PENDING_ACOLYTE_ART";
    if (typeof images === "string") return images;
    return images[stage] ?? "ipfs://PENDING_ACOLYTE_ART";
  };
  return {
    1: buildStageMetadata(1, uriFor(1)),
    2: buildStageMetadata(2, uriFor(2)),
    3: buildStageMetadata(3, uriFor(3)),
    4: buildStageMetadata(4, uriFor(4)),
  };
}

export const STAGE_KEYS: Stage[] = [1, 2, 3, 4];
