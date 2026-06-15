"use client";

/* MOBILE SHELL — the Dashboard. One scrolling page, panels stacked in priority
   order (05-ui-screens.md → "Mobile Dashboard"). This is what most users get,
   because most arrive on a phone. Mobile-first is a hard requirement.
   Same panel components as the Village shell — only the frame differs. */

import { BUILDINGS } from "@/components/buildings";
import { ConnectButton } from "@/components/connect-button";

export function MobileShell() {
  const stacked = BUILDINGS.filter((b) => b.mobileOrder !== null).sort(
    (a, b) => (a.mobileOrder ?? 0) - (b.mobileOrder ?? 0)
  );

  return (
    <main className="min-h-dvh max-w-xl mx-auto px-4 pb-16">
      <header className="sticky top-0 z-10 flex items-center justify-between py-4 bg-bg/90 backdrop-blur">
        <span className="font-display text-2xl text-brand tracking-wide">PYRE</span>
        <ConnectButton />
      </header>

      <div className="space-y-4">
        {stacked.map(({ id, Panel }) => (
          <Panel key={id} />
        ))}
      </div>
    </main>
  );
}
