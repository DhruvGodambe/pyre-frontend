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
  useStake,
  useUnstake,
  useClaimDrip,
  useBurnTokens,
  useBurnLP,
} from "@/lib/hooks";
import { useNavigation } from "@/lib/navigation";
import { Panel, Stat, Field, ProgressBar, Badge, Button, SegmentedControl } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { TxButton, TxImageButton } from "@/components/ui/tx-button";
import { NavCta } from "@/components/ui/nav-cta";
import { AcolyteArt } from "@/components/ui/acolyte-art";
import { GameIcon, tierCrest } from "@/components/ui/game-icon";
import { ForgeReveal, type RevealData } from "@/components/ui/forge-reveal";
import { StakeWarding } from "@/components/ui/stake-warding";
import { playStakeWard } from "@/lib/sfx";
import { RequireWallet } from "@/components/ui/wallet-gate";
import { USE_MOCK } from "@/lib/config";
import {
  formatToken,
  parseToken,
  toNumber,
  toAmountString,
  percentOf,
} from "@/lib/format";
import {
  STAGES,
  acolyteName,
  LP_BURN_BONUS,
  IMMOLATED_TIER_NAME,
  IMMOLATED_MULTIPLIER,
  type Stage,
} from "@/lib/constants";
import type { Acolyte, StakingPosition } from "@/lib/types";

export function ForgePanel() {
  const position = useStakingPosition();
  const acolyte = useAcolyte();

  return (
    <RequireWallet message="Connect to enter the Forge.">
      <StateView query={position}>
        {(p) => (
          <StateView query={acolyte}>
            {(a) => <ForgeScene a={a} p={p} />}
          </StateView>
        )}
      </StateView>
    </RequireWallet>
  );
}

/* ======================================================================== */
/* THE SCENE, banner + the two boxes, all on one page                       */
/* ======================================================================== */
function ForgeScene({ a, p }: { a: Acolyte; p: StakingPosition }) {
  const { pending, clearPending } = useNavigation();
  // Path is chosen in the Burn step but lifted here so the Acolyte step's locked
  // preview can mirror the path you're about to forge.
  const [path, setPath] = useState<"tokens" | "lp" | null>(null);
  const staked = p.stakedBalance > 0n;
  const hasAcolyte = a.exists;
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

  // FORGE REVEAL cinematic (scaffold). A tier reveal fires whenever a burn crosses
  // a tier / mints the first Acolyte / reaches Immolated, on EITHER path. The reveal
  // reads the Acolyte's own isLP flag, so an LP burn that crosses a tier shows the LP
  // tier reveal (doubled multipliers). See components/ui/forge-reveal.tsx.
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const prevTier = useRef<{ stage: number; immolated: boolean } | null>(null);
  useEffect(() => {
    const cur = { stage: a.exists ? a.stage : 0, immolated: a.isImmolated };
    const prior = prevTier.current;
    prevTier.current = cur;
    if (!prior) return; // first render: record baseline, never reveal on load
    if (cur.stage > prior.stage || (cur.immolated && !prior.immolated)) {
      setReveal({ acolyte: a, prevStage: prior.stage });
    }
  }, [a.exists, a.stage, a.isImmolated, a]);

  return (
    <Panel
      title="The Forge"
      tagline="Forge your Acolyte"
      frame="forged"
      bg="stone"
      className="w-full"
      action={
        <p className="hidden max-w-md items-center gap-2 text-right text-xs italic text-text-2 sm:flex">
          <span className="not-italic text-brand shrink-0">Emberkeeper</span>
          <span aria-hidden className="text-text-3">·</span>
          <span>&ldquo;{floorLine(a, p)}&rdquo;</span>
        </p>
      }
    >
      <div className="space-y-3">
        {/* THE ACOLYTE, a horizontal status banner across the top: art + the tier
            ladder + progress. Your standing at a glance. */}
        <AcolyteBanner a={a} />

      {/* STAKE (left) and BURN (right), the two actions side by side. Burn stays
          locked (visible but ghosted) until you've staked. */}
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <Step
          index={1}
          id="forge-stake"
          title="Stake $PYRE"
          sub="Earn $ETH · stop the decay"
          done={staked}
          flash={flash === "stake"}
        >
          <StakeRitual p={p} />
        </Step>

        <Step
          index={2}
          id="forge-burn"
          title="Choose your path & burn"
          sub="Forge your Acolyte"
          locked={!staked}
          done={hasAcolyte}
          flash={flash === "burn"}
          lockHint="Stake first to unlock burning"
          preview={<PathChooser path={null} onPick={() => {}} />}
        >
          <BurnRitual p={p} a={a} path={path} setPath={setPath} />
        </Step>
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
                setReveal({
                  acolyte: { ...a, isLP: false, exists: true, stage: (a.stage || 1) as Stage },
                  prevStage: Math.max(0, (a.stage || 1) - 1),
                })
              }
              className="rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-xs px-3 py-1.5 shadow-panel backdrop-blur hover:border-brand hover:text-brand transition-colors"
            >
              ▶ Tier reveal
            </button>
            <button
              onClick={() =>
                setReveal({
                  acolyte: { ...a, isLP: true, exists: true, stage: (a.stage || 1) as Stage },
                  prevStage: Math.max(0, (a.stage || 1) - 1),
                })
              }
              className="rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-xs px-3 py-1.5 shadow-panel backdrop-blur hover:border-danger hover:text-danger transition-colors"
            >
              ▶ LP tier reveal
            </button>
          </div>,
          document.body
        )}
    </Panel>
  );
}

