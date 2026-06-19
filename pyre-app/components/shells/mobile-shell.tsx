"use client";

/* MOBILE SHELL — the Dashboard. One scrolling page, panels stacked in priority
   order (05-ui-screens.md → "Mobile Dashboard"). This is what most users get,
   because most arrive on a phone. Mobile-first is a hard requirement.
   Same panel components as the Village shell — only the frame differs.

   Navigation-aware: a conversion CTA (e.g. Vault → "Stake") scrolls the target
   building into view. Tab selection is handled inside the target panel, so we
   only clear `pending` here when there's no tab left for a panel to consume. */

import { useEffect } from "react";
import { BUILDINGS } from "@/components/buildings";
import { ConnectButton } from "@/components/connect-button";
import { useNavigation } from "@/lib/navigation";

export function MobileShell() {
  const { pending, clearPending } = useNavigation();
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
      <header className="sticky top-0 z-10 flex items-center justify-between py-4 bg-bg/90 backdrop-blur">
        <span className="font-display text-2xl text-brand tracking-wide">PYRE</span>
        <ConnectButton />
      </header>

      <div className="space-y-4">
        {stacked.map(({ id, Panel }) => (
          <div key={id} id={`b-${id}`} className="scroll-mt-20">
            <Panel />
          </div>
        ))}
      </div>
    </main>
  );
}
