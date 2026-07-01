"use client";

/* ============================================================================
   FORGE REVEAL, the tier-unlock cinematic  (SCAFFOLD)
   ----------------------------------------------------------------------------
   This is a STRUCTURAL SCAFFOLD, not the final cinematic. It exists so:
     • the app already TRIGGERS the moment at the right time (a burn that crosses
       a tier / mints the first Acolyte / reaches Immolated, on EITHER path),
     • the designer knows exactly which beats + assets to deliver.

   ONE tier reveal that ADAPTS to the burn path (reads the Acolyte's own isLP
   flag): a plain-burn tier shows the 1×→3× multipliers, an LP tier shows the
   doubled 2×→6× ones and an "(LP)" title + heavier accent/sound. Every new tier
   you reach on your chosen path gets its own reveal.

   The DESIGNER replaces the placeholder visuals below with the real cinematic and
   delivers the sounds (see lib/sfx.ts → playForgeTierUp/playLpBurn); the LP path
   plays the heavier playLpBurn. When per-tier Acolyte art lands, AcolyteArt picks
   it up automatically. Designer slots are marked with  ⟦DESIGNER⟧  comments.
   ========================================================================== */

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Acolyte } from "@/lib/types";
import { STAGES, acolyteName, LP_BURN_BONUS, type Stage } from "@/lib/constants";
import { AcolyteArt } from "./acolyte-art";
import { playForgeTierUp, playLpBurn } from "@/lib/sfx";

export interface RevealData {
  acolyte: Acolyte;
  /** the stage before this upgrade (0 = first forge). */
  prevStage?: number;
}

const AUTO_DISMISS_MS = 7000;

