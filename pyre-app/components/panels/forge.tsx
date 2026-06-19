"use client";

/* THE FORGE — stake & burn. Requires wallet. Two tabs.
   Spec: 05-ui-screens.md → "The Forge". States: not-connected, cold (nothing
   staked), active, drip-in-progress (locks staking until complete).

   The mechanic the copy must get right: STAKING earns the ETH yield; BURNING
   forges/levels your Pyre Acolyte, which MULTIPLIES that staked yield (1× → 3×).
   Burning earns nothing on its own — so we always point burners back to staking,
   and stakers toward burning to raise their multiplier.

   Tabs are navigation-aware: a CTA elsewhere (e.g. the Amber Vault) can deep-link
   straight to Stake or Burn via useNavigation({ building: "forge", tab }). */

import { useEffect, useState } from "react";
import {
  useStakingPosition,
  useAcolyte,
  useProtocolStats,
  useStake,
  useUnstake,
  useClaimDrip,
  useClaimStakingRewards,
  useBurnTokens,
  useBurnLP,
} from "@/lib/hooks";
import { useNavigation } from "@/lib/navigation";
import { Panel, Stat, Field, ProgressBar, Badge } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { Tabs } from "@/components/ui/tabs";
import { TxButton } from "@/components/ui/tx-button";
import { NavCta } from "@/components/ui/nav-cta";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { formatToken, formatEth, formatPercent, parseToken, toNumber } from "@/lib/format";
import { STAGES } from "@/lib/constants";

export function ForgePanel() {
  const { pending, clearPending } = useNavigation();
  const [tab, setTab] = useState("stake");

  // Honour a deep-link into a specific tab (e.g. Vault → "Burn to forge").
  useEffect(() => {
    if (pending?.building === "forge") {
      if (pending.tab) setTab(pending.tab);
      clearPending();
    }
  }, [pending, clearPending]);

  return (
    <Panel title="The Forge" tagline="Stake & burn">
      <RequireWallet message="Connect to stake or burn.">
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "stake", label: "Stake", content: <StakeTab /> },
            { id: "burn", label: "Burn", content: <BurnTab /> },
          ]}
        />
      </RequireWallet>
    </Panel>
  );
}

/* A small "you have no $PYRE — go buy some" nudge, shared by both tabs. */
function BuyNudge({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-surface-2 border border-surface-3/60 p-3 space-y-2">
      <p className="text-text-2 text-sm">{message}</p>
      <NavCta to="exchange">Buy $PYRE</NavCta>
    </div>
  );
}

