"use client";

/* ============================================================================
   THE OBSERVATORY — live protocol stats
   ----------------------------------------------------------------------------
   Read-only. No wallet required (public data). The reference implementation:
   every other panel follows this shape — a hook for data, StateView for
   loading/error, token-driven primitives for the render.
   Spec: designer-briefing/content/05-ui-screens.md → "The Observatory".
   ========================================================================== */

import { useEffect, useState } from "react";
import { useProtocolStats } from "@/lib/hooks";
import { Panel, Stat, ProgressBar, Badge } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { Sparkline } from "@/components/ui/chart";
import {
  formatToken,
  formatPercent,
  formatCountdown,
  formatEth,
} from "@/lib/format";

export function ObservatoryPanel() {
  const stats = useProtocolStats();

  return (
    <Panel title="The Observatory" tagline="Live protocol stats">
      <StateView query={stats}>
        {(s) => (
          <div className="space-y-5">
            {/* Rebase countdown — the live pulse */}
            <div className="flex items-center justify-between rounded-md bg-surface-2 px-4 py-3">
              <div>
                <span className="text-text-3 text-xs uppercase tracking-wider">
                  Next decay tick
                </span>
                <div className="tabular text-2xl text-brand">
                  <Countdown to={s.nextEpochAt} />
                </div>
              </div>
              <Badge tone="brand">
                {formatPercent(s.decayRatePerHour)} / hr · Era {s.era}
              </Badge>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Stat label="Supply remaining" value={formatToken(s.totalSupply)} />
              <Stat label="Burned all-time" value={formatToken(s.totalBurned)} accent />
              <Stat label="Staking ratio" value={formatPercent(s.stakingRatio)} />
              <Stat label="Active Fire Spirits" value={s.activeFireSpirits.toLocaleString()} />
              <Stat label="S(t) scaling" value={s.scalingFactor.toFixed(4)} />
              <Stat label="ETH distributed" value={formatEth(s.totalEthDistributed, 0)} />
            </div>

            {/* Era countdown */}
            <ProgressBar
              value={1 - s.epochsUntilHalving / 2000}
              label={`${s.epochsUntilHalving.toLocaleString()} epochs until the next halving`}
            />

            {/* Burn-rate chart */}
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-text-3 text-xs uppercase tracking-wider">
                  Burn rate · 48h
                </span>
                <span className="text-text-2 text-xs tabular">
                  24h vol {formatEth(s.volume24h, 0)}
                </span>
              </div>
              <Sparkline data={s.burnRateSeries} />
            </div>
          </div>
        )}
      </StateView>
    </Panel>
  );
}

/* Live ticking countdown to a future ms timestamp. */
function Countdown({ to }: { to: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{formatCountdown(to - now)}</span>;
}
