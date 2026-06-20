"use client";

/* MOBILE SHELL, the Dashboard. One scrolling page, panels stacked in priority
   order (05-ui-screens.md → "Mobile Dashboard"). This is what most users get,
   because most arrive on a phone. Mobile-first is a hard requirement.
   Same panel components as the Village shell, only the frame differs.

   Navigation-aware: a conversion CTA (e.g. Vault → "Stake") scrolls the target
   building into view. Tab selection is handled inside the target panel, so we
   only clear `pending` here when there's no tab left for a panel to consume. */

import { useEffect } from "react";
import { BUILDINGS } from "@/components/buildings";
import { ConnectButton } from "@/components/connect-button";
import { useNavigation } from "@/lib/navigation";
import { useIdentity } from "@/lib/identity";
import { useTour } from "@/lib/tour";
import { WorldRiteProgress, WorldProfile } from "@/components/world-hud";
import { TourNarration, TourHighlight } from "@/components/tour-ui";

export function MobileShell() {
  const { pending, clearPending } = useNavigation();
  const { isSet } = useIdentity();
  const tour = useTour();

  // The mobile guided tour: no map to fly over, so each beat scrolls the target
  // into view and the spotlight rings it. Outside beat → the building's whole
  // panel; inside beat → the specific section (forge-stake, etc.); overview →
  // the top of the page.
  const beat = tour.active ? tour.beat : null;
  const tourTarget =
    beat && !beat.overview
      ? beat.phase === "inside" && beat.highlight
        ? beat.highlight
        : beat.building
          ? `b-${beat.building}`
          : null
      : null;
  useEffect(() => {
    if (!tour.active || !tour.beat) return;
    if (tour.beat.overview) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (tourTarget) {
      requestAnimationFrame(() =>
        document.getElementById(tourTarget)?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
    }
  }, [tour.active, tour.beat, tourTarget]);
  const stacked = BUILDINGS.filter((b) => b.mobileOrder !== null).sort(
    (a, b) => (a.mobileOrder ?? 0) - (b.mobileOrder ?? 0)
  );

  useEffect(() => {
    if (!pending) return;
    document
      .getElementById(`b-${pending.building}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (!pending.tab) clearPending();
  }, [pending, clearPending]);

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-4 pb-16">
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur">
        <div className="flex items-center justify-between py-4">
          <span className="font-display text-2xl text-brand tracking-wide">PYRE</span>
          <ConnectButton />
        </div>
        {/* Once awake: profile + rite progress, always visible (the mobile take on
            the world's bottom-left / top-right HUD). */}
        {isSet && (
          <div className="flex items-center justify-between gap-2 pb-3">
            <WorldProfile />
            <WorldRiteProgress />
          </div>
        )}
      </header>

      <div className="space-y-4">
        {stacked.map(({ id, Panel }) => (
          <div key={id} id={`b-${id}`} className="scroll-mt-20">
            <Panel />
          </div>
        ))}
      </div>

      {/* Guided tour (mobile): same narration, scroll + spotlight instead of a camera. */}
      {tour.active && tour.beat && <TourNarration />}
      {tour.active && tourTarget && <TourHighlight targetId={tourTarget} />}
    </main>
  );
}
