"use client";

/* THE AMBER VAULT — your position + Fire Spirit. Requires wallet.
   Spec: 05-ui-screens.md → "The Amber Vault". States: not-connected, loading,
   empty (no Fire Spirit yet), populated. Includes the quest-completer boost (if
   earned) and personal transaction history. */

import {
  useFireSpirit,
  useStakingPosition,
  useProtocolStats,
  useUserHistory,
} from "@/lib/hooks";
import { Panel, Stat, ProgressBar, Badge } from "@/components/ui/primitives";
import { StateView, EmptyState } from "@/components/ui/state";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { FireSpiritArt } from "@/components/ui/fire-spirit-art";
import { STAGES } from "@/lib/constants";
import {
  formatToken,
  formatEth,
  formatPercent,
  formatCountdown,
  formatAgo,
  toNumber,
} from "@/lib/format";

export function AmberVaultPanel() {
  const spirit = useFireSpirit();
  const position = useStakingPosition();
  const stats = useProtocolStats();
  const history = useUserHistory();

  const decayLabel = stats.data
    ? `decaying ${formatPercent(stats.data.decayRatePerHour)}/hr`
    : "decaying";

  return (
    <Panel title="The Amber Vault" tagline="Your position & Fire Spirit">
      <RequireWallet message="Connect to see your Fire Spirit and position.">
        <StateView query={spirit}>
          {(fs) =>
            !fs.exists ? (
              <EmptyState
                icon="🜂"
                title="Your Fire Spirit sleeps"
                message={`${formatToken(STAGES[1].threshold - fs.cumulativeBurnWeight)} $PYRE until it wakes. Burn to forge it.`}
              />
            ) : (
              <div className="space-y-5">
                <div className="flex gap-4 items-center">
                  <FireSpiritArt spirit={fs} size={140} />
                  <div className="space-y-2">
                    <div>
                      <span className="font-display text-3xl text-brand">{fs.stageName}</span>
                      <span className="text-text-3 ml-2">Stage {fs.stage}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="brand">{fs.multiplier}× yield</Badge>
                      {fs.isLP && <Badge tone="brand">LP variant</Badge>}
                      {fs.isImmolated && <Badge tone="danger">Immolated</Badge>}
                    </div>
                    <Stat label="Cumulative burned" value={formatToken(fs.cumulativeBurnWeight)} />
                  </div>
                </div>

                {fs.nextStageThreshold && (
                  <ProgressBar
                    value={toNumber(fs.cumulativeBurnWeight) / toNumber(fs.nextStageThreshold)}
                    label={`${formatToken(fs.nextStageThreshold - fs.cumulativeBurnWeight)} $PYRE to the next stage`}
                  />
                )}

                <StateView query={position}>
                  {(p) => (
                    <>
                      {/* Quest-completer boost — shown only to the wallet that earned it */}
                      {p.boost && (
                        <div className="flex items-center justify-between rounded-md bg-brand/10 border border-brand/30 px-3 py-2">
                          <span className="text-brand text-sm">
                            Quest boost · +{Math.round((p.boost.factor - 1) * 100)}% yield
                          </span>
                          <span className="text-text-2 text-xs tabular">
                            expires in {formatCountdown(p.boost.expiresAt - Date.now())}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-surface-3/60">
                        <Stat label="Liquid balance" value={formatToken(p.liquidBalance)} sub={decayLabel} />
                        <Stat label="Staked (safe)" value={formatToken(p.stakedBalance)} />
                        <Stat label="Pending ETH" value={formatEth(p.pendingRewardsEth)} accent />
                        {p.drip && (
                          <Stat
                            label="Drip returning"
                            value={formatToken(p.drip.total)}
                            sub="7-day exit in progress"
                          />
                        )}
                      </div>
                    </>
                  )}
                </StateView>

                {/* Personal transaction history */}
                <div className="pt-3 border-t border-surface-3/60">
                  <h3 className="text-text-3 text-xs uppercase tracking-wider mb-2">Your history</h3>
                  <StateView query={history} loading={null}>
                    {(events) =>
                      events.length === 0 ? (
                        <p className="text-text-3 text-xs">No activity yet.</p>
                      ) : (
                        <ul className="space-y-1">
                          {events.map((e) => (
                            <li key={e.id} className="flex items-center justify-between text-sm">
                              <span className="text-text-2">
                                {e.note}
                                {e.kind !== "claim" && ` · ${formatToken(e.amount)}`}
                              </span>
                              <span className="text-text-3 text-xs tabular">{formatAgo(e.at)}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    }
                  </StateView>
                </div>
              </div>
            )
          }
        </StateView>
      </RequireWallet>
    </Panel>
  );
}
