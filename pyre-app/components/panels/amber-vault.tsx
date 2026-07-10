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
  useClaimStakingRewards,
} from "@/lib/hooks";
import { Panel, Stat, ProgressBar, Badge, Button } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { NavCta } from "@/components/ui/nav-cta";
import { AcolyteArt } from "@/components/ui/acolyte-art";
import { GameIcon } from "@/components/ui/game-icon";
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
    <Panel title="The Amber Vault" tagline="Your position & Acolyte" frame="forged" bg="stone">
      <RequireWallet message="Connect to see your Pyre Acolyte and position.">
        <StateView query={acolyte}>
          {(a) =>
            !a.exists ? (
              <div className="mx-auto max-w-xl">
                <AcolyteState
                  liquid={position.data?.liquidBalance ?? 0n}
                  burned={a.cumulativeBurnWeight}
                />
              </div>
            ) : (
              /* Two columns across the wide interior: your Acolyte + position on
                 the left, your history on the right. Stacks on mobile. */
              <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
                <div className="space-y-5 lg:col-span-3">
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
                    {/* Sell: hand off to the Black Market's "Your Acolyte" tab. */}
                    <NavCta to="market" tab="yours" variant="ghost" className="w-full sm:w-auto">
                      Sell on the Black Market →
                    </NavCta>
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

                      <div className="space-y-3">
                        {/* Pending yield is the focal number: full-width lit tile. */}
                        <div className="orn-box">
                          <Stat label="Pending $ETH" value={formatEth(p.pendingRewardsEth)} accent />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="orn-box">
                            <Stat label="Liquid balance" value={formatToken(p.liquidBalance)} sub={decayLabel} />
                          </div>
                          <div className="orn-box">
                            <Stat label="Staked (safe)" value={formatToken(p.stakedBalance)} />
                          </div>
                          {p.drip && (
                            <div className="orn-box col-span-2">
                              <Stat
                                label="Drip returning"
                                value={formatToken(p.drip.total)}
                                sub="7-day exit in progress"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Claim your staking yield. This is the home for it: the Vault is
                          where your position + rewards live (the Forge is for stake/burn). */}
                      <ClaimYield pending={p.pendingRewardsEth} />

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

                </div>

                {/* RIGHT: your history */}
                <div className="space-y-2.5 lg:col-span-2">
                  <h3 className="eyebrow">Your history</h3>
                  <StateView query={history} loading={null}>
                    {(events) =>
                      events.length === 0 ? (
                        <p className="text-text-3 text-xs">No activity yet.</p>
                      ) : (
                        <ul className="orn-box divide-y divide-surface-3/50 overflow-hidden">
                          {events.map((e) => (
                            <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                              <span className="text-text-2">
                                {e.note}
                                {e.kind !== "claim" && ` · ${formatToken(e.amount)}`}
                              </span>
                              <span className="text-text-3 text-xs tabular shrink-0">{formatAgo(e.at)}</span>
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
   $ETH, burn $PYRE to forge your Acolyte and multiply that yield (up to 3×). The
   primary CTA adapts to whether they hold any $PYRE yet. */
function AcolyteState({ liquid, burned }: { liquid: bigint; burned: bigint }) {
  const emberTarget = STAGES[1].threshold; // 10,000 burned forges the first Acolyte
  const hasPyre = liquid > 0n;
  const remaining = emberTarget > burned ? emberTarget - burned : 0n;

  return (
    <div className="space-y-5 py-2">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <GameIcon name="ember" size={54} alt="" className="opacity-80 drop-shadow-[0_2px_8px_rgba(240,169,59,0.25)]" />
        </div>
        <h3 className="font-display text-2xl text-brand">You don&rsquo;t have an Acolyte yet</h3>
        <p className="text-text-2 text-sm max-w-sm mx-auto">
          Stake $PYRE to earn $ETH yield and protect it from decay. Then burn $PYRE to create your
          Acolyte, an NFT that multiplies that yield, rising tier by tier from Ember Acolyte up to
          Pyre Acolyte (3×). Unstaked $PYRE only decays.
        </p>
      </div>

      {/* The loop, at a glance */}
      <div className="grid grid-cols-3 gap-2">
        <Step n={1} label="Buy $PYRE" done={hasPyre} />
        <Step n={2} label="Stake · earn $ETH" />
        <Step n={3} label="Burn · ×3 yield" />
      </div>

      {/* Where they stand */}
      <div className="orn-box space-y-3">
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
            <NavCta to="forge" tab="stake">Stake to start earning $ETH</NavCta>
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
      {done ? (
        <GameIcon name="check" size={26} className="shrink-0" />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full border border-surface-3 text-xs">
          {n}
        </span>
      )}
      <span className="text-[10px] uppercase tracking-wide leading-tight">{label}</span>
    </div>
  );
}

/* Claim the $ETH your staked $PYRE has earned. Lives here in the Vault, where your
   position + rewards live (the Forge is only for stake/burn). Hidden with nothing
   to claim. */
function ClaimYield({ pending }: { pending: bigint }) {
  const claim = useClaimStakingRewards();
  if (pending <= 0n) return null;
  return (
    <Button className="w-full" disabled={claim.isPending} onClick={() => claim.mutate()}>
      {claim.isPending ? "Claiming…" : `Claim ${formatEth(pending)}`}
    </Button>
  );
}
