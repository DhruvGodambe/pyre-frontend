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
  // Status / utility.
  fireToken: "/world/ui/icons/fire_token.png",
  wallet: "/world/ui/icons/wallet.png",
  guest: "/world/ui/icons/guest.png",
  lock: "/world/ui/icons/lock.png",
  quest: "/world/ui/icons/quest.png",
  reward: "/world/ui/icons/reward.png",
  time: "/world/ui/icons/time.png",
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
