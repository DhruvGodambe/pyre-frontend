"use client";

/* THE FORGE, "Forge your Acolyte". A game-like scene, kept PLAIN-SPOKEN.
   Direction (2026-06-20): ONE page, not a hub you click into. Everything is
   visible at once and uses the width: an Acolyte/climb BANNER across the top,
   then STAKE and BURN as two clearly separated boxes, side by side on desktop,
   stacked on mobile. No station navigation to get lost in.

   Labels use the words people already know, STAKE and BURN. Lore lives only in
   the Emberkeeper's narration, never as the name of an action.

     • BURN  : burn $PYRE → forge/level your Acolyte = a yield MULTIPLIER (1×→3×)
       on your STAKED $PYRE. A burn earns nothing on its own.
     • STAKE : stake $PYRE → it stops decaying and earns $ETH.

   The Forge interior gets a WIDE overlay (buildings.tsx → wide) so the two boxes
   have room. Deep-links (Vault → "Burn to forge") scroll to + flash the box.

   DESIGNER SCAFFOLD: real, wired to the mock, every state reachable. Styling is
   token-driven. Navigation-aware via useNavigation({ building: "forge", tab }). */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
import { Stat, Field, ProgressBar, Badge, Button } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { TxButton, TxImageButton } from "@/components/ui/tx-button";
import { NavCta } from "@/components/ui/nav-cta";
import { AcolyteArt } from "@/components/ui/acolyte-art";
import { GameIcon, tierCrest } from "@/components/ui/game-icon";
import { ForgeReveal, type RevealData } from "@/components/ui/forge-reveal";
import { StakeHearth, StakeWarding } from "@/components/ui/stake-warding";
import { playStakeWard } from "@/lib/sfx";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { USE_MOCK } from "@/lib/config";
import {
  formatToken,
  formatEth,
  formatPercent,
  parseToken,
  toNumber,
  toAmountString,
  percentOf,
} from "@/lib/format";
import { STAGES, acolyteName, type Stage } from "@/lib/constants";
import type { Acolyte, StakingPosition } from "@/lib/types";

export function ForgePanel() {
  const position = useStakingPosition();
  const acolyte = useAcolyte();
  const stats = useProtocolStats();

  return (
    <RequireWallet message="Connect to enter the Forge.">
      <StateView query={position}>
        {(p) => (
          <StateView query={acolyte}>
            {(a) => (
              <ForgeScene
                a={a}
                p={p}
                decay={stats.data ? formatPercent(stats.data.decayRatePerHour) : ""}
              />
            )}
          </StateView>
        )}
      </StateView>
    </RequireWallet>
  );
}

