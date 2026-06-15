"use client";

/* THE BONFIRE — the central plaza. A counter + flame, not a full UI.
   4 visual states by total all-time burned: kindling → burning → raging →
   inferno. Beneath the flame: a LIVE BURN ticker — burns only, not other
   activity. Spec: 05-ui-screens.md → "The Bonfire". */

import { useEffect, useState } from "react";
import { useProtocolStats, useActivityFeed } from "@/lib/hooks";
import { StateView } from "@/components/ui/state";
import { formatToken, formatAgo, shortAddress } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";
import type { BonfireState } from "@/lib/constants";

const FLAME: Record<BonfireState, { glyph: string; label: string; scale: string }> = {
  kindling: { glyph: "🔥", label: "Kindling", scale: "text-5xl" },
  burning: { glyph: "🔥", label: "Burning", scale: "text-6xl" },
  raging: { glyph: "🔥", label: "Raging", scale: "text-7xl" },
  inferno: { glyph: "🔥", label: "Inferno", scale: "text-8xl" },
};

export function BonfirePanel() {
  const stats = useProtocolStats();
  const feed = useActivityFeed();

  return (
    <StateView query={stats}>
      {(s) => {
        const f = FLAME[s.bonfire];
        return (
          <div className="rounded-panel bg-surface shadow-panel border border-surface-3/60 p-6 text-center relative overflow-hidden">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(circle at 50% 80%, var(--color-brand)18, transparent 60%)" }}
            />
            <div className={`${f.scale} animate-pulse`} aria-hidden>
              {f.glyph}
            </div>
            <div className="font-display text-4xl text-brand tabular mt-2">
              {formatToken(s.totalBurned)}
            </div>
            <div className="text-text-3 text-xs uppercase tracking-widest mt-1">
              $PYRE burned all-time · {f.label}
            </div>

            <div className="mt-4 h-6 overflow-hidden">
              <StateView query={feed} loading={null}>
                {(events) => <BurnTicker events={events} />}
              </StateView>
            </div>
          </div>
        );
      }}
    </StateView>
  );
}

/* Live ticker of recent BURNS only — cycles through them for a "happening now"
   feel. Other activity (swaps, claims, stakes) belongs in The Ashen Cup, not here. */
function BurnTicker({ events }: { events: ActivityEvent[] }) {
  const burns = events.filter((e) => e.kind === "burn");
  const [i, setI] = useState(0);

  useEffect(() => {
    if (burns.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % burns.length), 2500);
    return () => clearInterval(id);
  }, [burns.length]);

  if (burns.length === 0) {
    return <div className="text-text-3 text-xs">The fire waits for the first burn…</div>;
  }
  const e = burns[i % burns.length];
  return (
    <div className="text-text-2 text-xs tabular">
      {shortAddress(e.address)} burned {formatToken(e.amount)} $PYRE · {formatAgo(e.at)}
    </div>
  );
}
