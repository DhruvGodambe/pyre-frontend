"use client";

/* THE AMBER VAULT, your position + Pyre Acolyte. Requires wallet.
   Spec: 05-ui-screens.md → "The Amber Vault". States: not-connected, loading,
   acolyte (no Pyre Acolyte forged yet, a conversion screen, NOT a dead end),
   populated. Includes the quest-completer boost (if earned) and personal
   transaction history. */

import {
  useAcolyte,
  useStakingPosition,
  useProtocolStats,
  useUserHistory,
} from "@/lib/hooks";
import { Panel, Stat, ProgressBar, Badge } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { NavCta } from "@/components/ui/nav-cta";
import { AcolyteArt } from "@/components/ui/acolyte-art";
import { STAGES, acolyteName } from "@/lib/constants";
import {
  formatToken,
  formatEth,
  formatPercent,
  formatCountdown,
  formatAgo,
  toNumber,
} from "@/lib/format";

export function AmberVaultPanel() {
  const acolyte = useAcolyte();
  const position = useStakingPosition();
  const stats = useProtocolStats();
  const history = useUserHistory();

  const decayLabel = stats.data
    ? `decaying ${formatPercent(stats.data.decayRatePerHour)}/hr`
    : "decaying";

  return (
    <Panel title="The Amber Vault" tagline="Your position & Acolyte">
      <RequireWallet message="Connect to see your Pyre Acolyte and position.">
        <StateView query={acolyte}>
          {(a) =>
            !a.exists ? (
              <AcolyteState
                liquid={position.data?.liquidBalance ?? 0n}
                burned={a.cumulativeBurnWeight}
              />
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:items-center sm:text-left">
                  <AcolyteArt acolyte={a} size={140} />
                  <div className="space-y-2">
                    <div>
                      <span className="font-display text-3xl text-brand">{acolyteName(a.stage)}</span>
                      <span className="text-text-3 ml-2">Tier {a.stage} of 4</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="brand">{a.multiplier}× yield</Badge>
                      {a.isLP && <Badge tone="brand">LP variant</Badge>}
                      {a.isImmolated && <Badge tone="danger">Immolated</Badge>}
                    </div>
                    <Stat label="Cumulative burned" value={formatToken(a.cumulativeBurnWeight)} />
                  </div>
                </div>

                {a.nextStageThreshold && (
                  <ProgressBar
                    value={toNumber(a.cumulativeBurnWeight) / toNumber(a.nextStageThreshold)}
                    label={`${formatToken(a.nextStageThreshold - a.cumulativeBurnWeight)} $PYRE to the next stage`}
                  />
                )}

                <StateView query={position}>
                  {(p) => (
                    <>
                      {/* Quest-completer boost, shown only to the wallet that earned it */}
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

                      {/* Always-present next step: more burned = more multiplier on the
                          staked yield. Nudge the two actions that grow the position. */}
                      <div id="vault-actions" className="grid grid-cols-2 gap-2 scroll-mt-24">
                        <NavCta to="forge" tab="stake" variant="ghost">Stake more</NavCta>
                        <NavCta to="forge" tab="burn">
                          {a.stage >= 4 ? "Burn more" : "Burn → raise multiplier"}
                        </NavCta>
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

/* The pre-forge state. The most-visited empty state in the app, and the top of
   the funnel, so it SELLS the loop instead of dead-ending: stake $PYRE to earn
   ETH, burn $PYRE to forge your Acolyte and multiply that yield (up to 3×). The
   primary CTA adapts to whether they hold any $PYRE yet. */
function AcolyteState({ liquid, burned }: { liquid: bigint; burned: bigint }) {
  const emberTarget = STAGES[1].threshold; // 10,000 burned forges the first Acolyte
  const hasPyre = liquid > 0n;
  const remaining = emberTarget > burned ? emberTarget - burned : 0n;

  return (
    <div className="space-y-5 py-2">
      <div className="text-center space-y-2">
        <div className="text-4xl text-text-3" aria-hidden>
          🜂
        </div>
        <h3 className="font-display text-2xl text-brand">You don&rsquo;t have an Acolyte yet</h3>
        <p className="text-text-2 text-sm max-w-sm mx-auto">
          Stake $PYRE to earn ETH yield and protect it from decay. Then burn $PYRE to create your
          Acolyte, an NFT that multiplies that yield, rising tier by tier from Ember Acolyte up to
          Pyre Acolyte (3×). Unstaked $PYRE only decays.
        </p>
      </div>

      {/* The loop, at a glance */}
      <div className="grid grid-cols-3 gap-2">
        <Step n={1} label="Buy $PYRE" done={hasPyre} />
        <Step n={2} label="Stake · earn ETH" />
        <Step n={3} label="Burn · ×3 yield" />
      </div>

      {/* Where they stand */}
      <div className="rounded-md bg-surface-2 border border-surface-3/60 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-3">You hold</span>
          <span className="tabular text-text">{formatToken(liquid)} $PYRE</span>
        </div>
        <ProgressBar
          value={toNumber(burned) / toNumber(emberTarget)}
          label={`Burn ${formatToken(remaining)} more $PYRE to create your first Acolyte (Ember tier)`}
        />
      </div>

      {/* Next step, adapts to whether they hold $PYRE yet */}
      <div className="space-y-2">
        {hasPyre ? (
          <>
            <NavCta to="forge" tab="stake">Stake to start earning ETH</NavCta>
            <NavCta to="forge" tab="burn" variant="ghost">Burn to forge your Acolyte</NavCta>
          </>
        ) : (
          <>
            <NavCta to="exchange">Buy $PYRE to begin</NavCta>
            <NavCta to="forge" tab="stake" variant="ghost">Go to the Forge</NavCta>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, label, done }: { n: number; label: string; done?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center gap-1.5 ${done ? "text-text-2" : "text-text-3"}`}>
      <span
        className={`grid h-7 w-7 place-items-center rounded-full border text-xs ${
          done ? "border-success/50 text-success" : "border-surface-3"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <span className="text-[10px] uppercase tracking-wide leading-tight">{label}</span>
    </div>
  );
}
