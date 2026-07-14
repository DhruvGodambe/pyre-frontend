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

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  useStakingPosition,
  useAcolyte,
  useStake,
  useUnstake,
  useClaimDrip,
  useBurnTokens,
  useBurnLP,
  usePoolState,
} from "@/lib/hooks";
import { useNavigation } from "@/lib/navigation";
import { Panel, Stat, Field, ProgressBar, Badge, Button } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { TxButton } from "@/components/ui/tx-button";
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
  formatEth,
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

  void hasAcolyte;
  return (
    <>
      <div className="space-y-4">
        {/* THREE separate forged panels (like the Ashen Cup) so the forge interior
            breathes between them: your Acolyte, then Stake + Burn. */}
        <Panel
          title="Your Acolyte"
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
          <AcolyteHero a={a} />
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <div
            id="forge-stake"
            className={`scroll-mt-24 transition-[filter] duration-base ${
              flash === "stake" ? "drop-shadow-[0_0_22px_rgba(240,169,59,0.35)]" : ""
            }`}
          >
            <Panel title="Stake" tagline="Earn $ETH · stop the decay" frame="forged" bg="stone">
              <StakeRitual p={p} />
            </Panel>
          </div>

          <div
            id="forge-burn"
            className={`scroll-mt-24 transition-[filter] duration-base ${
              flash === "burn" ? "drop-shadow-[0_0_22px_rgba(240,169,59,0.35)]" : ""
            }`}
          >
            <Panel title="Burn" tagline="Forge your Acolyte" frame="forged" bg="stone">
              {staked ? (
                <BurnRitual p={p} a={a} path={path} setPath={setPath} />
              ) : (
                <LockedPreview hint="Stake first to unlock burning">
                  <PathChooser path={null} onPick={() => {}} />
                </LockedPreview>
              )}
            </Panel>
          </div>
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
    </>
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
    <div className="orn-box space-y-2">
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
  // The path is chosen (lifted state); the amount + burn controls stay hidden
  // until one is picked, so a path is always a deliberate choice. A crossed tier
  // triggers the tier reveal up in ForgeScene (LP or plain, per the Acolyte).
  const lp = path === "lp";
  const burn = useBurnTokens();
  const burnLP = useBurnLP();
  const pool = usePoolState();
  const amt = parseToken(amount);

  if (p.liquidBalance <= 0n) {
    return <BuyNudge message="You have no $PYRE to burn. Buy some, then come back to level your Acolyte." />;
  }

  // An LP burn pairs your $PYRE WITH $ETH at the current pool ratio. The user only
  // ever enters $PYRE; the paired $ETH is DERIVED from the pool price (never typed),
  // so the pair is always correct. (The stake gate is enforced one level up by the
  // Burn panel, which stays locked until you've staked.)
  const ethPerPyre = pool.data?.pricePyreInEth ?? 0;
  const pyreHuman = parseFloat(amount) || 0;
  const ethHuman = pyreHuman * ethPerPyre;
  const ethAmt = ethHuman > 0 ? parseToken(ethHuman.toFixed(12)) : 0n;
  const ethDisplay = ethHuman > 0 ? formatEth(ethAmt) : "";
  const priceReady = ethPerPyre > 0;
  const overBalance = amt > p.liquidBalance;
  const blocked = amt <= 0n || overBalance || (lp && !priceReady);

  return (
    <div className="space-y-3">
      <PathChooser path={path} onPick={setPath} />

      {path && (
        <>
          <div className="orn-box space-y-2.5">
            <div className="space-y-1.5">
              <AmountControls balance={p.liquidBalance} onPick={setAmount} />
              <Field label="$PYRE to burn" value={amount} onChange={setAmount} suffix="$PYRE" />
            </div>
            {overBalance && (
              <p className="text-danger text-[11px]">More than your wallet balance.</p>
            )}
            {lp && (
              <Field
                label="Paired $ETH"
                value={ethDisplay}
                suffix="$ETH"
                readOnly
                hint={priceReady ? "Auto-paired at the current pool price." : "Fetching the pool price…"}
              />
            )}
          </div>

          {lp ? (
            <TxButton tx={burnLP} onClick={() => burnLP.mutate({ eth: ethAmt, pyre: amt })} disabled={blocked} pendingLabel="Burning…">
              <GameIcon name="flame" size={18} className="mr-2 -mt-0.5" />
              Burn LP (2×)
            </TxButton>
          ) : (
            <TxButton tx={burn} onClick={() => burn.mutate(amt)} disabled={blocked} pendingLabel="Burning…">
              <GameIcon name="flame" size={18} className="mr-2 -mt-0.5" />
              Burn $PYRE
            </TxButton>
          )}
        </>
      )}

      {a.stage >= 4 && (
        <p className="text-text-3 text-xs text-center">You&rsquo;re at PYRE (3×), the highest stage.</p>
      )}
    </div>
  );
}