export function ForgeReveal({ data, onClose }: { data: RevealData; onClose: () => void }) {
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // Ember sparks, decorative. ⟦DESIGNER⟧ replace with the real particle/art pass.
  const sparks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: `${Math.round(Math.random() * 100)}%`,
        delay: `${(Math.random() * 1.6).toFixed(2)}s`,
        dur: `${(2.4 + Math.random() * 2.2).toFixed(2)}s`,
        size: 3 + Math.round(Math.random() * 5),
        key: i,
      })),
    []
  );

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    // ⟦DESIGNER⟧ sounds are placeholders until you deliver them (see lib/sfx.ts).
    if (data.acolyte.isLP) playLpBurn();
    else playForgeTierUp(data.acolyte.stage, data.acolyte.isImmolated);
    const t = setTimeout(() => close(), AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setLeaving(true);
    setTimeout(onClose, 380);
  };

  // A single tier reveal that adapts to the burn path. For an LP Acolyte the tier
  // multipliers are the doubled (LP) ones, so every tier you reach on the LP path
  // gets its own LP tier reveal, same shape as the plain-burn tier reveal.
  const isLp = data.acolyte.isLP;
  const factor = isLp ? LP_BURN_BONUS : 1;
  const mult = (s: Stage) => Math.round(STAGES[s].multiplier * factor * 100) / 100;
  const stage = (data.acolyte.stage || 1) as Stage;
  const baseName = data.acolyte.isImmolated ? "Immolated Acolyte" : acolyteName(stage);
  const title = isLp ? `${baseName} (LP)` : baseName;
  const prevMult = data.prevStage && data.prevStage >= 1 ? mult(data.prevStage as Stage) : null;
  const newMult = mult(stage);
  const accent = isLp ? "var(--color-danger)" : "var(--color-brand)";

  const body = (
    <div
      onClick={close}
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-bg/95 backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : shown ? 1 : 0 }}
      role="dialog"
      aria-label={isLp ? "LP Acolyte tier unlocked" : "Acolyte tier unlocked"}
    >
      {/* ⟦DESIGNER⟧ ===== CINEMATIC CANVAS =========================================
          Everything inside this box is a placeholder for the real cinematic.
          Target beats (~7s): (1) dark, (2) forge flare from center, (3) the
          Acolyte rises out of the fire, (4) tier name + multiplier stamp in,
          (5) settle. For "lp" make it heavier/permanent (chains, deeper fire).
          ====================================================================== */}

      {/* rising ember sparks */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {sparks.map((s) => (
          <span
            key={s.key}
            className="absolute bottom-0 rounded-full"
            style={{
              left: s.left,
              width: s.size,
              height: s.size,
              background: accent,
              filter: "blur(0.5px)",
              opacity: 0,
              animation: `fr-spark ${s.dur} ${s.delay} ease-out infinite`,
            }}
          />
        ))}
      </div>

      {/* central flare behind the Acolyte */}
      <div
        className="pointer-events-none absolute"
        aria-hidden
        style={{
          width: "60vmin",
          height: "60vmin",
          background: `radial-gradient(circle, color-mix(in srgb, ${accent} 38%, transparent), transparent 65%)`,
          opacity: shown ? 1 : 0,
          transition: "opacity 700ms ease-out",
          animation: "fr-pulse 2.6s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center" onClick={(e) => e.stopPropagation()}>
        <span
          className="mb-4 font-mono text-[11px] uppercase tracking-[0.4em]"
          style={{ color: accent, opacity: shown ? 1 : 0, transition: "opacity 500ms ease 200ms" }}
        >
          {data.prevStage ? "Tier unlocked" : "Your Acolyte is forged"}
          {isLp ? " · LP path" : ""}
        </span>

        {/* the Acolyte rising from the fire */}
        <div
          style={{
            transform: shown ? "translateY(0) scale(1)" : "translateY(40px) scale(0.82)",
            opacity: shown ? 1 : 0,
            transition: "transform 1100ms cubic-bezier(0.16,1,0.3,1), opacity 800ms ease-out",
          }}
        >
          <AcolyteArt acolyte={data.acolyte} size={260} />
        </div>

        {/* tier name, stamps in */}
        <h2
          className="mt-6 font-display text-5xl leading-none"
          style={{
            color: accent,
            transform: shown ? "scale(1)" : "scale(1.4)",
            opacity: shown ? 1 : 0,
            transition: "transform 600ms cubic-bezier(0.16,1,0.3,1) 350ms, opacity 600ms ease 350ms",
            textShadow: `0 0 30px color-mix(in srgb, ${accent} 50%, transparent)`,
          }}
        >
          {title}
        </h2>

        <p
          className="mt-3 text-text-2 text-sm"
          style={{ opacity: shown ? 1 : 0, transition: "opacity 600ms ease 600ms" }}
        >
          {prevMult ? (
            <>
              Yield multiplier <span className="text-text-3">{prevMult}×</span> →{" "}
              <span style={{ color: accent }}>{newMult}×</span> on your staked $PYRE
              {isLp ? ", as an LP Acolyte" : ""}.
            </>
          ) : (
            <>
              Yield multiplier <span style={{ color: accent }}>{newMult}×</span> on your staked $PYRE
              {isLp ? ", as an LP Acolyte" : ""}.
            </>
          )}
        </p>

        {/* ⟦DESIGNER⟧ Emberkeeper line, final voice TBD. */}
        <p
          className="mt-4 max-w-sm text-sm italic text-text-3"
          style={{ opacity: shown ? 1 : 0, transition: "opacity 600ms ease 800ms" }}
        >
          <span className="not-italic text-brand">Emberkeeper:</span>{" "}
          {isLp ? "“You gave what cannot be returned. The fire remembers.”" : "“The fire takes shape. You rise.”"}
        </p>

        <button
          onClick={close}
          className="mt-7 rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-brand-deep"
          style={{ opacity: shown ? 1 : 0, transition: "opacity 600ms ease 1000ms" }}
        >
          Continue
        </button>
      </div>

      {/* scoped keyframes for the placeholder beats */}
      <style>{`
        @keyframes fr-spark {
          0%   { transform: translateY(0) scale(1);     opacity: 0; }
          15%  { opacity: 0.9; }
          100% { transform: translateY(-78vh) scale(0.3); opacity: 0; }
        }
        @keyframes fr-pulse {
          0%,100% { transform: scale(1);    opacity: 0.85; }
          50%     { transform: scale(1.08); opacity: 1; }
        }
      `}</style>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(body, document.body);
}
