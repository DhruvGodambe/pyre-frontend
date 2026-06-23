"use client";

/* Shared guided-tour UI, used by BOTH shells:
   - TourNarration: the Emberkeeper's dialogue box (Tutor portrait + voice + the
     line + controls). Same on desktop and mobile; only the primary label adapts
     ("Step inside" makes sense only on the desktop map).
   - TourHighlight: a moving spotlight that rings a UI element by id (the Forge's
     Stake box, a mobile panel, etc.), dimming everything else.

   The camera (desktop) and the scroll/open behaviour (each shell) live in the
   shells; this is only the on-screen narration + spotlight. */

import { useEffect, useRef, useState } from "react";
import { BUILDING_BY_ID } from "@/components/buildings";
import { useTour } from "@/lib/tour";
import { useCompleteQuestTask } from "@/lib/hooks";
import { useIsDesktop } from "@/components/ui/use-media";
import { asset } from "@/lib/config";

/* A moving spotlight that rings the element the current line points at. Finds it
   by id, scrolls it into view, and tracks its box each frame; a huge spread
   shadow dims everything else. pointer-events stay through to the control. */
export function TourHighlight({ targetId }: { targetId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    let raf = 0;
    let scrolled = false;
    const loop = () => {
      const el = document.getElementById(targetId);
      if (el) {
        if (!scrolled) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          scrolled = true;
        }
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [targetId]);

  if (!rect) return null;
  const pad = 8;
  return (
    <div
      className="fixed z-[54] pointer-events-none rounded-xl"
      style={{
        left: rect.left - pad,
        top: rect.top - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
        boxShadow:
          "0 0 0 2px var(--color-brand), 0 0 0 9999px rgba(8,6,4,0.55), 0 0 32px rgba(240,169,59,0.65)",
        transition: "left 220ms ease, top 220ms ease, width 220ms ease, height 220ms ease",
      }}
      aria-hidden
    />
  );
}

/* The Emberkeeper's narration box during the guided tour. */
export function TourNarration() {
  const tour = useTour();
  const complete = useCompleteQuestTask();
  const isDesktop = useIsDesktop();
  const [muted, setMuted] = useState(false);

  // Finishing the tour (clicking through the LAST beat, not skipping) instantly
  // grants the "Let the Emberkeeper guide you" quest, the first win that kicks
  // off quest momentum. Then tour.next() lands them in the Ashen Cup.
  const onPrimary = () => {
    if (tour.isLastBeat) complete.mutate("intro");
    tour.next();
  };
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const voice = tour.beat?.voice;

  // Play the Tutor's voice clip for the current beat (once the designer delivers
  // audio + sets `voice`). Stops/replaces on every beat change; respects mute.
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (!voice || muted) return;
    const a = new Audio(asset(voice));
    audioRef.current = a;
    void a.play().catch(() => {
      /* autoplay can be blocked; the visitor can unmute to retry */
    });
    return () => a.pause();
  }, [voice, muted]);

  if (!tour.beat) return null;
  const overview = tour.beat.overview;
  const b = tour.beat.building ? BUILDING_BY_ID[tour.beat.building] : null;
  const inside = tour.beat.phase === "inside";
  // "Step inside" only means something on the desktop map; mobile is all inline.
  const primaryLabel = overview
    ? "Begin the tour →"
    : tour.isLastBeat
      ? "Begin the quests →"
      : !inside && isDesktop
        ? "Step inside →"
        : "Continue →";
  const headerLabel = overview
    ? "The Pyre Kingdom"
    : inside
      ? `Inside · ${b?.name}`
      : `${b?.name} · ${tour.beat.step} of ${tour.beat.total}`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[55] flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl rounded-panel bg-surface/95 border border-surface-3/60 shadow-panel backdrop-blur p-4 animate-entry">
        <div className="flex gap-3.5">
          {/* TUTOR PORTRAIT, placeholder slot for the designer's guide character
              (the Emberkeeper), who will actually talk: this avatar becomes the
              character art / animation, and `voice` plays the spoken line. */}
          <div className="shrink-0">
            <div
              className="grid h-16 w-16 place-items-center rounded-full border border-brand/40"
              style={{
                background:
                  "radial-gradient(circle at 50% 35%, rgba(240,169,59,0.35), var(--color-surface-2) 72%)",
              }}
              aria-hidden
            >
              <span className="text-brand text-2xl">✦</span>
            </div>
          </div>

          {/* Words + controls */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-text-3 text-[11px] uppercase tracking-[0.2em]">
                The Emberkeeper
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMuted((m) => !m)}
                  title={muted ? "Unmute the Emberkeeper" : "Mute"}
                  className="text-text-3 text-xs hover:text-text-2 transition-colors"
                >
                  {muted ? "🔇" : "🔊"}
                </button>
                <button
                  onClick={tour.skip}
                  className="text-text-3 text-xs hover:text-text-2 transition-colors"
                >
                  Skip tour
                </button>
              </div>
            </div>
            <div className="mb-0.5 text-text-3 text-[10px] uppercase tracking-widest">{headerLabel}</div>
            <p className="text-text-2 text-sm leading-relaxed">{tour.beat.text}</p>
            <div className="mt-3 flex items-center gap-3">
              {tour.index > 0 && (
                <button
                  onClick={tour.back}
                  className="text-text-3 text-sm hover:text-text-2 transition-colors px-2 py-2"
                >
                  ← Back
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={onPrimary}
                className="rounded-md bg-brand text-bg px-5 py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors"
              >
                {primaryLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
