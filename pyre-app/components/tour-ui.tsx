"use client";

/* Shared guided-tour UI, used by BOTH shells:
   - TourNarration: the Emberkeeper's dialogue box (Tutor portrait + voice + the
     line + controls). Same on desktop and mobile; only the primary label adapts
     ("Step inside" makes sense only on the desktop map).

   The tour steps INSIDE each building and narrates; it does not spotlight any
   UI section. The camera (desktop) and the scroll/open behaviour (each shell)
   live in the shells; this is only the on-screen narration. */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BUILDING_BY_ID } from "@/components/buildings";
import { useTour } from "@/lib/tour";
import { useCompleteQuestTask, useQuestTasks } from "@/lib/hooks";
import { useIsDesktop } from "@/components/ui/use-media";
import { asset } from "@/lib/config";
import { ImageButton, type ImageButtonName } from "@/components/ui/image-button";

/* The Emberkeeper's narration box during the guided tour. */
export function TourNarration() {
  const tour = useTour();
  const complete = useCompleteQuestTask();
  const tasks = useQuestTasks();
  const isDesktop = useIsDesktop();
  const [muted, setMuted] = useState(false);
  // Skip is a confirmation, not an instant exit: clicking it asks first, so the
  // visitor sees what finishing would earn them before bailing.
  const [confirmSkip, setConfirmSkip] = useState(false);

  // Finishing the tour (clicking through the LAST beat, not skipping) instantly
  // grants the "Let the Emberkeeper guide you" quest, the first win that kicks
  // off quest momentum. Then tour.next() lands them in the Ashen Cup. Guard on
  // not-already-done so a replay (the tour is replayable) doesn't re-credit it.
  const introTask = tasks.data?.find((t) => t.id === "intro");
  const introDone = introTask?.done ?? false;
  const introPoints = introTask?.points ?? 20;
  const onPrimary = () => {
    if (tour.isLastBeat && !introDone) complete.mutate("intro");
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
  // The visible text is baked into the designer's art; `primaryLabel` is the
  // accessible label and `primaryArt` is which engraved button to show. There's
  // no dedicated "Begin the quests" art yet, so the last beat reuses Continue
  // (the SR label still says "Begin the quests"). Drop a `beginquests` row in
  // image-button.tsx and add it here when the designer ships one.
  const primaryLabel = overview
    ? "Begin the tour"
    : tour.isLastBeat
      ? "Begin the quests"
      : !inside && isDesktop
        ? "Step inside"
        : "Continue";
  const primaryArt: ImageButtonName = overview
    ? "begintour"
    : !tour.isLastBeat && !inside && isDesktop
      ? "stepinside"
      : "continue";
  const headerLabel = overview
    ? "The Pyre Kingdom"
    : inside
      ? `Inside · ${b?.name}`
      : `${b?.name} · ${tour.beat.step} of ${tour.beat.total}`;

  const art = tour.beat.art;

  return (
    <>
    <div className="fixed inset-x-0 bottom-0 z-[55] flex flex-col items-center p-4 pointer-events-none">
      {/* Beat art (e.g. the Acolyte NFT) rises from BEHIND the narration box: it
          sits just above the card with a negative margin so its base tucks behind
          the opaque card top, reading as a reveal of what you're about to earn. */}
      {art && (
        <div className="relative mb-[-1.75rem] animate-entry pointer-events-none" aria-hidden>
          <div
            className="absolute inset-0 -z-10 blur-2xl"
            style={{ background: "radial-gradient(circle at 50% 45%, rgba(240,169,59,0.55), transparent 68%)" }}
          />
          <Image
            src={asset(art)}
            alt=""
            width={1080}
            height={1080}
            priority
            className="h-36 w-auto rounded-xl object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.7)] sm:h-44"
            draggable={false}
          />
        </div>
      )}
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
                  aria-label={muted ? "Unmute the Emberkeeper" : "Mute the Emberkeeper"}
                  className="shrink-0 transition-transform duration-fast hover:scale-110 active:scale-95"
                >
                  <Image
                    src={asset(muted ? "/world/ui/audio_off.png" : "/world/ui/audio_on.png")}
                    alt=""
                    width={359}
                    height={309}
                    className="h-[22px] w-auto pointer-events-none"
                    draggable={false}
                  />
                </button>
                <button
                  onClick={() => setConfirmSkip(true)}
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
                <ImageButton name="back" label="Back" onClick={tour.back} width={96} />
              )}
              <div className="flex-1" />
              <ImageButton
                name={primaryArt}
                label={primaryLabel}
                onClick={onPrimary}
                width={primaryArt === "begintour" ? 168 : 156}
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Skip confirmation: loss-aversion before bailing. Finishing the tour grants
        the intro quest + its Points, so we surface that here rather than letting a
        single tap quietly forfeit it. (Skipped if that quest is already done.) */}
    {confirmSkip && (
      <div
        className="fixed inset-0 z-[58] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm"
        onClick={() => setConfirmSkip(false)}
      >
        <div
          className="w-full max-w-sm rounded-panel bg-surface border border-surface-3/60 shadow-panel p-5 text-center animate-entry"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-2xl text-brand">Skip the tour?</h3>
          <p className="text-text-2 text-sm mt-2 leading-relaxed">
            {introDone ? (
              "You can replay it any time from the village."
            ) : (
              <>
                Finish the tour and you instantly complete a quest, earning{" "}
                <span className="text-brand tabular">{introPoints} Points</span>. Skip now and
                you&rsquo;ll miss it.
              </>
            )}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={() => setConfirmSkip(false)}
              className="rounded-md bg-brand text-bg px-4 py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors"
            >
              Keep watching
            </button>
            <button
              onClick={() => {
                setConfirmSkip(false);
                tour.skip();
              }}
              className="text-text-3 text-sm hover:text-text-2 transition-colors px-3 py-2"
            >
              Skip anyway
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
