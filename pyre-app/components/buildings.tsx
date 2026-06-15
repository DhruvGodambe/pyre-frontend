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
  /** approx position on the village map (% of width/height) — designer refines */
  map: { x: number; y: number };
}

export const BUILDINGS: Building[] = [
  { id: "bonfire", name: "The Bonfire", tagline: "Live burn counter", description: "The heart of the village. Every $PYRE fed to the fire feeds this flame. Watch the global burn counter climb in real time.", Panel: BonfirePanel, mobileOrder: 1, kind: "bonfire", map: { x: 50, y: 52 } },
  { id: "vault", name: "The Amber Vault", tagline: "Your position & Fire Spirit", description: "Your personal hold. Your Fire Spirit, your balances, your standing in the fire. Everything about you in one place.", Panel: AmberVaultPanel, mobileOrder: 2, kind: "panel", map: { x: 24, y: 40 } },
  { id: "forge", name: "The Forge", tagline: "Stake & burn", description: "Where commitment is made. Stake to shield your $PYRE from decay, or burn it permanently to forge and grow your Fire Spirit.", Panel: ForgePanel, mobileOrder: 3, kind: "panel", map: { x: 70, y: 38 } },
  { id: "observatory", name: "The Observatory", tagline: "Live protocol stats", description: "The watchtower. Live readings of the whole protocol: supply, decay, burns, staking and yield. No wallet needed.", Panel: ObservatoryPanel, mobileOrder: 4, kind: "panel", map: { x: 82, y: 22 } },
  { id: "immolated", name: "Hall of the Immolated", tagline: "The inner order", description: "The inner sanctum. Only those who have reached the Pyre and burned again may pass its doors and share its yield.", Panel: ImmolatedPanel, mobileOrder: 5, kind: "panel", map: { x: 38, y: 22 } },
  { id: "tavern", name: "The Tavern", tagline: "Quests & leaderboard", description: "The gathering place. Take up the rites, bring friends to the fire, and earn Embers toward a reward revealed closer to launch. Then see where you stand on the leaderboard.", Panel: TavernPanel, mobileOrder: 6, kind: "panel", map: { x: 18, y: 66 } },
  { id: "exchange", name: "The Grand Exchange", tagline: "Buy & sell $PYRE", description: "The trading floor. Swap ETH and $PYRE with the fees shown to you honestly: sell-side burned, buy-side to the pool.", Panel: GrandExchangePanel, mobileOrder: 7, kind: "panel", map: { x: 64, y: 66 } },
  { id: "market", name: "The Black Market", tagline: "Buy & sell Fire Spirits", description: "The bazaar of Fire Spirits. Browse and acquire the spirits other wallets have forged, wrapped in PYRE's own window.", Panel: BlackMarketPanel, mobileOrder: 8, kind: "panel", map: { x: 84, y: 58 } },
  { id: "gate", name: "The Gate", tagline: "Connect wallet", description: "The threshold of the village. Light the lantern to wake the fires and step inside.", Panel: GatePanel, mobileOrder: null, kind: "gate", map: { x: 50, y: 88 } },
];

export const BUILDING_BY_ID = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b])
) as Record<BuildingId, Building>;
