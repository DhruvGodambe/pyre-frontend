"use client";

/* GAME ICON, the designer's ornate UI medallions (UI_Elements).

   One registry so every icon is referenced by name, not a stray path, and swaps
   in one place when the designer reships. The art isn't square, so we render it
   inside a square box with object-contain (centered, never distorted). `size` is
   the box edge in px. Decorative by default (alt=""); pass `alt` when the icon
   carries meaning on its own. */

import Image from "next/image";
import { asset } from "@/lib/config";
import type { Stage } from "@/lib/constants";

const ICONS = {
  // Acolyte tier crests (burn-NFT tiers), see lib/constants.ts STAGES.
  ember: "/world/ui/icons/ember.png",
  flame: "/world/ui/icons/flame.png",
  forge: "/world/ui/icons/forge.png",
  pyre: "/world/ui/icons/pyre.png",
  immolated: "/world/ui/icons/immolated.png",
  // Leaderboard rank badges.
  gold: "/world/ui/icons/gold.png",
  silver: "/world/ui/icons/silver.png",
  bronze: "/world/ui/icons/bronze.png",
  first: "/world/ui/icons/first.png",
  legend: "/world/ui/icons/legend.png",
  leaderboard: "/world/ui/icons/leaderboard.png",
  // Numbered leaderboard position tiles (1-5), each with a lit "active" variant
  // used to mark the viewer's own row. See rankTile() below.
  rank1: "/world/ui/icons/rank1_normal.png",
  rank2: "/world/ui/icons/rank2_normal.png",
  rank3: "/world/ui/icons/rank3_normal.png",
  rank4: "/world/ui/icons/rank4_normal.png",
  rank5: "/world/ui/icons/rank5_normal.png",
  rank1On: "/world/ui/icons/rank1_active.png",
  rank2On: "/world/ui/icons/rank2_active.png",
  rank3On: "/world/ui/icons/rank3_active.png",
  rank4On: "/world/ui/icons/rank4_active.png",
  rank5On: "/world/ui/icons/rank5_active.png",
  // THE EMBER CRYSTAL: the symbol of Embers (the pre-launch points), everywhere
  // they are counted. Distinct from fireToken on purpose: that flame medallion is
  // the $PYRE token (the Forge's amounts, the Staked row), and pointing the same
  // emblem at two different things taught nobody what either one was.
  emberCrystal: "/world/ui/icons/ember_crystal.png",
  // THE TOME: the Codex's own symbol. Not a new drawing: it is the book glyph cut
  // straight out of the designer's baked Codex plate (/buttons/codex_normal.png),
  // so the gate's "Read the Codex" plate and the in-app Codex button carry the
  // exact same book.
  codex: "/world/ui/icons/codex.png",
  // Status / utility.
  fireToken: "/world/ui/icons/fire_token.png",
  wallet: "/world/ui/icons/wallet.png",
  guest: "/world/ui/icons/guest.png",
  lock: "/world/ui/icons/lock.png",
  quest: "/world/ui/icons/quest.png",
  reward: "/world/ui/icons/reward.png",
  time: "/world/ui/icons/time.png",
  check: "/world/ui/icons/check.webp",
} as const;

export type GameIconName = keyof typeof ICONS;

/** Acolyte tier → crest. Immolated Acolytes show the Hall sigil. */
const STAGE_CREST: Record<Stage, GameIconName> = {
  1: "ember",
  2: "flame",
  3: "forge",
  4: "pyre",
};
export function tierCrest(stage: Stage, isImmolated = false): GameIconName {
  // Fallback to the first crest if a stage outside 1-4 ever reaches here (e.g. an
  // unforged 0), so we never resolve an undefined icon path.
  return isImmolated ? "immolated" : STAGE_CREST[stage] ?? "ember";
}

/** Leaderboard position → numbered tile, lit when it's the viewer's own row.
    Only ranks 1-5 have art; beyond that, callers fall back to a plain "#N". */
export function rankTile(rank: number, active = false): GameIconName | null {
  if (rank < 1 || rank > 5) return null;
  return `rank${rank}${active ? "On" : ""}` as GameIconName;
}

export function GameIcon({
  name,
  size = 24,
  alt = "",
  className = "",
}: {
  name: GameIconName;
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={asset(ICONS[name])}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block object-contain align-middle select-none ${className}`}
      draggable={false}
    />
  );
}
