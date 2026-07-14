"use client";

/* ============================================================================
   THE WARDING, the staking experience  (commit → protection)
   ----------------------------------------------------------------------------
   Staking is the opposite pole to burning: not destruction for power, but
   giving your $PYRE to the fire's KEEPING, it stops decaying and earns $ETH.
   So the act should feel like warding/committing, distinct from the burn
   cinematic. Two pieces:

     StakeFlame   , a living ember in the Stake box that GROWS as you raise the
                    amount (the act becomes tactile before you click).
     StakeWarding , a fast (~2s) in-panel flourish on a successful stake: embers
                    rise, a protective ring ignites around the staked total, and
                    the total counts up. NOT a full-screen takeover, staking is
                    frequent, so it stays light and non-blocking.

   This is a functional, on-brand version; the designer can elevate the visuals
   later (it reuses the fire token + CSS, no new assets required).
   ========================================================================== */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { GameIcon } from "./game-icon";
import { asset } from "@/lib/config";
import { formatToken, formatEth, toNumber } from "@/lib/format";

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

/** A flame that scales + brightens with `intensity` (0..1). Always shows a small
    ember so the box never looks dead. */
export function StakeFlame({ intensity }: { intensity: number }) {
  const t = Math.max(0, Math.min(1, intensity));
  const size = 24 + t * 30; // 24 → 54
  return (
    <div className="relative grid h-16 place-items-center" aria-hidden>
      <div
        className="absolute rounded-full"
        style={{
          width: 56 + t * 70,
          height: 56 + t * 70,
          background: `radial-gradient(circle, color-mix(in srgb, var(--color-brand) ${18 + t * 47}%, transparent), transparent 70%)`,
          transition: "all 320ms var(--ease-warm)",
        }}
      />
      <div
        style={{
          transition: "all 320ms var(--ease-warm)",
          filter: `brightness(${0.8 + t * 0.6})`,
          transform: `scale(${0.92 + t * 0.28}) translateY(${-t * 2}px)`,
        }}
        className={t > 0.02 ? "animate-pulse" : ""}
      >
        <GameIcon name="fireToken" size={size} />
      </div>
    </div>
  );
}

/** THE HEARTH, a picture of your stake instead of a row of numbers. Shows the
    kept fire (grows with what's protected), a protection gauge (staked = warded
    gold, unstaked = exposed + decaying), and pending $ETH. As you type a stake
    amount, the gauge previews the slice moving from exposed → warded and the fire
    grows with it. */
