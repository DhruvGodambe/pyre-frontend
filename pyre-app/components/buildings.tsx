/* ============================================================================
   PYRE, Building registry  (the bridge between "one panel set, two shells")
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
  /** GROUND point on the village map (% of the 16:9 stage), where the base of
      the building sits. Arranged on the stone-plaza ring around the central
      Bonfire, the Gate at the front. Buildings are base-anchored and depth-
      sorted by `y` (closer = drawn in front), so they read as a real village. */
  map: { x: number; y: number };
  /** building width as % of the stage width (tunes relative scale on the map) */
  scale: number;
  /** exterior art (transparent PNG) placed on the map + shown at the door.
      null = art not yet delivered → a styled placeholder marker is used. */
  art: string | null;
  /** interior art (full scene shown behind the panel once you step inside). */
  interior?: string;
  /** full exterior SCENE with its own background, shown when you click the
      building (the "at the door" view), before you Enter. Distinct from `art`,
      which is the transparent cut-out marker placed on the shared map. */
  exterior?: string;
  /** small square building icon (shown on the door card + reused in nav). */
  icon?: string;
  /** looping background music for this building's exterior + interior. */
  sound?: string;
  /** give this building's interior a wider overlay on desktop (e.g. the Forge,
      whose Stake + Burn boxes sit side by side). Defaults to the narrow column. */
  wide?: boolean;
}

/* All building art lives in /public/world. Exteriors are transparent PNGs on a
   uniform canvas, so a shared `scale` keeps their relative sizes true to the
   designer's intent (the cathedral reads big, the Gate small). */
export const BUILDINGS: Building[] = [
  /* Layout mirrors the concept proposal (Pyre - World): a ring of eight around
     the central Bonfire. BACK row against the mountain, Forge (NW), Hall of the
     Immolated (N, grand), Observatory (NE). MID row at the fire, Tavern (W),
     Vault (E). FRONT row at the entrance, Black Market (SW), Gate (S),
     Grand Exchange (SE). Plaza centre ≈ (49.5, 54), ring radius ≈ 15%. */
  { id: "immolated", name: "Hall of the Immolated", tagline: "Top-tier rewards pool", description: "For top holders only. Reach the highest Acolyte tier (Pyre) and burn again to join and share extra ETH yield.", Panel: ImmolatedPanel, mobileOrder: 5, kind: "panel", map: { x: 49.7, y: 41.9 }, scale: 20, art: "/world/buildings/immolated.webp", interior: "/world/interiors/immolated.webp", exterior: "/world/exteriors/immolated.webp", icon: "/world/icons/immolated.webp", sound: "/world/audio/immolated.mp3" },
  { id: "forge", name: "The Forge", tagline: "Stake & burn", description: "Where commitment is made. Stake your $PYRE to earn ETH yield and shield it from decay, then burn $PYRE to forge your Pyre Acolyte and multiply that yield up to 3×.", Panel: ForgePanel, mobileOrder: 3, kind: "panel", map: { x: 39.2, y: 46.1 }, scale: 15, art: "/world/buildings/forge.webp", interior: "/world/interiors/forge.webp", exterior: "/world/exteriors/forge.webp", icon: "/world/icons/forge.webp", sound: "/world/audio/forge.mp3", wide: true },
  { id: "observatory", name: "The Observatory", tagline: "Live protocol stats", description: "The watchtower. Live readings of the whole protocol: supply, decay, burns, staking and yield. No wallet needed.", Panel: ObservatoryPanel, mobileOrder: 4, kind: "panel", map: { x: 60.1, y: 46.9 }, scale: 15, art: "/world/buildings/observatory.webp", interior: "/world/interiors/observatory.webp", exterior: "/world/exteriors/observatory.webp", icon: "/world/icons/observatory.webp", sound: "/world/audio/observatory.mp3" },
  { id: "tavern", name: "The Ashen Cup", tagline: "Quests, invites & leaderboard", description: "Complete quests and invite friends to earn Points toward a reward revealed closer to launch, then see where you rank on the leaderboard.", Panel: TavernPanel, mobileOrder: 6, kind: "panel", map: { x: 34.8, y: 58.4 }, scale: 13, art: "/world/buildings/tavern.webp", interior: "/world/interiors/tavern.webp", exterior: "/world/exteriors/tavern.webp", icon: "/world/icons/tavern.webp", sound: "/world/audio/tavern.mp3", wide: true },
  { id: "bonfire", name: "The Bonfire", tagline: "Live burn counter", description: "The center of PYRE. Every $PYRE anyone burns is counted here. Watch the total climb in real time.", Panel: BonfirePanel, mobileOrder: 1, kind: "bonfire", map: { x: 49.6, y: 54.6 }, scale: 13, art: "/world/buildings/bonfire.webp", interior: "/world/interiors/bonfire.webp", icon: "/world/icons/bonfire.webp", sound: "/world/audio/bonfire.mp3" },
  { id: "vault", name: "The Amber Vault", tagline: "Your position & Acolyte", description: "Your personal dashboard: your Acolyte NFT, your balances, your yield, and your rank. Everything about your account in one place.", Panel: AmberVaultPanel, mobileOrder: 2, kind: "panel", map: { x: 63.9, y: 60.4 }, scale: 13, art: "/world/buildings/vault.webp", interior: "/world/interiors/vault.webp", exterior: "/world/exteriors/vault.webp", icon: "/world/icons/vault.webp", sound: "/world/audio/vault.mp3" },
  { id: "market", name: "The Black Market", tagline: "Buy & sell Acolytes", description: "The bazaar of Pyre Acolytes. Browse and acquire the Acolytes other wallets have forged, wrapped in PYRE's own window.", Panel: BlackMarketPanel, mobileOrder: 8, kind: "panel", map: { x: 39.3, y: 67.7 }, scale: 13, art: "/world/buildings/market.webp", interior: "/world/interiors/market.webp", exterior: "/world/exteriors/market.webp", icon: "/world/icons/market.webp", sound: "/world/audio/market.mp3" },
  { id: "exchange", name: "The Grand Exchange", tagline: "Buy & sell $PYRE", description: "The trading floor. Swap ETH and $PYRE with the fees shown to you honestly: sell-side burned, buy-side to the pool.", Panel: GrandExchangePanel, mobileOrder: 7, kind: "panel", map: { x: 58.8, y: 67.6 }, scale: 13, art: "/world/buildings/exchange.webp", interior: "/world/interiors/exchange.webp", exterior: "/world/exteriors/exchange.webp", icon: "/world/icons/exchange.webp", sound: "/world/audio/exchange.mp3" },
  { id: "gate", name: "The Gate", tagline: "Connect wallet", description: "The entrance. Connect your wallet, or continue as a guest, to step inside.", Panel: GatePanel, mobileOrder: null, kind: "gate", map: { x: 49.2, y: 73.1 }, scale: 13, art: "/world/buildings/gate.webp", interior: "/world/interiors/gate.webp", icon: "/world/icons/gate.webp" },
];

export const BUILDING_BY_ID = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
) as Record<BuildingId, Building>;