/* CHOOSE YOUR PATH: two keeper-plate toggle plates (same family as the Stake /
   Unstake toggle), selected = lit skin. The chosen path's details (tagline, yield
   and what it does) show as a caption below, so the info the old cards carried is
   kept without the heavy card layout. "Burn $PYRE" is the direct path; "Burn LP"
   is the deeper, permanent path worth 2× the yield. */
const BURN_PATHS = [
  {
    p: "tokens",
    label: "Burn $PYRE",
    tagline: "The direct path",
    yieldLabel: "1× → 3× yield",
    desc: "Burn $PYRE on its own to forge and climb the tiers.",
  },
  {
    p: "lp",
    label: "Burn LP",
    tagline: "The deeper path",
    yieldLabel: "2× → 6× yield",
    desc: "Pair $PYRE + $ETH, locked forever. A rarer Acolyte.",
  },
] as const;

function PathChooser({
  path,
  onPick,
}: {
  path: "tokens" | "lp" | null;
  onPick: (p: "tokens" | "lp") => void;
}) {
  const active = BURN_PATHS.find((x) => x.p === path) ?? null;
  return (
    <div className="space-y-2">
      <div role="tablist" aria-label="Burn path" className="grid grid-cols-2 gap-3">
        {BURN_PATHS.map(({ p, label }) => {
          const on = path === p;
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onPick(p)}
              className={`forged-btn forged-btn--block ${on ? "forged-btn--on" : ""}`}
            >
              <span>
                <GameIcon name="flame" size={17} className="mr-2 -mt-0.5" />
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {active && (
        <div className="text-center">
          <p className="text-xs">
            <span className="text-text-2">{active.tagline}</span>
            <span className="mx-1.5 text-text-3">·</span>
            <span className="text-brand">{active.yieldLabel}</span>
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-text-3">{active.desc}</p>
        </div>
      )}
    </div>
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
/* The hero of the Forge: your Acolyte art (the Immolated glyph is baked into the
   art), your status at a glance, and a compact tier stepper (replacing the old
   full-width progress bar + dense ladder). */
function AcolyteHero({ a }: { a: Acolyte }) {
  const forged = a.exists;
  const name = a.isImmolated ? IMMOLATED_TIER_NAME : forged ? acolyteName(a.stage) : "Unforged";
  const mult = a.isImmolated ? IMMOLATED_MULTIPLIER : a.multiplier;
  const line = a.isImmolated
    ? `Immolated in the Hall, the highest prestige. ${formatToken(a.cumulativeBurnWeight)} $PYRE burned.`
    : a.stage >= 4
      ? `Pyre reached, the top tier. ${formatToken(a.cumulativeBurnWeight)} $PYRE burned.`
      : forged
        ? `${formatToken(STAGES[4].threshold - a.cumulativeBurnWeight)} $PYRE to Pyre, the top tier.`
        : "Burn $PYRE below to forge your first Acolyte.";
  return (
    <div className="orn-box flex flex-col items-center gap-5 text-center lg:flex-row lg:items-center lg:gap-7 lg:text-left">
      <ForgeHero acolyte={a} size={120} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 lg:justify-start">
          <span className="font-display text-3xl leading-none text-brand">{name}</span>
          {a.isImmolated && (
            <span className="rounded-full border border-brand-soft/50 bg-brand-soft/10 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-brand-soft">
              Immolated
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
          {forged && <HeroChip>{mult}× yield</HeroChip>}
          {a.isLP && <HeroChip>LP variant</HeroChip>}
          {forged && a.stage >= 4 && <HeroChip>Top tier</HeroChip>}
        </div>
        <p className="text-text-3 text-sm">{line}</p>
        {forged && a.stage >= 4 && !a.isImmolated && (
          <NavCta to="immolated" variant="ghost">Take the Ascend rite in the Hall →</NavCta>
        )}
      </div>
      <TierStepper a={a} />
    </div>
  );
}

function HeroChip({ children }: { children: ReactNode }) {
  return (
    <span className="tabular rounded-full border border-frame-strong/50 px-3 py-1 text-xs text-brand">
      {children}
    </span>
  );
}

/* Compact tier stepper: Ember → Flame → Forge → Pyre as small crests with a lit
   connector, the current tier glowing. Doubles as the ladder + the progress. */
function TierStepper({ a }: { a: Acolyte }) {
  return (
    <div className="flex flex-none flex-col items-center gap-2">
      <div className="flex items-center">
        {([1, 2, 3, 4] as Stage[]).map((s, i) => {
          const reached = a.exists ? a.stage >= s : a.cumulativeBurnWeight >= STAGES[s].threshold;
          const current = a.exists && a.stage === s;
          return (
            <Fragment key={s}>
              {i > 0 && (
                <span className={`mb-4 h-0.5 w-4 rounded ${reached ? "bg-brand/60" : "bg-surface-3"}`} />
              )}
              <div className="flex w-11 flex-col items-center gap-1">
                <GameIcon
                  name={tierCrest(s)}
                  size={30}
                  alt={STAGES[s].name}
                  className={
                    current
                      ? "scale-110 drop-shadow-[0_0_8px_rgba(255,140,40,0.6)]"
                      : reached
                        ? ""
                        : "opacity-40 grayscale"
                  }
                />
                <span
                  className={`text-[9px] uppercase tracking-wide ${current ? "text-brand-soft" : "text-text-3"}`}
                >
                  {STAGES[s].name}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
      <span className="text-[11px] text-brand-soft">
        {a.stage >= 4
          ? "★ Top tier reached"
          : a.nextStageThreshold
            ? `${formatToken(a.nextStageThreshold - a.cumulativeBurnWeight)} to next tier`
            : ""}
      </span>
    </div>
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

  // THE WARDING (staking experience): a fast in-box flourish on a successful
  // stake OR unstake. We capture the mode + totals at click time so the count-up
  // reads correctly regardless of refetch timing, and it fires off whichever
  // mutation actually resolved (the panel mode may have changed by then).
  type Ward = { mode: "stake" | "unstake"; from: number; to: number };
  const [warding, setWarding] = useState<Ward | null>(null);
  const pending = useRef<Ward | null>(null);
  const wardedFired = useRef(false);
  useEffect(() => {
    const settled = stake.isSuccess || unstake.isSuccess;
    if (settled && !wardedFired.current && pending.current) {
      wardedFired.current = true;
      setWarding(pending.current);
      playStakeWard();
      setAmount("");
    }
    if (!settled) wardedFired.current = false;
  }, [stake.isSuccess, unstake.isSuccess]);

  // Hold the DripPanel handoff until the unstake flourish finishes: on unstake
  // success `p.drip` populates immediately, so early-returning here would swallow
  // the flourish. Keep the ritual mounted while `warding` runs; onDone clears it
  // and the next render hands off to DripPanel.
  if (p.drip && !warding) return <DripPanel drip={p.drip} />;

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
    pending.current = { mode: "stake", from, to: from + toNumber(amt) };
    stake.mutate(amt);
  };
  const onUnstake = () => {
    const from = toNumber(p.stakedBalance);
    pending.current = { mode: "unstake", from, to: Math.max(0, from - toNumber(amt)) };
    unstake.mutate(amt);
  };

  return (
    <div className="relative space-y-3">
      {/* Stake / Unstake toggle, only when there's a stake to pull from. Built
          from the keeper-plate button family (the app's one button look): the
          chosen side stays lit, the other dims, with a gold rule under the
          active plate. */}
      {hasStaked && (
        <div role="tablist" aria-label="Stake or unstake" className="grid grid-cols-2 gap-3">
          {([
            { m: "stake", label: "Stake" },
            { m: "unstake", label: "Unstake" },
          ] as const).map(({ m, label }) => {
            const on = mode === m;
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => pick(m)}
                className={`forged-btn forged-btn--block ${on ? "forged-btn--on" : ""}`}
              >
                <span>
                  <GameIcon name="fireToken" size={17} className="mr-2 -mt-0.5" />
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="text-text-3 text-xs">
        {unstaking
          ? "Unstaking returns your $PYRE over 7 days, and it keeps decaying until it lands."
          : "Staking locks your $PYRE: it stops decaying and earns $ETH, multiplied by your Acolyte's stage."}{" "}
        Your balances and yield live in the Amber Vault.
      </p>

      {/* The input box doubles as the stage for the warding flourish: on a
          successful stake/unstake the overlay fills THIS box (framed by its
          ornamental rim) instead of the whole panel. It grows to hold the chest
          so nothing clips. */}
      <div
        className={`orn-box relative space-y-2.5 transition-[min-height] duration-500 ${warding ? "min-h-[20rem]" : ""}`}
      >
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

        {warding && (
          <StakeWarding
            mode={warding.mode}
            fromTokens={warding.from}
            toTokens={warding.to}
            onDone={() => setWarding(null)}
          />
        )}
      </div>

      {unstaking ? (
        <TxButton tx={unstake} onClick={onUnstake} disabled={blocked} pendingLabel="Unstaking…">
          <GameIcon name="fireToken" size={18} className="mr-2 -mt-0.5" />
          Unstake · returns over 7 days
        </TxButton>
      ) : (
        <TxButton tx={stake} onClick={onStake} disabled={blocked} pendingLabel="Staking…">
          <GameIcon name="fireToken" size={18} className="mr-2 -mt-0.5" />
          Stake $PYRE
        </TxButton>
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
