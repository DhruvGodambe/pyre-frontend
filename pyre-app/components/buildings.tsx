/* ============================================================================
   PYRE — Building registry  (the bridge between "one panel set, two shells")
   ----------------------------------------------------------------------------
   Each entry is BOTH a Village building and a mobile-Dashboard zone. Defined
   once here; the MobileShell stacks them, the VillageShell places them behind
   buildings. Add/rename/reorder a feature in ONE place and both shells follow.

   Names + taglines match designer-briefing/content/04-village-world.md.
   Mobile stacking order matches 05-ui-screens.md → "Mobile Dashboard".
   ========================================================================== */

import type { FC } from "react";
import { ObservatoryPanel } from "./panels/observatory";
import { AmberVaultPanel } from "./panels/amber-vault";
import { ForgePanel } from "./panels/forge";
import { ImmolatedPanel } from "./panels/immolated";
import { GrandExchangePanel } from "./panels/grand-exchange";
import { TavernPanel } from "./panels/tavern";
import { BonfirePanel } from "./panels/bonfire";
import { BlackMarketPanel } from "./panels/black-market";
import { GatePanel } from "./panels/gate";

export type BuildingId =
  | "bonfire"
  | "vault"
  | "forge"
  | "observatory"
  | "immolated"
  | "tavern"
  | "exchange"
  | "market"
  | "gate";

export interface Building {
  id: BuildingId;
  name: string; // nameplate name
  tagline: string; // nameplate tagline
  description: string; // shown on the "at the door" preview before entering
  Panel: FC;
  /** mobile dashboard order (lower = higher on the page); null = not stacked */
  mobileOrder: number | null;
  /** layout role: most are panels; bonfire is a header; gate is the entry */
  kind: "panel" | "bonfire" | "gate";
  /** GROUND point on the village map (% of the 16:9 stage) — where the base of
      the building sits. Arranged on the stone-plaza ring around the central
      Bonfire, the Gate at the front. Buildings are base-anchored and depth-
      sorted by `y` (closer = drawn in front), so they read as a real village. */
  map: { x: number; y: number };
  /** building width as % of the stage width (tunes relative scale on the map) */
  scale: number;
  /** exterior art (transparent PNG) placed on the map + shown at the door.
      null = art not yet delivered → a styled placeholder marker is used. */
  art: string | null;
  /** interior art (framed behind the panel when you step inside). */
  interior?: string;
}

/* All building art lives in /public/world. Exteriors are transparent PNGs on a
   uniform canvas, so a shared `scale` keeps their relative sizes true to the
   designer's intent (the cathedral reads big, the Gate small). Observatory has
   only an interior so far — its exterior falls back to a placeholder marker. */
export const BUILDINGS: Building[] = [
  /* Layout mirrors the concept proposal (Pyre - World): a ring of eight around
     the central Bonfire. BACK row against the mountain — Forge (NW), Hall of the
     Immolated (N, grand), Observatory (NE). MID row at the fire — Tavern (W),
     Vault (E). FRONT row at the entrance — Black Market (SW), Gate (S),
     Grand Exchange (SE). Plaza centre ≈ (49.5, 54), ring radius ≈ 15%. */
  { id: "immolated", name: "Hall of the Immolated", tagline: "The inner order", description: "The inner sanctum. Only those who have reached the Pyre and burned again may pass its doors and share its yield.", Panel: ImmolatedPanel, mobileOrder: 5, kind: "panel", map: { x: 49.7, y: 41.9 }, scale: 20, art: "/world/buildings/immolated.webp" },
  { id: "forge", name: "The Forge", tagline: "Stake & burn", description: "Where commitment is made. Stake your $PYRE to earn ETH yield and shield it from decay, then burn $PYRE to forge your Pyre Acolyte and multiply that yield up to 3×.", Panel: ForgePanel, mobileOrder: 3, kind: "panel", map: { x: 39.2, y: 46.1 }, scale: 15, art: "/world/buildings/forge.webp" },
  { id: "observatory", name: "The Observatory", tagline: "Live protocol stats", description: "The watchtower. Live readings of the whole protocol: supply, decay, burns, staking and yield. No wallet needed.", Panel: ObservatoryPanel, mobileOrder: 4, kind: "panel", map: { x: 59, y: 45 }, scale: 10, art: null, interior: "/world/interiors/observatory.webp" },
  // Tavern art pulled: the delivered Tavern.png is a duplicate of Vault.png.
  // Shows as a labelled placeholder until the designer confirms the real art.
  { id: "tavern", name: "The Tavern", tagline: "Quests & leaderboard", description: "The gathering place. Take up the rites, bring friends to the fire, and earn Embers toward a reward revealed closer to launch. Then see where you stand on the leaderboard.", Panel: TavernPanel, mobileOrder: 6, kind: "panel", map: { x: 33, y: 55 }, scale: 9, art: null },
  { id: "bonfire", name: "The Bonfire", tagline: "Live burn counter", description: "The heart of the village. Every $PYRE fed to the fire feeds this flame. Watch the global burn counter climb in real time.", Panel: BonfirePanel, mobileOrder: 1, kind: "bonfire", map: { x: 49.6, y: 54.6 }, scale: 13, art: "/world/buildings/bonfire.webp" },
  // Vault art pulled: Vault.png and Tavern.png are the same building. Shows as a
  // labelled placeholder until the designer confirms which art belongs here.
  { id: "vault", name: "The Amber Vault", tagline: "Your position & Acolyte", description: "Your personal hold. Your Pyre Acolyte, your balances, your yield, your standing in the fire. Everything about you in one place.", Panel: AmberVaultPanel, mobileOrder: 2, kind: "panel", map: { x: 63, y: 55 }, scale: 9, art: null },
  { id: "market", name: "The Black Market", tagline: "Buy & sell Acolytes", description: "The bazaar of Pyre Acolytes. Browse and acquire the Acolytes other wallets have forged, wrapped in PYRE's own window.", Panel: BlackMarketPanel, mobileOrder: 8, kind: "panel", map: { x: 39.7, y: 68.4 }, scale: 15, art: "/world/buildings/market.webp" },
  { id: "exchange", name: "The Grand Exchange", tagline: "Buy & sell $PYRE", description: "The trading floor. Swap ETH and $PYRE with the fees shown to you honestly: sell-side burned, buy-side to the pool.", Panel: GrandExchangePanel, mobileOrder: 7, kind: "panel", map: { x: 58.3, y: 67.9 }, scale: 15, art: "/world/buildings/exchange.webp" },
  { id: "gate", name: "The Gate", tagline: "Connect wallet", description: "The threshold of the village. Light the lantern to wake the fires and step inside.", Panel: GatePanel, mobileOrder: null, kind: "gate", map: { x: 49.3, y: 71.3 }, scale: 10, art: "/world/buildings/gate.webp" },
];

export const BUILDING_BY_ID = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
) as Record<BuildingId, Building>;