export function StakeHearth({
  staked,
  unstaked,
  pendingEth,
  addingTokens = 0,
  decay,
}: {
  staked: bigint;
  unstaked: bigint;
  pendingEth: bigint;
  /** amount being typed in, previewed as moving from unstaked → staked. */
  addingTokens?: number;
  decay?: string;
}) {
  const stakedT = toNumber(staked);
  const unstakedT = toNumber(unstaked);
  const total = Math.max(1, stakedT + unstakedT);
  const adding = Math.max(0, Math.min(addingTokens, unstakedT)); // can't stake more than held
  const stakedPct = (stakedT / total) * 100;
  const addingPct = (adding / total) * 100;
  const unstakedPct = Math.max(0, 100 - stakedPct - addingPct);
  const protectedFrac = Math.min(1, (stakedT + adding) / total);

  return (
    <div className="rounded-md border border-surface-3/50 bg-surface-2/40 p-3">
      <StakeFlame intensity={protectedFrac} />

      {/* protection gauge: warded (gold) vs exposed (decaying) */}
      <div className="mt-1 flex h-3 w-full overflow-hidden rounded-full bg-surface-3/40">
        <div
          className="h-full bg-gradient-to-r from-brand-deep to-brand transition-all duration-300"
          style={{ width: `${stakedPct}%` }}
        />
        {addingPct > 0 && (
          <div
            className="h-full bg-brand-soft transition-all duration-300"
            style={{ width: `${addingPct}%`, animation: "hearth-pending 1s ease-in-out infinite" }}
          />
        )}
        <div className="relative h-full transition-all duration-300" style={{ width: `${unstakedPct}%` }}>
          <div className="absolute inset-0 bg-danger/25" />
          {/* decay shimmer: the exposed $PYRE is quietly burning away */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-danger) 45%, transparent), transparent)",
              animation: "hearth-decay 1.8s linear infinite",
            }}
          />
        </div>
      </div>

      {/* labels under each end of the gauge */}
      <div className="mt-2 flex items-start justify-between text-[11px]">
        <span className="text-text-2">
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand align-middle" />
          Staked <span className="tabular text-text">{formatToken(staked)}</span>
          <span className="block pl-3 text-success">earning</span>
        </span>
        <span className="text-right text-text-2">
          Unstaked <span className="tabular text-text">{formatToken(unstaked)}</span>
          <span className="mr-0 ml-1 inline-block h-2 w-2 rounded-full bg-danger/60 align-middle" />
          {decay ? <span className="block pr-3 text-danger">−{decay}/hr decay</span> : null}
        </span>
      </div>

      {/* pending $ETH, the reward filling up */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5 border-t border-surface-3/40 pt-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-brand" style={{ animation: "hearth-pending 1.4s ease-in-out infinite" }} />
        <span className="text-text-3">Pending reward</span>
        <span className="tabular text-brand">{formatEth(pendingEth)}</span>
      </div>

      <style>{`
        @keyframes hearth-decay {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes hearth-pending {
          0%,100% { opacity: 0.55; }
          50%     { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/** The success flourish. Counts the staked total from `fromTokens` → `toTokens`,
    fires once, auto-dismisses. Rendered absolutely over the Stake box (the parent
    must be `relative`). pointer-events-none so it never traps clicks. */
export function StakeWarding({
  mode = "stake",
  fromTokens,
  toTokens,
  onDone,
}: {
  /** stake = lid slams SHUT (lock in); unstake = lid lifts OPEN (release). */
  mode?: "stake" | "unstake";
  fromTokens: number;
  toTokens: number;
  onDone: () => void;
}) {
  const isUnstake = mode === "unstake";
  const copy = isUnstake
    ? { eyebrow: "Unstaking", label: "$PYRE released", sub: "returns over 7 days", keeper: "Your fire is drawn back." }
    : { eyebrow: "$PYRE Staked", label: "$PYRE warded", sub: "earning $ETH", keeper: "Your fire is kept." };
  const [shown, setShown] = useState(false);
  const [val, setVal] = useState(fromTokens);

  // A few embers drifting up behind the seal, staggered. Fewer and softer than
  // the old confetti of dots, so they read as a warm hearth, not static.
  const embers = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        key: i,
        left: `${18 + Math.random() * 64}%`,
        delay: `${(0.1 + Math.random() * 0.6).toFixed(2)}s`,
        dur: `${(1.4 + Math.random() * 0.9).toFixed(2)}s`,
        size: 2 + Math.round(Math.random() * 3),
        drift: `${(Math.random() * 24 - 12).toFixed(0)}px`,
      })),
    []
  );

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    const t0 = performance.now();
    const dur = 1100;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      setVal(fromTokens + (toTokens - fromTokens) * easeOut(k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const done = setTimeout(onDone, 2600);
    return () => {
      cancelAnimationFrame(r);
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`ward pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden rounded-panel ${isUnstake ? "is-unstake" : ""}`}
      style={{ opacity: shown ? 1 : 0 }}
      aria-hidden
    >
      {/* embers rising behind the chest */}
      {embers.map((e) => (
        <span
          key={e.key}
          className="ward-ember absolute bottom-3 rounded-full"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              "--dur": e.dur,
              "--delay": e.delay,
              "--drift": e.drift,
            } as CSSProperties
          }
        />
      ))}

      <div className="ward-stage relative flex flex-col items-center">
        {/* The action headline, so it's unmistakable WHICH act this is. */}
        <div className="ward-eyebrow font-display uppercase tracking-[0.28em] text-brand">
          {copy.eyebrow}
        </div>

        {/* THE CHEST: on a STAKE it lands open with your $PYRE then the lid slams
            SHUT and locks (open frame crossfades to closed). On an UNSTAKE it runs
            the opposite, the lid lifts OPEN to release the fire. */}
        <div className="ward-chest relative" style={{ width: "clamp(158px, 46%, 208px)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/world/ui/chest_closed.webp")} alt="" draggable={false} className="block w-full select-none" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset("/world/ui/chest_open.webp")} alt="" draggable={false} className="ward-open absolute inset-0 block w-full select-none" />
          <span className="ward-flash pointer-events-none absolute inset-0" />
        </div>

        <div className="relative -mt-1 text-center">
          <div className="font-display text-4xl leading-none text-brand tabular drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
            {Math.round(val).toLocaleString()}
          </div>
          <div className="mt-0.5 text-text-3 text-[11px] uppercase tracking-[0.2em]">{copy.label}</div>
          <div className="text-success text-xs">{copy.sub}</div>
          <p className="mt-1.5 text-sm italic text-text-2">
            <span className="not-italic text-brand">Emberkeeper:</span> &ldquo;{copy.keeper}&rdquo;
          </p>
        </div>
      </div>

      <style>{`
        .ward {
          transition: opacity 300ms ease;
          background: radial-gradient(
            ellipse at 50% 42%,
            color-mix(in srgb, var(--color-bg) 55%, transparent),
            color-mix(in srgb, var(--color-bg) 92%, transparent)
          );
        }
        .ward-stage { animation: ward-in 380ms var(--ease-warm) both; }
        .ward-eyebrow {
          font-size: 12px;
          margin-bottom: 8px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
          animation: ward-in 360ms var(--ease-warm) both;
        }
        .ward-chest {
          transform-origin: 50% 100%;
          filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.6));
          animation: ward-slam 300ms var(--ease-warm) 520ms both;
        }
        /* STAKE: the open lid fades out to reveal the closed frame = lid shutting. */
        .ward-open { animation: ward-lidfade 260ms ease-in 540ms forwards; }
        /* UNSTAKE: the reverse. Chest starts closed, the open frame fades IN = lid
           lifting to release the fire, with a small upward pop instead of a slam. */
        .is-unstake .ward-open { animation: ward-lidopen 320ms var(--ease-warm) 380ms both; }
        .is-unstake .ward-chest { animation: ward-lift 340ms var(--ease-warm) 360ms both; }
        .ward-flash {
          border-radius: 16px;
          background: radial-gradient(circle at 50% 58%, color-mix(in srgb, var(--color-brand) 78%, white), transparent 62%);
          opacity: 0;
          mix-blend-mode: screen;
          animation: ward-flash 460ms ease-out 560ms;
        }
        .ward-ember {
          background: radial-gradient(circle, var(--color-brand), color-mix(in srgb, var(--color-brand) 20%, transparent));
          opacity: 0;
          animation: ward-ember var(--dur) var(--delay) ease-out forwards;
        }
        @keyframes ward-in {
          from { opacity: 0; transform: scale(0.92) translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes ward-lidfade { to { opacity: 0; } }
        @keyframes ward-lidopen { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ward-slam {
          0%   { transform: translateY(-5px) scale(1.02); }
          55%  { transform: translateY(3px) scale(0.985); }
          100% { transform: none; }
        }
        @keyframes ward-lift {
          0%   { transform: translateY(4px) scale(0.99); }
          55%  { transform: translateY(-3px) scale(1.015); }
          100% { transform: none; }
        }
        @keyframes ward-flash {
          0%   { opacity: 0; }
          28%  { opacity: 0.85; }
          100% { opacity: 0; }
        }
        @keyframes ward-ember {
          0%   { opacity: 0;    transform: translate(0, 0) scale(1); }
          25%  { opacity: 0.85; }
          100% { opacity: 0;    transform: translate(var(--drift), -96px) scale(0.3); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ward-ember, .ward-flash { display: none; }
          .ward-stage, .ward-chest, .ward-eyebrow { animation: none; }
          /* settle on the end frame with no motion: stake = closed, unstake = open */
          .ward-open { display: none; }
          .is-unstake .ward-open { display: block; opacity: 1; animation: none; }
        }
      `}</style>
    </div>
  );
}