/* ======================================================================== */
/* THE SCENE, banner + the two boxes, all on one page                       */
/* ======================================================================== */
function ForgeScene({ a, p, decay }: { a: Acolyte; p: StakingPosition; decay: string }) {
  const { pending, clearPending } = useNavigation();
  const tier = tierInfo(a);
  // Deep-link (e.g. Vault → "Burn to forge"): scroll to the box and flash it,
  // rather than swapping the whole screen. Runs here, where the boxes exist.
  const [flash, setFlash] = useState<"burn" | "stake" | null>(null);
  useEffect(() => {
    if (pending?.building !== "forge") return;
    const tab = pending.tab === "burn" || pending.tab === "stake" ? pending.tab : null;
    clearPending();
    if (!tab) return;
    setFlash(tab);
    requestAnimationFrame(() =>
      document.getElementById(`forge-${tab}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    );
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [pending, clearPending]);

  // "Stake first" from the Burn box: flash + scroll to the Stake box.
  const stakeFirst = () => {
    setFlash("stake");
    requestAnimationFrame(() =>
      document.getElementById("forge-stake")?.scrollIntoView({ behavior: "smooth", block: "center" })
    );
    window.setTimeout(() => setFlash(null), 1600);
  };

  // FORGE REVEAL cinematic (scaffold). Tier reveal fires when a burn crosses a
  // tier / mints the first Acolyte / reaches Immolated; the LP reveal fires on an
  // LP burn (see BurnRitual → onLpBurned). See components/ui/forge-reveal.tsx.
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const prevTier = useRef<{ stage: number; immolated: boolean } | null>(null);
  useEffect(() => {
    const cur = { stage: a.exists ? a.stage : 0, immolated: a.isImmolated };
    const prior = prevTier.current;
    prevTier.current = cur;
    if (!prior) return; // first render: record baseline, never reveal on load
    if (cur.stage > prior.stage || (cur.immolated && !prior.immolated)) {
      setReveal({ kind: "tier", acolyte: a, prevStage: prior.stage });
    }
  }, [a.exists, a.stage, a.isImmolated, a]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-text leading-none">The Forge</h2>
        <p className="text-text-3 text-xs mt-1 uppercase tracking-widest">Forge your Acolyte</p>
      </div>

      {/* Full-width page of DETACHED boxes: Acolyte top-left + How-it-works
          top-right rail, with Stake + Burn side by side beneath the Acolyte.
          Stacks on mobile in reading order: Acolyte → guide → Stake → Burn. */}
      <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4 lg:space-y-0">
        {/* ACOLYTE, top-left horizontal banner (the Emberkeeper voice folded in). */}
        <Card className="relative overflow-hidden lg:col-start-1 lg:row-start-1">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
            style={{ background: "radial-gradient(60% 80% at 50% 100%, var(--color-brand)1f, transparent 70%)" }}
          />
          <div className="relative space-y-3">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <ForgeHero acolyte={a} size={150} />
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="font-display text-2xl text-brand">
                    {a.exists ? acolyteName(a.stage) : "None yet"}
                  </span>
                  {a.exists ? <Badge tone="brand">{a.multiplier}× yield</Badge> : <Badge>No Acolyte yet</Badge>}
                  {a.isLP && <Badge tone="brand">LP</Badge>}
                  {a.isImmolated && <Badge tone="danger">Immolated</Badge>}
                </div>
              </div>
              <div id="forge-ladder" className="w-full min-w-0 flex-1 space-y-3 scroll-mt-24">
                <StageLadder a={a} />
                <ProgressBar
                  value={toNumber(a.cumulativeBurnWeight) / toNumber(STAGES[4].threshold)}
                  label={
                    a.stage >= 4
                      ? `Pyre Acolyte reached · ${formatToken(a.cumulativeBurnWeight)} burned, the highest tier (3×)`
                      : `${formatToken(STAGES[4].threshold - a.cumulativeBurnWeight)} $PYRE to Pyre Acolyte, the 3× max`
                  }
                />
                {a.stage < 4 && <p className="text-text-3 text-xs">Next tier: {tier.label}</p>}
              </div>
            </div>
            <p className="border-t border-surface-3/50 pt-2.5 text-center text-sm italic text-text-2">
              <span className="text-brand not-italic">Emberkeeper:</span> &ldquo;{floorLine(a, p)}&rdquo;
            </p>
          </div>
        </Card>

        {/* HOW THE FORGE WORKS, its own detached box, top-right rail. */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <HowItWorks />
        </div>

        {/* STAKE + BURN, two detached boxes side by side, beneath the Acolyte. */}
        <div className="grid items-start gap-4 sm:grid-cols-2 lg:col-start-1 lg:row-start-2">
        {/* STAKE */}
        <Card id="forge-stake" highlight={flash === "stake"} className="space-y-3">
          <BoxHeader glyph="◈" title="Stake" sub="Earn $ETH · stop the decay" />
          <Disclosure summary="What does staking do?">
            <p>
              Unstaked $PYRE slowly <span className="text-danger">decays</span>. Staking locks it
              safe from decay and earns you <span className="text-text">$ETH</span>.
            </p>
            <p>
              Your $ETH yield is multiplied by your Acolyte&rsquo;s stage, so staking is what your
              burns actually pay off on. Unstaking returns your $PYRE slowly over 7 days.
            </p>
          </Disclosure>
          <StakeRitual p={p} decay={decay} />
          <ClaimRow pending={p.pendingRewardsEth} />
        </Card>

        {/* BURN */}
        <Card id="forge-burn" highlight={flash === "burn"} className="space-y-3">
          <BoxHeader glyph="🔥" title="Burn" sub="Level your Acolyte → more yield" />
          <Disclosure summary="What does burning do?">
            <p>
              Burning $PYRE is <span className="text-danger">permanent</span>. It levels your
              Acolyte up the ladder, raising your yield multiplier toward 3×.
            </p>
            <p>
              That multiplier only applies to <span className="text-text">staked</span> $PYRE, a
              burn on its own earns nothing. Stake first, then burn to multiply it.
            </p>
            <p>
              <span className="text-text">Burn LP (+20%)</span> pairs your $PYRE with $ETH, adds it
              to the pool and locks it there forever, a bigger sacrifice, so a bigger bonus.
            </p>
          </Disclosure>
          {a.stage >= 4 ? (
            <div className="rounded-md bg-surface-2 px-3 py-2 text-center text-xs text-text-2">
              You&rsquo;re at <span className="text-brand">PYRE</span>, the highest stage (3×).
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-3 uppercase tracking-wider">Progress to next stage</span>
                <span className="tabular text-text-2">{tier.short}</span>
              </div>
              <ProgressBar value={tier.pct} />
            </div>
          )}
          <BurnRitual
            p={p}
            a={a}
            onStakeFirst={stakeFirst}
            onLpBurned={() => setReveal({ kind: "lp", acolyte: a })}
          />
        </Card>
        </div>
      </div>

      {/* The cinematic (scaffold). Portaled full-screen; see forge-reveal.tsx. */}
      {reveal && <ForgeReveal data={reveal} onClose={() => setReveal(null)} />}

      {/* MOCK-ONLY: preview each cinematic on demand (the Forge is inert in the
          sealed pre-launch preview, so this control is portaled to escape it).
          Never ships, gated on USE_MOCK. */}
      {USE_MOCK &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-3 left-1/2 z-[70] -translate-x-1/2 flex gap-2">
            <button
              onClick={() =>
                setReveal({ kind: "tier", acolyte: a, prevStage: Math.max(0, (a.stage || 1) - 1) })
              }
              className="rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-xs px-3 py-1.5 shadow-panel backdrop-blur hover:border-brand hover:text-brand transition-colors"
            >
              ▶ Tier reveal
            </button>
            <button
              onClick={() => setReveal({ kind: "lp", acolyte: a })}
              className="rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-xs px-3 py-1.5 shadow-panel backdrop-blur hover:border-danger hover:text-danger transition-colors"
            >
              ▶ LP reveal
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}

/* ======================================================================== */
/* Shared scene pieces                                                       */
/* ======================================================================== */

/* A plain card, the building block of the separated layout. Can carry an id
   (for deep-link scroll) and a transient highlight ring. */
function Card({
  children,
  className = "",
  id,
  highlight = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  highlight?: boolean;
}) {
  return (
    <div
      id={id}
      className={`rounded-panel border bg-surface p-4 shadow-panel transition-all duration-base ${
        highlight ? "border-brand ring-2 ring-brand/40" : "border-surface-3/60"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* The header of a box: glyph + plain name + one-line purpose. */
function BoxHeader({ glyph, title, sub }: { glyph: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-surface-3/50 pb-2">
      <span className="text-2xl" aria-hidden>
        {glyph}
      </span>
      <div className="leading-tight">
        <div className="font-display text-xl text-text">{title}</div>
        <div className="text-text-3 text-[11px] uppercase tracking-widest">{sub}</div>
      </div>
    </div>
  );
}

/* A subtle, collapsible "what is this?" disclosure (native <details>, no JS). */
function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-md border border-surface-3/50 bg-surface-2/50">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 text-xs text-text-3 hover:text-text-2 [&::-webkit-details-marker]:hidden">
        <span className="text-brand" aria-hidden>
          ⓘ
        </span>
        <span>{summary}</span>
        <span className="ml-auto text-text-3 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <div className="space-y-1.5 px-3 pb-3 text-xs leading-relaxed text-text-2">{children}</div>
    </details>
  );
}

/* A warning / info callout, used to stop the "burn with nothing staked" footgun. */
function Callout({
  tone = "warn",
  title,
  children,
  action,
}: {
  tone?: "warn" | "danger" | "info";
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const tones: Record<string, string> = {
    warn: "border-warning/40 bg-warning/10",
    danger: "border-danger/40 bg-danger/10",
    info: "border-brand/30 bg-brand/[0.06]",
  };
  const titleTone: Record<string, string> = {
    warn: "text-warning",
    danger: "text-danger",
    info: "text-brand",
  };
  return (
    <div className={`rounded-md border px-3 py-2.5 ${tones[tone]}`}>
      {title && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${titleTone[tone]}`}>
          <span aria-hidden>⚠</span>
          {title}
        </div>
      )}
      <div className="mt-1 text-xs leading-relaxed text-text-2">{children}</div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* The step-by-step the Forge needs: the loop, in order, in plain words. */
function HowItWorks() {
  const steps = [
    {
      t: "Stake your $PYRE",
      d: "Staking stops it from decaying and starts earning you $ETH.",
    },
    {
      t: "Burn $PYRE to forge your Acolyte",
      d: "Each burn levels your Acolyte, EMBER → FLAME → FORGE → PYRE, raising your yield multiplier from 1× up to 3×.",
    },
    {
      t: "The multiplier only boosts STAKED $PYRE",
      d: "A higher Acolyte multiplies the $ETH yield on what you've staked. Burn with nothing staked and there's nothing to multiply, so stake first, then burn.",
    },
  ];
  return (
    <details open className="group rounded-panel border border-surface-3/60 bg-surface-2/40">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-2.5 text-sm text-text-2 hover:text-text [&::-webkit-details-marker]:hidden">
        <span className="text-brand" aria-hidden>
          ⓘ
        </span>
        <span className="font-medium">How the Forge works</span>
        <span className="ml-auto text-text-3 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <ol className="space-y-2.5 px-4 pb-4 pt-1">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-brand/40 bg-brand/10 text-xs text-brand">
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="text-sm text-text leading-tight">{s.t}</div>
              <div className="text-xs text-text-2 leading-snug">{s.d}</div>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-surface-3/50 px-4 py-2 text-[11px] text-text-3">
        Burning is permanent. <span className="text-text-2">Burn LP (+20%)</span> pairs your $PYRE
        with $ETH and locks it in the pool forever for a larger bonus.
      </p>
    </details>
  );
}

/* The hero: your Acolyte (or the unforged ember). Size adapts to context. */
function ForgeHero({ acolyte, size = 150 }: { acolyte: Acolyte; size?: number }) {
  if (acolyte.exists) {
    return (
      <div className="animate-entry">
        <AcolyteArt acolyte={acolyte} size={size} />
      </div>
    );
  }
  return (
    <div
      className="relative grid place-items-center rounded-lg border border-surface-3"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 50% 70%, var(--color-stage-ember)33, var(--color-surface) 72%)",
      }}
    >
      <GameIcon name="ember" size={Math.round(size * 0.5)} className="opacity-40 animate-pulse grayscale" />
      <span className="absolute bottom-2 text-text-3 text-[10px] uppercase tracking-widest">none yet</span>
    </div>
  );
}

/* The ladder: all four stages at once, the climb to PYRE made visible. */
function StageLadder({ a }: { a: Acolyte }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {([1, 2, 3, 4] as Stage[]).map((s) => {
        const reached = a.cumulativeBurnWeight >= STAGES[s].threshold;
        const current = a.exists && a.stage === s;
        const max = s === 4;
        const tone = current ? "text-brand" : reached ? "text-text-2" : "text-text-3";
        return (
          <div key={s} className={`flex flex-col items-center text-center gap-0.5 ${tone}`}>
            <span
              className={`grid h-10 w-10 place-items-center rounded-full ${
                current ? "ring-2 ring-brand bg-brand/10" : ""
              }`}
            >
              {reached || current ? (
                <GameIcon name={tierCrest(s)} size={36} alt={STAGES[s].name} />
              ) : (
                <GameIcon name="lock" size={22} className="opacity-70" />
              )}
            </span>
            <span className="font-display text-xs leading-none">{STAGES[s].name}</span>
            <span className="tabular text-[10px]">{STAGES[s].multiplier}×</span>
            <span className="tabular text-[10px] text-text-3">{compactPyre(toNumber(STAGES[s].threshold))}</span>
          </div>
        );
      })}
    </div>
  );
}

function compactPyre(n: number): string {
  return n >= 1000 ? `${n / 1000}K` : `${n}`;
}

/* The reward: claim the $ETH your stake has earned. */
function ClaimRow({ pending }: { pending: bigint }) {
  const claim = useClaimStakingRewards();
  if (pending <= 0n) return null;
  return (
    <Button variant="ghost" className="w-full" disabled={claim.isPending} onClick={() => claim.mutate()}>
      {claim.isPending ? "Claiming…" : `Claim ${formatEth(pending)}`}
    </Button>
  );
}

/* A shared "you have no $PYRE" nudge. */
function BuyNudge({ message }: { message: string }) {
  return (
    <div className="rounded-md bg-surface-2 border border-surface-3/60 p-3 space-y-2">
      <p className="text-text-2 text-sm">{message}</p>
      <NavCta to="exchange">Buy $PYRE</NavCta>
    </div>
  );
}

/* Balance + quick-fill row that sits directly above an amount input. It answers
   "how much do I have?" (the balance is shown right by the field) and removes the
   typing with 10 / 25 / 50 / 75% / Max buttons. `balance` is the spendable amount
   the buttons divide and Max targets. */
function AmountControls({
  balance,
  onPick,
  label = "Wallet",
  suffix = "$PYRE",
}: {
  balance: bigint;
  onPick: (v: string) => void;
  label?: string;
  suffix?: string;
}) {
  const pick = (v: bigint) => onPick(toAmountString(v));
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <span className="text-text-3 text-[11px] uppercase tracking-wider">
        {label}{" "}
        <button
          type="button"
          onClick={() => pick(balance)}
          className="tabular text-text-2 normal-case hover:text-brand"
          title="Use full balance"
        >
          {formatToken(balance)} {suffix}
        </button>
      </span>
      <div className="flex gap-1">
        {[10, 25, 50, 75].map((p) => (
          <QuickBtn key={p} onClick={() => pick(percentOf(balance, p))}>
            {p}%
          </QuickBtn>
        ))}
        <QuickBtn onClick={() => pick(balance)}>Max</QuickBtn>
      </div>
    </div>
  );
}

function QuickBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-sm border border-surface-3 bg-surface-2 px-2 py-1 text-[11px] text-text-2 transition-colors duration-fast hover:border-brand/60 hover:text-brand"
    >
      {children}
    </button>
  );
}

/* ======================================================================== */
/* The actions                                                              */
/* ======================================================================== */

/* Burn → forge/level the Acolyte. */
function BurnRitual({
  p,
  a,
  onStakeFirst,
  onLpBurned,
}: {
  p: StakingPosition;
  a: Acolyte;
  onStakeFirst: () => void;
  /** Fired once when an LP burn confirms, so the Forge can play the LP cinematic. */
  onLpBurned?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [lp, setLp] = useState(false);
  const [eth, setEth] = useState("");
  const [ack, setAck] = useState(false);
  const burn = useBurnTokens();
  const burnLP = useBurnLP();
  const amt = parseToken(amount);

  // The LP burn is its own cinematic moment (bigger, permanent sacrifice).
  const lpFired = useRef(false);
  useEffect(() => {
    if (burnLP.isSuccess && !lpFired.current) {
      lpFired.current = true;
      onLpBurned?.();
    }
    if (!burnLP.isSuccess) lpFired.current = false; // reset for the next LP burn
  }, [burnLP.isSuccess, onLpBurned]);

  if (p.liquidBalance <= 0n) {
    return <BuyNudge message="You have no $PYRE to burn. Buy some, then come back to level your Acolyte." />;
  }

  // The footgun: a burn raises your multiplier, but yield only accrues on STAKED
  // $PYRE. With nothing staked, a burn (especially a permanent LP burn) earns
  // nothing, so we warn loudly and require an explicit acknowledgement.
  const noStake = p.stakedBalance <= 0n;
  // An LP burn pairs $PYRE WITH $ETH, both are required. Burning "LP" with zero
  // $ETH is just a plain burn and must be blocked.
  const ethAmt = parseToken(eth);
  const lpMissingEth = lp && ethAmt <= 0n;
  const blocked = amt <= 0n || lpMissingEth || (noStake && !ack);

  return (
    <div className="space-y-3">
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

      <div className="space-y-1.5">
        <AmountControls balance={p.liquidBalance} onPick={setAmount} />
        <Field label="$PYRE to burn" value={amount} onChange={setAmount} suffix="$PYRE" />
      </div>
      {lp && <Field label="Paired $ETH" value={eth} onChange={setEth} suffix="$ETH" />}
      {lp && lpMissingEth && amt > 0n && (
        <p className="text-danger text-[11px]">An LP burn must pair $ETH with your $PYRE. Enter an $ETH amount.</p>
      )}
      {lp && (
        <p className="text-text-3 text-[11px]">
          This adds your $PYRE + $ETH to the pool and <span className="text-text-2">locks it there
          permanently</span>, you won&rsquo;t get it back.
        </p>
      )}

      {/* GUARDRAIL, burning with nothing staked. */}
      {noStake && (
        <Callout
          tone="warn"
          title="You have nothing staked"
          action={
            <Button variant="ghost" className="!px-3 !py-1.5 text-xs" onClick={onStakeFirst}>
              Stake first →
            </Button>
          }
        >
          The multiplier only boosts <span className="text-text">staked</span> $PYRE. This burn will
          level your Acolyte but earn you <span className="text-text">no extra yield</span> until you
          stake{lp ? ", and the LP you burn is locked forever" : ""}.
          <label className="mt-2 flex items-start gap-2 text-text-2">
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              className="mt-0.5 shrink-0"
              style={{ accentColor: "var(--color-brand)" }}
            />
            <span>Burn anyway, I understand it earns no yield until I stake.</span>
          </label>
        </Callout>
      )}

      {lp ? (
        <TxImageButton
          tx={burnLP}
          name="burnlp"
          label="Burn LP (+20%)"
          disabled={blocked}
          onClick={() => burnLP.mutate({ eth: ethAmt, pyre: amt })}
        />
      ) : (
        <TxImageButton tx={burn} name="burn" label="Burn $PYRE" disabled={blocked} onClick={() => burn.mutate(amt)} />
      )}

      {a.stage >= 4 && (
        <p className="text-text-3 text-xs text-center">You&rsquo;re at PYRE (3×), the highest stage.</p>
      )}
    </div>
  );
}

/* Stake / unstake (and the slow unstaking return). */
function StakeRitual({ p, decay }: { p: StakingPosition; decay?: string }) {
  const [amount, setAmount] = useState("");
  const stake = useStake();
  const unstake = useUnstake();
  const amt = parseToken(amount);

  // THE WARDING (staking experience). The fire grows with the amount; a fast
  // in-panel flourish plays on a successful stake. We capture the totals at click
  // time so the count-up is correct regardless of refetch timing.
  const [warding, setWarding] = useState<{ from: number; to: number } | null>(null);
  const pending = useRef<{ from: number; to: number } | null>(null);
  const wardedFired = useRef(false);
  useEffect(() => {
    if (stake.isSuccess && !wardedFired.current && pending.current) {
      wardedFired.current = true;
      setWarding(pending.current);
      playStakeWard();
      setAmount("");
    }
    if (!stake.isSuccess) wardedFired.current = false;
  }, [stake.isSuccess]);

  if (p.drip) return <DripPanel drip={p.drip} />;

  if (p.liquidBalance <= 0n && p.stakedBalance <= 0n) {
    return <BuyNudge message="Nothing to stake yet. Buy $PYRE, then stake it to earn $ETH and stop the decay." />;
  }

  const onStake = () => {
    const from = toNumber(p.stakedBalance);
    pending.current = { from, to: from + toNumber(amt) };
    stake.mutate(amt);
  };

  return (
    <div className="relative space-y-3">
      <p className="text-text-3 text-xs">
        Staking locks your $PYRE: it stops decaying and earns $ETH, multiplied by your Acolyte&rsquo;s
        stage.
      </p>
      <StakeHearth
        staked={p.stakedBalance}
        unstaked={p.liquidBalance}
        pendingEth={p.pendingRewardsEth}
        addingTokens={toNumber(amt)}
        decay={decay}
      />
      <div className="space-y-1.5">
        <AmountControls balance={p.liquidBalance} onPick={setAmount} />
        <Field label="$PYRE to stake" value={amount} onChange={setAmount} suffix="$PYRE" />
      </div>
      <div className="grid grid-cols-2 items-start gap-3">
        <TxImageButton
          tx={stake}
          name="stakepyre"
          label="Stake $PYRE"
          disabled={amt <= 0n}
          onClick={onStake}
        />
        <TxImageButton
          tx={unstake}
          name="unstake"
          label="Unstake, returns over 7 days"
          disabled={amt <= 0n}
          onClick={() => unstake.mutate(amt)}
        />
      </div>

      {warding && (
        <StakeWarding fromTokens={warding.from} toTokens={warding.to} onDone={() => setWarding(null)} />
      )}
    </div>
  );
}

function DripPanel({ drip }: { drip: NonNullable<StakingPosition["drip"]> }) {
  const claimDrip = useClaimDrip();
  const pct =
    toNumber(drip.total) === 0 ? 0 : 1 - toNumber(drip.total - drip.claimed) / toNumber(drip.total);
  return (
    <div className="space-y-3 rounded-md border border-danger/40 bg-danger/5 p-3">
      <Badge tone="danger">Unstaking in progress</Badge>
      <p className="text-text-2 text-sm">
        {formatToken(drip.total)} $PYRE is being returned over 7 days, and it keeps decaying until it
        lands. You can&rsquo;t stake again until it completes.
      </p>
      <ProgressBar value={pct} label="Return progress" />
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Claimable now" value={formatToken(drip.claimable)} />
        <Stat label="Lost to decay" value={`≈ ${formatToken(drip.decayLoss)}`} sub="the cost of leaving" />
      </div>
      <TxButton tx={claimDrip} onClick={() => claimDrip.mutate()}>
        Claim returned $PYRE
      </TxButton>
    </div>
  );
}

/* ======================================================================== */
/* helpers                                                                   */
/* ======================================================================== */

/* Progress to the next stage + the reward there. `.short` = compact teaser. */
function tierInfo(a: Acolyte): { pct: number; label: string; short: string } {
  if (!a.exists) {
    const target = STAGES[1].threshold;
    const rem = target > a.cumulativeBurnWeight ? target - a.cumulativeBurnWeight : 0n;
    return {
      pct: toNumber(a.cumulativeBurnWeight) / toNumber(target),
      label: `Burn ${formatToken(rem)} $PYRE to forge your Acolyte · EMBER (1×)`,
      short: `${formatToken(rem)} to EMBER`,
    };
  }
  if (a.nextStageThreshold) {
    const next = Math.min(4, a.stage + 1) as Stage;
    const rem = a.nextStageThreshold - a.cumulativeBurnWeight;
    return {
      pct: toNumber(a.cumulativeBurnWeight) / toNumber(a.nextStageThreshold),
      label: `Burn ${formatToken(rem)} $PYRE to reach ${STAGES[next].name} (${STAGES[next].multiplier}×)`,
      short: `${formatToken(rem)} to ${STAGES[next].name} (${STAGES[next].multiplier}×)`,
    };
  }
  return { pct: 1, label: `Pyre, the highest tier (${STAGES[4].multiplier}×)`, short: "PYRE · 3×" };
}

/* The Emberkeeper reacts to where you stand, narration, not status text. */
function floorLine(a: Acolyte, p: StakingPosition): string {
  if (!a.exists && p.liquidBalance <= 0n && p.stakedBalance <= 0n)
    return "You don't have any $PYRE yet. Get some to get started.";
  if (!a.exists) return "Burn $PYRE to create your Acolyte NFT. 10,000 unlocks the first tier.";
  if (a.stage >= 4) return "You've reached Pyre, the top tier. Nicely done.";
  if (p.stakedBalance <= 0n)
    return "Your Acolyte earns nothing while your $PYRE is unstaked. Stake it to start earning $ETH.";
  return `You're at ${a.stageName}. Burn more to reach ${STAGES[Math.min(4, a.stage + 1) as Stage].name}. The top tier is Pyre (3× yield).`;
}
