"use client";

/* SEALED PREVIEW, the pre-launch "Opens at launch" treatment.

   Before launch the village is finished but not yet wired to the contracts, so
   every building except the Ashen Cup is sealed: you can step inside and see the
   real, polished UI we built (proof of craft + a hook), but it's inert, and a
   banner points you to the one open door, the Ashen Cup, where you quest and
   submit your wallet now. At launch, NEXT_PUBLIC_LAUNCHED=true unseals everything
   in one flip (see lib/config.ts). Both shells render their panels through
   <BuildingPanel>, so this is the single place the lock lives. */

import { usePreview } from "@/lib/preview";
import { PreviewWalletProvider } from "@/lib/wallet";
import { BUILDING_BY_ID, type BuildingId } from "@/components/buildings";
import { NavCta } from "./nav-cta";
import { ErrorBoundary } from "./error-boundary";
import { GameIcon } from "./game-icon";

/* The only buildings LIVE before launch. The Ashen Cup (tavern) carries the
   whole pre-launch funnel: quests + wallet submit. */
export const OPEN_PRE_LAUNCH: BuildingId[] = ["tavern"];

/* One line per sealed building: what it WILL do at launch (future tense), so the
   preview reads as anticipation, not an empty shell. */
const TEASER: Partial<Record<BuildingId, string>> = {
  forge: "At launch you'll stake $PYRE here to earn ETH, and burn it to forge your Acolyte.",
  vault: "At launch your Acolyte, balances and ETH yield will live here.",
  observatory: "At launch you'll read the whole protocol live: supply, decay, burns and yield.",
  exchange: "At launch you'll swap ETH and $PYRE here, every fee shown upfront.",
  market: "At launch you'll buy and sell the Acolytes other wallets have forged.",
  immolated: "At launch, top-tier holders burn again here to share extra ETH yield.",
  bonfire: "At launch, every $PYRE burned across the village is counted here, live.",
};

/* Renders a building's panel, sealed when pre-launch. The real panel is shown
   beneath the banner, fully visible but inert (no clicks, no focus, hidden from
   assistive tech), so visitors admire the craft without being able to act. */
export function BuildingPanel({ id }: { id: BuildingId }) {
  const { launched } = usePreview();
  const b = BUILDING_BY_ID[id];
  const Panel = b.Panel;
  const sealed = !launched && !OPEN_PRE_LAUNCH.includes(id);
  // A single panel that throws (data error, failed media on a degraded device)
  // must not blank the whole building / dashboard, contain it per panel.
  if (!sealed)
    return (
      <ErrorBoundary label={b.name}>
        <Panel />
      </ErrorBoundary>
    );
  return (
    <div className="space-y-3">
      <SealedBanner id={id} />
      {/* Inert (no clicks/focus, hidden from a11y) and pinned to a sample
          connected wallet, so gated panels show their real, populated UI rather
          than a connect wall, the whole point is to show the craft. */}
      <div className="pointer-events-none select-none" aria-hidden tabIndex={-1}>
        <ErrorBoundary label={b.name}>
          <PreviewWalletProvider>
            <Panel />
          </PreviewWalletProvider>
        </ErrorBoundary>
      </div>
    </div>
  );
}

function SealedBanner({ id }: { id: BuildingId }) {
  const b = BUILDING_BY_ID[id];
  return (
    <div className="rounded-panel border border-brand/30 bg-gradient-to-b from-brand/10 to-surface/50 px-4 py-3.5 shadow-panel backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <GameIcon name="lock" size={36} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-text text-sm font-medium">{b.name} opens at launch</span>
            <span className="rounded-sm border border-brand/40 bg-brand/15 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-brand">
              Preview
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-2">
            {TEASER[id] ? `${TEASER[id]} ` : ""}
            For now it&rsquo;s a preview of what we&rsquo;ve built, the fire isn&rsquo;t lit yet.
          </p>
          <NavCta to="tavern" variant="ghost" className="mt-2.5 w-full sm:w-auto">
            Earn your place in the Ashen Cup →
          </NavCta>
        </div>
      </div>
    </div>
  );
}
