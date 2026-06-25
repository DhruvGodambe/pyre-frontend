"use client";

/* ============================================================================
   THE WARDING, the staking experience  (commit → protection)
   ----------------------------------------------------------------------------
   Staking is the opposite pole to burning: not destruction for power, but
   giving your $PYRE to the fire's KEEPING, it stops decaying and earns ETH.
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

import { useEffect, useMemo, useState } from "react";
import { GameIcon } from "./game-icon";

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

/** The success flourish. Counts the staked total from `fromTokens` → `toTokens`,
    fires once, auto-dismisses. Rendered absolutely over the Stake box (the parent
    must be `relative`). pointer-events-none so it never traps clicks. */
export function StakeWarding({
  fromTokens,
  toTokens,
  onDone,
}: {
  fromTokens: number;
  toTokens: number;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(false);
  const [val, setVal] = useState(fromTokens);

  const sparks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${8 + Math.random() * 84}%`,
        delay: `${(Math.random() * 0.5).toFixed(2)}s`,
        dur: `${(1 + Math.random()).toFixed(2)}s`,
        size: 2 + Math.round(Math.random() * 4),
        key: i,
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
    const done = setTimeout(onDone, 2200);
    return () => {
      cancelAnimationFrame(r);
      cancelAnimationFrame(raf);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden rounded-panel transition-opacity duration-300"
      style={{ opacity: shown ? 1 : 0, background: "color-mix(in srgb, var(--color-bg) 72%, transparent)" }}
      aria-hidden
    >
      {/* protective ring igniting around the box */}
      <div
        className="absolute inset-2 rounded-panel border-2"
        style={{
          borderColor: "color-mix(in srgb, var(--color-brand) 70%, transparent)",
          boxShadow: "0 0 28px 2px color-mix(in srgb, var(--color-brand) 35%, transparent), inset 0 0 26px color-mix(in srgb, var(--color-brand) 22%, transparent)",
          transform: shown ? "scale(1)" : "scale(1.04)",
          opacity: shown ? 1 : 0,
          transition: "all 500ms var(--ease-warm)",
          animation: "warding-pulse 1.8s ease-in-out 0.3s infinite",
        }}
      />
      {/* rising embers */}
      {sparks.map((s) => (
        <span
          key={s.key}
          className="absolute bottom-2 rounded-full"
          style={{
            left: s.left,
            width: s.size,
            height: s.size,
            background: "var(--color-brand)",
            opacity: 0,
            animation: `warding-spark ${s.dur} ${s.delay} ease-out forwards`,
          }}
        />
      ))}

      <div className="relative text-center">
        <div className="flex justify-center">
          <GameIcon name="fireToken" size={40} />
        </div>
        <div className="mt-1 font-display text-3xl text-brand tabular">
          {Math.round(val).toLocaleString()}
        </div>
        <div className="text-text-3 text-[11px] uppercase tracking-widest">$PYRE warded · earning ETH</div>
        <p className="mt-1.5 text-sm italic text-text-2">
          <span className="not-italic text-brand">Emberkeeper:</span> &ldquo;Your fire is kept.&rdquo;
        </p>
      </div>

      <style>{`
        @keyframes warding-spark {
          0%   { transform: translateY(0) scale(1);     opacity: 0; }
          20%  { opacity: 0.9; }
          100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
        }
        @keyframes warding-pulse {
          0%,100% { box-shadow: 0 0 24px 1px color-mix(in srgb, var(--color-brand) 30%, transparent), inset 0 0 22px color-mix(in srgb, var(--color-brand) 18%, transparent); }
          50%     { box-shadow: 0 0 40px 5px color-mix(in srgb, var(--color-brand) 48%, transparent), inset 0 0 30px color-mix(in srgb, var(--color-brand) 28%, transparent); }
        }
      `}</style>
    </div>
  );
}
