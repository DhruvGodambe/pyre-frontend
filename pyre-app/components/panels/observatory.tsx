"use client";

/* ============================================================================
   THE OBSERVATORY, live protocol stats
   ----------------------------------------------------------------------------
   Read-only. No wallet required (public data). The reference implementation:
   every other panel follows this shape, a hook for data, StateView for
   loading/error, token-driven primitives for the render.
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
    <Panel title="The Observatory" tagline="Live protocol stats" frame="forged" bg="stone">
      <StateView
        query={stats}
        loading={
          <p className="text-text-2 text-sm py-8 text-center">
            Reading the chain… (burn / stake totals sync from logs shortly after)
          </p>
        }
      >
        {(s) => (
          /* Two columns across the wide interior: the live readings on the left
             (the two headline readouts + the reading grid), the trends on the
             right (halving countdown + the burn-rate chart, given room to
             breathe). Stacks to one column on mobile. */
          <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
            {/* LEFT: the readings */}
            <div className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="orn-box flex flex-col justify-between gap-2">
                  <span className="eyebrow">Next decay tick</span>
                  <div className="tabular text-3xl text-brand leading-none">
                    <Countdown to={s.nextEpochAt} />
                  </div>
                  <Badge tone="brand">
                    {formatPercent(s.decayRatePerHour)} / hr · Era {s.era}
                  </Badge>
                </div>
                <div className="orn-box flex flex-col justify-between gap-2">
                  <span className="eyebrow">Reward pool</span>
                  <div className="tabular text-3xl text-brand leading-none">
                    {formatEth(s.pendingYieldPoolEth)}
                  </div>
                  <Badge>
                    {formatEth(s.totalEthToYieldPool)} to yield · {formatEth(s.totalEthToTeam)} to team
                  </Badge>
                </div>
              </div>

              <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  <Stat key="s" label="Supply remaining" value={formatToken(s.totalSupply)} />,
                  <Stat key="b" label="Burned all-time" value={formatToken(s.totalBurned)} accent />,
                  <Stat
                    key="r"
                    label="Staking ratio"
                    value={formatPercent(s.stakingRatio)}
                    sub={`${formatToken(s.totalStaked)} $PYRE staked`}
                  />,
                  <Stat key="a" label="Active Acolytes" value={s.activeAcolytes.toLocaleString()} />,
                  <Stat key="sc" label="S(t) scaling" value={s.scalingFactor.toFixed(4)} />,
                  <Stat key="d" label="$ETH to yield (all-time)" value={formatEth(s.totalEthToYieldPool)} />,
                ].map((tile, i) => (
                  <div key={i} className="orn-box flex items-center">
                    {tile}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: the trends */}
            <div className="flex flex-col gap-4">
              <div className="orn-box">
                <ProgressBar
                  value={1 - s.epochsUntilHalving / 2000}
                  label={`${s.epochsUntilHalving.toLocaleString()} epochs until the next halving`}
                />
              </div>
              <div className="orn-box flex flex-1 flex-col">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="eyebrow">Burn rate · 48h</span>
                  <span className="text-text-2 text-xs tabular">
                    24h vol {formatEth(s.volume24h, 0)}
                  </span>
                </div>
                <div className="flex-1">
                  <Sparkline data={s.burnRateSeries} />
                </div>
              </div>
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
