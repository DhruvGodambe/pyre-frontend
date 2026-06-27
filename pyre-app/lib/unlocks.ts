"use client";

/* BUILDING UNLOCKS, the gate on every building.

   Two regimes, plus one exception:
   - THE TOUR is always a full demo: while it runs, nothing is locked, so the
     Emberkeeper can walk people through every building with mock data.
   - PRE-LAUNCH: the fire isn't lit. Every building is closed; the only live door
     is the Ashen Cup (quests + your progress).
   - AT LAUNCH: a progression that drives the funnel. Trading and the read-only
     views open first; buying $PYRE unlocks the Forge; taking a position unlocks
     your data (Vault, Black Market); reaching the top tier unlocks the Hall.

   Computed from the SAME data the panels use, so it's mock today and real on
   chain at launch with no code change (lib/config.ts USE_MOCK switch). */

import { useCallback } from "react";
import type { BuildingId } from "@/components/buildings";
import { usePreview } from "@/lib/preview";
import { useTour } from "@/lib/tour";
import { useStakingPosition, useAcolyte } from "@/lib/hooks";

export interface LockState {
  locked: boolean;
  /** short status, e.g. "Opens at launch" / "Locked". */
  label: string;
  /** one line under the lock explaining how to open it. */
  hint: string;
  /** where to go to unlock it (a building that IS open). */
  cta?: { to: BuildingId; label: string };
}

const OPEN: LockState = { locked: false, label: "", hint: "" };

interface Progress {
  hasPyre: boolean; // bought / holds any $PYRE
  hasPosition: boolean; // staked or burned (has a stake)
  topTier: boolean; // reached the Pyre tier
}

export function computeLock(
  id: BuildingId,
  ctx: { launched: boolean; tourActive: boolean; progress: Progress }
): LockState {
  // The tour is a full demo: nothing is locked while it runs.
  if (ctx.tourActive) return OPEN;
  // The Gate is the entry, never a "locked building". The Ashen Cup is always the
  // live door (quests + progress), before and after launch.
  if (id === "gate" || id === "tavern") return OPEN;

  // PRE-LAUNCH: the fire isn't lit. Every building is closed; the only thing to
  // do is the Ashen Cup. (The tour still demos everything with mock data.)
  if (!ctx.launched) {
    return {
      locked: true,
      label: "Opens at launch",
      hint: "The fire isn't lit yet. This building opens at launch.",
      cta: { to: "tavern", label: "Earn your place in the Ashen Cup" },
    };
  }

  // AT LAUNCH: the unlock funnel.
  switch (id) {
    case "exchange":
    case "observatory":
    case "bonfire":
      return OPEN;
    case "forge":
      return ctx.progress.hasPyre
        ? OPEN
        : {
            locked: true,
            label: "Locked",
            hint: "Buy $PYRE first, then stake and burn it here.",
            cta: { to: "exchange", label: "Buy $PYRE at the Grand Exchange" },
          };
    case "vault":
    case "market":
      return ctx.progress.hasPosition
        ? OPEN
        : {
            locked: true,
            label: "Locked",
            hint: "Stake or burn $PYRE at the Forge to begin your position.",
            cta: { to: "forge", label: "Open the Forge" },
          };
    case "immolated":
      return ctx.progress.topTier
        ? OPEN
        : {
            locked: true,
            label: "Locked",
            hint: "Burn past the Pyre tier at the Forge to ascend to the Immolated.",
            cta: { to: "forge", label: "Climb tiers at the Forge" },
          };
    default:
      return OPEN;
  }
}

/** A stable `lockOf(id)` for the current visitor (launch phase + progress). */
export function useLocks() {
  const { launched } = usePreview();
  const tour = useTour();
  const staking = useStakingPosition();
  const acolyte = useAcolyte();

  const hasPyre =
    (staking.data?.liquidBalance ?? 0n) > 0n || (staking.data?.stakedBalance ?? 0n) > 0n;
  const hasPosition =
    (staking.data?.stakedBalance ?? 0n) > 0n || (acolyte.data?.cumulativeBurnWeight ?? 0n) > 0n;
  const topTier = (acolyte.data?.stage ?? 0) >= 4;

  return useCallback(
    (id: BuildingId): LockState =>
      computeLock(id, { launched, tourActive: tour.active, progress: { hasPyre, hasPosition, topTier } }),
    [launched, tour.active, hasPyre, hasPosition, topTier]
  );
}