function StakeTab() {
  const position = useStakingPosition();
  const acolyte = useAcolyte();
  const stats = useProtocolStats();
  const [amount, setAmount] = useState("");
  const stake = useStake();
  const unstake = useUnstake();
  const claimDrip = useClaimDrip();
  const claimRewards = useClaimStakingRewards();
  const decaySub = stats.data
    ? `losing ${formatPercent(stats.data.decayRatePerHour)}/hr`
    : "losing to decay";

  return (
    <StateView query={position}>
      {(p) => {
        const amt = parseToken(amount);
        // Drip in progress takes over the panel — can't restake until complete.
        if (p.drip) {
          const pct =
            toNumber(p.drip.total) === 0
              ? 0
              : 1 - toNumber(p.drip.total - p.drip.claimed) / toNumber(p.drip.total);
          return (
            <div className="space-y-4">
              <Badge tone="danger">Drip in progress</Badge>
              <p className="text-text-2 text-sm">
                {formatToken(p.drip.total)} $PYRE returning over 7 days, and still decaying as it
                returns. You can&rsquo;t restake until it completes.
              </p>
              <ProgressBar value={pct} label="Drip progress" />
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Claimable now" value={formatToken(p.drip.claimable)} />
                <Stat
                  label="Lost to decay"
                  value={`≈ ${formatToken(p.drip.decayLoss)}`}
                  sub="the cost of leaving"
                />
              </div>
              <TxButton tx={claimDrip} onClick={() => claimDrip.mutate()}>
                Claim returned $PYRE
              </TxButton>
            </div>
          );
        }
        const mult = acolyte.data?.multiplier ?? 1;
        const cold = p.liquidBalance <= 0n && p.stakedBalance <= 0n;
        return (
          <div className="space-y-4">
            {p.boost && (
              <div className="rounded-md bg-brand/10 border border-brand/30 px-3 py-2 text-brand text-xs">
                Quest boost active · +{Math.round((p.boost.factor - 1) * 100)}% on your staked yield
              </div>
            )}
            <p className="text-text-3 text-xs">
              Staked $PYRE earns ETH yield and is shielded from decay
              {acolyte.data?.exists
                ? ` — multiplied ${mult}× by your ${acolyte.data.stageName} Acolyte.`
                : ". Burn $PYRE to forge an Acolyte and multiply it (up to 3×)."}
            </p>

            {cold ? (
              <BuyNudge message="You have no $PYRE yet. Buy some, then stake it here to start earning ETH." />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Liquid" value={formatToken(p.liquidBalance)} sub={decaySub} />
                  <Stat label="Staked (safe)" value={formatToken(p.stakedBalance)} />
                </div>
                <Field label="Amount" value={amount} onChange={setAmount} suffix="$PYRE" />
                <div className="grid grid-cols-2 gap-3">
                  <TxButton
                    tx={stake}
                    disabled={amt <= 0n}
                    onClick={() => stake.mutate(amt)}
                    pendingLabel="Staking…"
                  >
                    Stake
                  </TxButton>
                  <TxButton
                    tx={unstake}
                    variant="ghost"
                    disabled={amt <= 0n}
                    onClick={() => unstake.mutate(amt)}
                    pendingLabel="Unstaking…"
                  >
                    Unstake → drip
                  </TxButton>
                </div>
              </>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-surface-3/60">
              <Stat label="Pending ETH" value={formatEth(p.pendingRewardsEth)} accent />
              <TxButton
                tx={claimRewards}
                variant="ghost"
                disabled={p.pendingRewardsEth <= 0n}
                onClick={() => claimRewards.mutate()}
                pendingLabel="Claiming…"
              >
                Claim
              </TxButton>
            </div>

            {/* Stakers with a low / no Acolyte: burning is the lever that raises
                their yield — point them to it. */}
            {p.stakedBalance > 0n && (acolyte.data?.stage ?? 0) < 4 && (
              <NavCta to="forge" tab="burn" variant="ghost">
                {acolyte.data?.exists
                  ? `Burn to level up your Acolyte (now ${mult}×)`
                  : "Burn to forge your Acolyte & multiply this yield"}
              </NavCta>
            )}
          </div>
        );
      }}
    </StateView>
  );
}

function BurnTab() {
  const position = useStakingPosition();
  const acolyte = useAcolyte();
  const [amount, setAmount] = useState("");
  const [lp, setLp] = useState(false);
  const [eth, setEth] = useState("");
  const burn = useBurnTokens();
  const burnLP = useBurnLP();

  return (
    <StateView query={position}>
      {(p) => (
        <StateView query={acolyte}>
          {(a) => {
            const amt = parseToken(amount);
            const next = a.nextStageThreshold;
            return (
              <div className="space-y-4">
                <p className="text-text-3 text-xs">
                  Burning is permanent. It forges and levels your Pyre Acolyte, which multiplies
                  the ETH yield on your <span className="text-text-2">staked</span> $PYRE — up to 3×
                  at PYRE. An Acolyte earns nothing on its own.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Liquid" value={formatToken(p.liquidBalance)} />
                  <Stat
                    label="Burned so far"
                    value={formatToken(a.cumulativeBurnWeight)}
                    accent
                  />
                </div>
                {next && (
                  <ProgressBar
                    value={toNumber(a.cumulativeBurnWeight) / toNumber(next)}
                    label={`${formatToken(next - a.cumulativeBurnWeight)} $PYRE to ${
                      STAGES[Math.min(4, a.stage + 1) as 1 | 2 | 3 | 4].name
                    } (${STAGES[Math.min(4, a.stage + 1) as 1 | 2 | 3 | 4].multiplier}× yield)`}
                  />
                )}

                {p.liquidBalance <= 0n ? (
                  <BuyNudge message="You have no $PYRE to burn. Buy some first, then return to forge your Acolyte." />
                ) : (
                  <>
                    <div className="flex gap-1 rounded-md bg-surface-2 p-1 text-sm">
                      <button
                        onClick={() => setLp(false)}
                        className={`flex-1 rounded-sm py-1.5 ${!lp ? "bg-brand text-bg" : "text-text-2"}`}
                      >
                        Burn tokens
                      </button>
                      <button
                        onClick={() => setLp(true)}
                        className={`flex-1 rounded-sm py-1.5 ${lp ? "bg-brand text-bg" : "text-text-2"}`}
                      >
                        Burn LP (+20%)
                      </button>
                    </div>

                    <Field label="$PYRE to burn" value={amount} onChange={setAmount} suffix="$PYRE" />
                    {lp && (
                      <Field label="Paired ETH" value={eth} onChange={setEth} suffix="ETH" />
                    )}

                    {lp ? (
                      <TxButton
                        tx={burnLP}
                        disabled={amt <= 0n}
                        onClick={() => burnLP.mutate({ eth: parseToken(eth), pyre: amt })}
                        pendingLabel="Burning LP…"
                      >
                        Burn LP shares
                      </TxButton>
                    ) : (
                      <TxButton
                        tx={burn}
                        disabled={amt <= 0n}
                        onClick={() => burn.mutate(amt)}
                        pendingLabel="Feeding the fire…"
                      >
                        Burn $PYRE
                      </TxButton>
                    )}
                  </>
                )}

                {/* The multiplier only pays out on STAKED $PYRE — if they have none
                    staked, send them to stake so the burn actually earns. */}
                {p.stakedBalance <= 0n && (
                  <NavCta to="forge" tab="stake" variant="ghost">
                    Stake $PYRE so your multiplier earns ETH
                  </NavCta>
                )}
              </div>
            );
          }}
        </StateView>
      )}
    </StateView>
  );
}