/* ======================================================================== */
/* Shared scene pieces                                                       */
/* ======================================================================== */

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

/* The ladder: the four Acolyte tiers, the climb from EMBER to PYRE made visible.
   Each tier shows BOTH paths' yield, the plain-burn multiplier and the LP one
   (2× it), since the user hasn't committed to a path yet. All four thresholds come
   from cumulative burn weight (shared by both paths). Immolated is NOT a tier here:
   it is a prestige earned via the Ascend rite in the Hall, so it lives there. */
function StageLadder({ a }: { a: Acolyte }) {
  return (
    <div className="grid grid-cols-4 gap-1">
      {([1, 2, 3, 4] as Stage[]).map((s) => {
        const reached = a.cumulativeBurnWeight >= STAGES[s].threshold;
        const current = a.exists && a.stage === s;
        const tone = current ? "text-brand" : reached ? "text-text-2" : "text-text-3";
        const lpMult = Math.round(STAGES[s].multiplier * LP_BURN_BONUS * 100) / 100;
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
            {/* Both paths' yield, labelled and equal weight (neither is "chosen"). */}
            <span className="tabular text-[10px] leading-tight">
              <span className="text-text-3">Burn</span> {STAGES[s].multiplier}×
              <span className="mx-1 text-text-3">·</span>
              <span className="text-text-3">LP</span> {lpMult}×
            </span>
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

/* A shared "you have no $PYRE" nudge. */
function BuyNudge({ message }: { message: string }) {
  return (
    <div className="forged-card p-3 space-y-2">
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
    <button type="button" onClick={onClick} className="chip !px-2.5 text-[11px]">
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
  path,
  setPath,
}: {
  p: StakingPosition;
  a: Acolyte;
  path: "tokens" | "lp" | null;
  setPath: (p: "tokens" | "lp") => void;
}) {
  const [amount, setAmount] = useState("");
  const [eth, setEth] = useState("");
  // The path is chosen (lifted state); the amount + burn controls stay hidden
  // until one is picked, so a path is always a deliberate choice. A crossed tier
  // triggers the tier reveal up in ForgeScene (LP or plain, per the Acolyte).
  const lp = path === "lp";
  const burn = useBurnTokens();
  const burnLP = useBurnLP();
  const amt = parseToken(amount);

  if (p.liquidBalance <= 0n) {
    return <BuyNudge message="You have no $PYRE to burn. Buy some, then come back to level your Acolyte." />;
  }

  // An LP burn pairs $PYRE WITH $ETH, both are required. Burning "LP" with zero
  // $ETH is just a plain burn and must be blocked. (The stake gate is enforced one
  // level up by the Burn step, which stays locked until you've staked.)
  const ethAmt = parseToken(eth);
  const lpMissingEth = lp && ethAmt <= 0n;
  const overBalance = amt > p.liquidBalance;
  const blocked = amt <= 0n || lpMissingEth || overBalance;

  return (
    <div className="space-y-3">
      <PathChooser path={path} onPick={setPath} />

      {path && (
        <>
          <div className="space-y-1.5">
            <AmountControls balance={p.liquidBalance} onPick={setAmount} />
            <Field label="$PYRE to burn" value={amount} onChange={setAmount} suffix="$PYRE" />
          </div>
          {overBalance && (
            <p className="text-danger text-[11px]">More than your wallet balance.</p>
          )}
          {lp && <Field label="Paired $ETH" value={eth} onChange={setEth} suffix="$ETH" />}
          {lp && lpMissingEth && amt > 0n && (
            <p className="text-danger text-[11px]">An LP burn must pair $ETH with your $PYRE. Enter an $ETH amount.</p>
          )}
          {lp && (
            <div className="forged-card px-3 py-2 text-[11px] text-text-3 space-y-1">
              <p>
                <span className="text-brand">2× the $ETH yield</span> of a plain-burn Acolyte of
                the same tier.
              </p>
              <p>
                Forges the <span className="text-text-2">exclusive LP Acolyte</span>, rarer and distinct
                from plain-burn ones.
              </p>
              <p>Same tiers: burn the same amounts to climb.</p>
              <p>
                Your $PYRE + $ETH are added to the pool and{" "}
                <span className="text-text-2">locked there permanently</span>, you won&rsquo;t get them
                back.
              </p>
            </div>
          )}

          {lp ? (
            <TxImageButton
              tx={burnLP}
              name="burnlp"
              label="Burn LP (2×)"
              disabled={blocked}
              onClick={() => burnLP.mutate({ eth: ethAmt, pyre: amt })}
              size="lg"
            />
          ) : (
            <TxImageButton
              tx={burn}
              name="burntokens"
              label="Burn $PYRE"
              disabled={blocked}
              onClick={() => burn.mutate(amt)}
              size="lg"
            />
          )}
        </>
      )}

      {a.stage >= 4 && (
        <p className="text-text-3 text-xs text-center">You&rsquo;re at PYRE (3×), the highest stage.</p>
      )}
    </div>
  );
}

/* CHOOSE YOUR PATH: two matched cards, one of which the user must actively pick
   before any amount/burn control appears. No default selection, so a path is
   always a deliberate choice. "Burn Tokens" is the direct path; "Burn LP" is the
   deeper, permanent path worth 2× the yield. */
function PathChooser({
  path,
  onPick,
}: {
  path: "tokens" | "lp" | null;
  onPick: (p: "tokens" | "lp") => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="eyebrow">Choose your path</div>
      <div className="grid grid-cols-2 gap-2">
        <PathCard
          selected={path === "tokens"}
          onClick={() => onPick("tokens")}
          title="Burn Tokens"
          tagline="The direct path"
          yieldLabel="1× → 3× yield"
          desc="Burn $PYRE on its own to forge and climb the tiers."
        />
        <PathCard
          selected={path === "lp"}
          onClick={() => onPick("lp")}
          title="Burn LP"
          badge="6×"
          tagline="The deeper path"
          yieldLabel="2× → 6× yield"
          desc="Pair $PYRE + $ETH, locked forever. A rarer Acolyte."
        />
      </div>
    </div>
  );
}

/* One selectable path card. Selected = brand ring + check; unselected is quiet
   until hover. Matches the token-driven card language used across the Forge. */
function PathCard({
  selected,
  onClick,
  title,
  tagline,
  yieldLabel,
  desc,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  tagline: string;
  yieldLabel: string;
  desc: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative flex flex-col gap-1.5 rounded-md border px-3 py-3 text-left transition-colors ${
        selected
          ? "border-brand bg-brand/10 ring-1 ring-brand/40"
          : "border-surface-3 bg-surface-2/40 hover:border-brand/50 hover:bg-surface-2/70"
      }`}
    >
      {selected && (
        <span
          className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-brand text-[10px] text-bg"
          aria-hidden
        >
          ✓
        </span>
      )}
      <div className="flex items-center gap-2">
        <GameIcon name="fireToken" size={26} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-sm leading-none text-text">{title}</span>
            {badge && (
              <span className="rounded-sm bg-brand/20 px-1 text-[10px] font-medium text-brand">{badge}</span>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-text-3">{tagline}</div>
        </div>
      </div>
      <div className="text-[11px] text-brand">{yieldLabel}</div>
      <p className="text-[11px] leading-snug text-text-3">{desc}</p>
    </button>
  );
}

/* ======================================================================== */
/* The guided journey: Step + its locked-but-visible preview                 */
/* ======================================================================== */

/* One step in the Forge's flow. Its header shows a number (active), a check
   (done), or a lock (locked). A locked step stays VISIBLE: its body is ghosted so
   you can see what's ahead, with a hint (and optional action) explaining how to
   unlock it. This is the whole point, nothing is hidden, only gated. */
function Step({
  index,
  id,
  title,
  sub,
  locked = false,
  done = false,
  flash = false,
  lockHint,
  lockAction,
  preview,
  children,
}: {
  index: number;
  id?: string;
  title: string;
  sub?: string;
  locked?: boolean;
  done?: boolean;
  flash?: boolean;
  lockHint?: string;
  lockAction?: ReactNode;
  preview?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`orn-box scroll-mt-24 overflow-hidden !p-0 transition-shadow duration-fast ${
        flash ? "ring-1 ring-brand/50" : ""
      } ${locked ? "opacity-90" : ""}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <StepBadge index={index} locked={locked} done={done} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className={`font-display text-lg ${locked ? "text-text-3" : "text-text"}`}>{title}</div>
          {sub && <div className="truncate text-[11px] uppercase tracking-widest text-text-3">{sub}</div>}
        </div>
      </div>
      <hr className="ember-hairline" />
      <div className="px-4 py-3">
        {locked ? (
          <LockedPreview hint={lockHint} action={lockAction}>
            {preview ?? children}
          </LockedPreview>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </div>
    </section>
  );
}

function StepBadge({ index, locked, done }: { index: number; locked: boolean; done: boolean }) {
  if (locked)
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-surface-3 text-text-3">
        <GameIcon name="lock" size={13} alt="Locked" />
      </span>
    );
  if (done) return <GameIcon name="check" size={28} alt="Done" className="shrink-0" />;
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brand/50 bg-brand/10 text-sm text-brand"
      aria-hidden
    >
      {index}
    </span>
  );
}

/* Visible-but-locked: the step's content, ghosted and non-interactive, with a
   centered hint (and optional unlock action) floated on top. */
function LockedPreview({ hint, action, children }: { hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none select-none opacity-30 blur-[1.5px]">
        {children}
      </div>
      <div className="absolute inset-0 grid place-items-center p-2">
        <div className="flex flex-col items-center gap-2.5 rounded-full border border-frame/45 bg-black/65 px-5 py-2.5 text-center shadow-[0_8px_24px_-8px_rgba(0,0,0,0.8)] backdrop-blur-sm">
          {hint && (
            <div className="flex items-center gap-1.5 text-xs text-text-2">
              <GameIcon name="lock" size={13} alt="" />
              {hint}
            </div>
          )}
          {action}
        </div>
      </div>
    </div>
  );
}

/* THE ACOLYTE BANNER: a compact, full-width horizontal strip across the top of
   the Forge. Art on the left, then the tier name, the four-tier ladder and the
   progress bar filling the width. Sits on its own solid surface so it reads
   cleanly over the busy interior, and stays short so nothing has to scale down. */
function AcolyteBanner({ a }: { a: Acolyte }) {
  const forged = a.exists;
  const status = tierInfo(a).short;
  const value = toNumber(a.cumulativeBurnWeight) / toNumber(STAGES[4].threshold);
  const label = a.isImmolated
    ? `Immolated in the Hall, the highest prestige · ${formatToken(a.cumulativeBurnWeight)} burned`
    : a.stage >= 4
      ? `Pyre reached, the top tier · ${formatToken(a.cumulativeBurnWeight)} burned`
      : forged
        ? `${formatToken(STAGES[4].threshold - a.cumulativeBurnWeight)} $PYRE to Pyre, the 3× tier`
        : `Burn $PYRE to forge your Acolyte · Ember at ${compactPyre(toNumber(STAGES[1].threshold))} burned`;
  return (
    <section className="orn-box relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-full"
        style={{ background: "radial-gradient(70% 90% at 50% 100%, var(--color-brand)14, transparent 70%)" }}
      />
      <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
        <ForgeHero acolyte={a} size={96} />
        <div className="w-full min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-lg leading-none text-brand">
              {a.isImmolated ? IMMOLATED_TIER_NAME : forged ? acolyteName(a.stage) : "Unforged"}
            </span>
            {a.isImmolated ? (
              <Badge tone="danger">{IMMOLATED_MULTIPLIER}× yield</Badge>
            ) : forged ? (
              <Badge tone="brand">{a.multiplier}× yield</Badge>
            ) : (
              <Badge>No Acolyte yet</Badge>
            )}
            {a.isLP && <Badge tone="brand">LP</Badge>}
            <span className="tabular ml-auto text-[11px] text-text-3">{status}</span>
          </div>
          <StageLadder a={a} />
          <ProgressBar value={value} label={label} />
          {forged && a.stage >= 4 && !a.isImmolated && (
            <NavCta to="immolated">Take the Ascend rite in the Hall →</NavCta>
          )}
        </div>
      </div>
    </section>
  );
}

/* Stake / unstake (and the slow unstaking return). Stake and Unstake are the two
   directions of ONE control: a mode toggle keeps the amount + Max bound to the
   right balance (wallet for stake, staked for unstake), and Unstake is only shown
   when there's actually something staked to pull from. */
function StakeRitual({ p }: { p: StakingPosition }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"stake" | "unstake">("stake");
  const stake = useStake();
  const unstake = useUnstake();
  const amt = parseToken(amount);
  const hasStaked = p.stakedBalance > 0n;
  const unstaking = mode === "unstake" && hasStaked;

  // THE WARDING (staking experience): a fast in-panel flourish on a successful
  // stake. We capture the totals at click time so the count-up is correct
  // regardless of refetch timing.
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

  const balance = unstaking ? p.stakedBalance : p.liquidBalance;
  const overBalance = amt > balance;
  const blocked = amt <= 0n || overBalance;

  const pick = (m: "stake" | "unstake") => {
    setMode(m);
    setAmount(""); // don't carry an amount across two different balances
  };
  const onStake = () => {
    const from = toNumber(p.stakedBalance);
    pending.current = { from, to: from + toNumber(amt) };
    stake.mutate(amt);
  };

  return (
    <div className="relative space-y-3">
      {/* Stake / Unstake toggle, only when there's a stake to pull from. */}
      {hasStaked && (
        <SegmentedControl
          value={mode}
          onChange={pick}
          ariaLabel="Stake or unstake"
          className="w-full"
          options={[
            { value: "stake", label: "Stake" },
            { value: "unstake", label: "Unstake" },
          ]}
        />
      )}

      <p className="text-text-3 text-xs">
        {unstaking
          ? "Unstaking returns your $PYRE over 7 days, and it keeps decaying until it lands."
          : "Staking locks your $PYRE: it stops decaying and earns $ETH, multiplied by your Acolyte's stage."}{" "}
        Your balances and yield live in the Amber Vault.
      </p>

      <div className="space-y-1.5">
        <AmountControls balance={balance} onPick={setAmount} label={unstaking ? "Staked" : "Wallet"} />
        <Field
          label={unstaking ? "$PYRE to unstake" : "$PYRE to stake"}
          value={amount}
          onChange={setAmount}
          suffix="$PYRE"
        />
      </div>
      {overBalance && (
        <p className="text-danger text-[11px]">More than your {unstaking ? "staked" : "wallet"} balance.</p>
      )}

      {unstaking ? (
        <TxImageButton
          tx={unstake}
          name="unstake"
          label="Unstake · returns over 7 days"
          disabled={blocked}
          onClick={() => unstake.mutate(amt)}
          size="lg"
        />
      ) : (
        <TxImageButton
          tx={stake}
          name="stakepyre"
          label="Stake $PYRE"
          disabled={blocked}
          onClick={onStake}
          size="lg"
        />
      )}

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
