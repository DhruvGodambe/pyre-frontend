"use client";

/* BUILDING PANEL, the interior content for a building.

   Locking now lives at the building's DOOR (see lib/unlocks.ts + the shells'
   LockedExterior): you only ever reach a panel for a building that's open, so
   this no longer "seals" anything. Its one job: during the TOUR, render the real
   panel populated with mock data (a sample wallet) even for guests, so the
   Emberkeeper's walkthrough shows every building working. Outside the tour the
   panel renders normally against the live wallet. Both shells render through this,
   so it stays the single place that decision lives. */

import { useTour } from "@/lib/tour";
import { PreviewWalletProvider } from "@/lib/wallet";
import { BUILDING_BY_ID, type BuildingId } from "@/components/buildings";
import { ErrorBoundary } from "./error-boundary";

export function BuildingPanel({ id }: { id: BuildingId }) {
  const tour = useTour();
  const b = BUILDING_BY_ID[id];
  const Panel = b.Panel;

  // During the tour the village is a full DEMO: pin a sample connected wallet so
  // every panel shows populated mock data instead of a connect wall.
  if (tour.active) {
    return (
      <ErrorBoundary label={b.name}>
        <PreviewWalletProvider>
          <Panel />
        </PreviewWalletProvider>
      </ErrorBoundary>
    );
  }

  // A single panel that throws (data error, failed media on a degraded device)
  // must not blank the whole building / dashboard, contain it per panel.
  return (
    <ErrorBoundary label={b.name}>
      <Panel />
    </ErrorBoundary>
  );
}
