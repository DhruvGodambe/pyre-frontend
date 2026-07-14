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
import { useWallet } from "@/lib/wallet";
import { useStakingPosition, useAcolyte } from "@/lib/hooks";

export interface LockState {
  locked: boolean;
  /** short status, e.g. "Opens at launch" / "Locked". */
  label: string;
  /** one line under the lock explaining how to open it. */
  hint: string;
  /** how to open it: either walk to a building that IS open (`to`), or prompt the
      wallet connect (`connect`). One or the other. */
  cta?: { label: string; to?: BuildingId; connect?: boolean };
}

const OPEN: LockState = { locked: false, label: "", hint: "" };

interface Progress {
  hasPyre: boolean; // bought / holds any $PYRE
  hasPosition: boolean; // staked or burned (has a stake)
  topTier: boolean; // reached the Pyre tier
}

/* For a visitor with no connected wallet, every wallet-gated building's real
   first step is the same: connect. The line just names what opens once they do. */
const CONNECT_HINT: Partial<Record<BuildingId, string>> = {
  forge: "Connect your wallet to stake and burn $PYRE here.",
  vault: "Connect your wallet to see your position and Acolyte.",
  market: "Connect your wallet to trade Acolytes here.",
  immolated: "Connect your wallet to ascend to the Immolated.",
};

export function computeLock(
  id: BuildingId,
  ctx: { launched: boolean; tourActive: boolean; connected: boolean; progress: Progress }
): LockState {
  // The tour is a full demo: nothing is locked while it runs.
  if (ctx.tourActive) return OPEN;
  // The Gate is the entry, never a "locked building". The Ashen Cup is always the
  // live door (quests + progress), before and after launch.
  if (id === "gate" || id === "tavern") return OPEN;

  // PRE-LAUNCH: the fire isn't lit. Every building is closed; the only thing to
  // do is the Ashen Cup. (The tour still demos everything with mock data.)
  if (!ctx.launched) {
    // The Forge is the heart of the funnel, so even pre-launch we tease the real
    // flow (buy at the Grand Exchange, then stake/burn here) instead of a bare
    // "opens at launch". Other buildings stay plain.
    const hint =
      id === "forge"
        ? "At launch: buy $PYRE at the Grand Exchange, then stake and burn it here to forge your Acolyte."
        : "";
    return {
      locked: true,
      label: "Opens at launch",
      hint,
      cta: { to: "tavern", label: "Earn Points at the Ashen Cup" },
    };
  }

  // AT LAUNCH: the unlock funnel.
  // The Exchange, Observatory and Bonfire are open to everyone, guests included,
  // (they're read-only / handle their own connect prompt for any on-chain action).
  if (id === "exchange" || id === "observatory" || id === "bonfire") return OPEN;

  // The Forge, Vault, Black Market and Hall all read your ON-CHAIN position, so a
  // wallet has to be connected before we can know your state. For a guest (or
  // before any identity is chosen) we genuinely can't see what you hold, so the
  // honest first step is "connect", NOT "buy $PYRE" / "take a position" (which
  // would assume holdings we can't read, and aren't reachable without a wallet).
  if (!ctx.connected) {
    return {
      locked: true,
      label: "Connect your wallet",
      hint: CONNECT_HINT[id] ?? "Connect your wallet to open this.",
      cta: { connect: true, label: "Connect your wallet" },
    };
  }

  // Connected: the real progress gate.
  switch (id) {
    case "forge":
      return ctx.progress.hasPyre
        ? OPEN
        : {
            locked: true,
            label: "Needs $PYRE",
            hint: "Buy $PYRE at the Grand Exchange first, then come here to stake and burn it.",
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
  const { status, address } = useWallet();
  const staking = useStakingPosition();
  const acolyte = useAcolyte();

  // A guest has no address, so the balance hooks are disabled and we can't read
  // holdings: gate on connection first (see computeLock), don't infer "no $PYRE".
  const connected = status === "connected" && !!address;
  const hasPyre =
    (staking.data?.liquidBalance ?? 0n) > 0n || (staking.data?.stakedBalance ?? 0n) > 0n;
  const hasPosition =
    (staking.data?.stakedBalance ?? 0n) > 0n || (acolyte.data?.cumulativeBurnWeight ?? 0n) > 0n;
  const topTier = (acolyte.data?.stage ?? 0) >= 4;

  return useCallback(
    (id: BuildingId): LockState =>
      computeLock(id, {
        launched,
        tourActive: tour.active,
        connected,
        progress: { hasPyre, hasPosition, topTier },
      }),
    [launched, tour.active, connected, hasPyre, hasPosition, topTier]
  );
}
