"use client";

/* Shared guided-tour UI, used by BOTH shells:
   - TourNarration: the Emberkeeper's dialogue box (Tutor portrait + voice + the
     line + controls). Same on desktop and mobile; only the primary label adapts
     ("Step inside" makes sense only on the desktop map).

   The tour steps INSIDE each building and narrates; it does not spotlight any
   UI section. The camera (desktop) and the scroll/open behaviour (each shell)
   live in the shells; this is only the on-screen narration. */

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* useLayoutEffect warns when server-rendered; the shells do SSR this component
   (it just returns null until the tour starts), so swap in useEffect there. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { BUILDING_BY_ID } from "@/components/buildings";
import { useTour } from "@/lib/tour";
import { useCompleteQuestTask, useQuestTasks } from "@/lib/hooks";
import { useIsDesktop } from "@/components/ui/use-media";
import { asset } from "@/lib/config";
import { storageGet, storageSet } from "@/lib/safe-storage";
import { VOICE_TIMING } from "@/lib/tour-voice-timing";
import { ImageButton } from "@/components/ui/image-button";
import { KeeperBox, KeeperText, PlateButton } from "@/components/ui/keeper-box";

/* How far (seconds) the revealed text runs ahead of the voice. A touch of lead
   absorbs alignment jitter; reading slightly early feels in-sync, trailing
   feels broken. */
const VOICE_LEAD = 0.12;

/* Narration speed: one chip cycling the standard media steps. playbackRate
   preserves pitch in all modern browsers, so the Emberkeeper only talks
   faster, never higher. Text reveal needs no adjustment: it's paced against
   the CLIP's playhead (clip-seconds), which the rate simply advances faster.
   Persisted so the choice survives beats, replays and sessions. */
const SPEEDS = [1, 1.25, 1.5, 2] as const;
const SPEED_KEY = "pyre_tour_speed";
const loadSpeed = (): number => {
  const v = Number(storageGet(SPEED_KEY));
  return SPEEDS.includes(v as (typeof SPEEDS)[number]) ? v : 1;
};

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
  // Narration speed: read once, applied to every clip, live-applied on change.
  const [speed, setSpeed] = useState(loadSpeed);
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
    storageSet(SPEED_KEY, String(speed));
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);
  const cycleSpeed = () =>
    setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]);
  // The clip's playhead in seconds, or null when there is nothing to pace the
  // text against (no clip, muted, autoplay blocked, or the clip finished):
  // null shows the whole line at once.
  const [playhead, setPlayhead] = useState<number | null>(null);

  // Play the Emberkeeper's voice clip for the current beat. Stops/replaces on
  // every beat change; respects mute. While it plays, `playhead` follows the
  // clip so the on-screen letters keep pace with the spoken words. Layout
  // effect so the reveal resets before paint: otherwise every beat change
  // flashes the full line for a frame before the words start. The "ended" and
  // play-rejection handlers only act while this clip is still the current one:
  // a replaced clip settling late must not blank a newer clip's pacing.
  useIsomorphicLayoutEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (!voice || muted) {
      setPlayhead(null);
      return;
    }
    const a = new Audio(asset(voice));
    a.playbackRate = speedRef.current;
    audioRef.current = a;
    // Follow the playhead only while the clip is actually sounding; that way a
    // late start (slow load) resumes pacing, and a bailed reveal isn't
    // overwritten. Not gated on the play() promise: some environments leave it
    // pending forever, which must not freeze the text.
    let raf = 0;
    const follow = () => {
      if (!a.paused && !a.ended) setPlayhead(a.currentTime);
      raf = requestAnimationFrame(follow);
    };
    const bail = () => {
      // show the whole line rather than none of it
      if (audioRef.current === a) setPlayhead(null);
    };
    a.addEventListener("ended", bail);
    a.addEventListener("error", bail);
    setPlayhead(0);
    raf = requestAnimationFrame(follow);
    void a.play().catch(bail); // autoplay blocked
    // Watchdog for playback that neither starts nor errors (blocked autoplay
    // with a forever-pending play(), stalled load): don't hold a bare line.
    const watchdog = window.setTimeout(() => {
      if (a.paused || a.currentTime === 0) bail();
    }, 2000);
    return () => {
      window.clearTimeout(watchdog);
      cancelAnimationFrame(raf);
      a.pause();
    };
  }, [voice, muted]);

  // Reading-pace fallback: with no voice pacing (muted, no clip, autoplay
  // blocked, or the clip ended early) the fixed window still fills at a
  // comfortable subtitle pace instead of jumping to the tail of a long line.
  // Monotonic: the reveal never moves backwards when pacing sources swap.
  const beatText = tour.beat?.text ?? "";
  const [synth, setSynth] = useState(0);
  const maxShownRef = useRef(0);
  useIsomorphicLayoutEffect(() => {
    setSynth(0);
    maxShownRef.current = 0;
  }, [beatText]);
  useEffect(() => {
    if (!beatText) return;
    const id = window.setInterval(() => {
      setSynth((v) => (v >= beatText.length ? v : v + 1));
    }, 24);
    return () => window.clearInterval(id);
  }, [beatText]);

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
  const headerLabel = overview
    ? "The Pyre Kingdom"
    : inside
      ? `Inside · ${b?.name}`
      : `${b?.name} · ${tour.beat.step} of ${tour.beat.total}`;

  const art = tour.beat.art;

  // Letter-exact reveal. Every word of the line has measured [start, end]
  // seconds (whisper-aligned against the actual clip by scripts/align-voice.py,
  // regenerate there when clips or lines change), and letters fill in across
  // each word's own span, so the text tracks the Emberkeeper's voice to the
  // letter. The timing list is matched to the displayed variant of the line by
  // word count; with no timing data the whole line shows (never hide words on
  // missing data). The full line is always laid out (unspoken part invisible)
  // so the box keeps its final height and nothing reflows mid-line.
  const text = tour.beat.text;
  let paced: number | null = null;
  if (playhead !== null && voice) {
    const words = text.split(" ");
    const timing = VOICE_TIMING[voice]?.find((t) => t.length === words.length);
    if (timing) {
      const t = playhead + VOICE_LEAD;
      paced = 0;
      for (let i = 0; i < words.length; i++) {
        const [start, end] = timing[i];
        if (t >= end) {
          paced += words[i].length + 1; // the whole word and its trailing space
        } else {
          if (t > start) paced += Math.round((words[i].length * (t - start)) / (end - start));
          break;
        }
      }
      paced = Math.min(paced, text.length);
    }
  }
  // Voice paces when it can; the reading-pace counter carries otherwise. The
  // max() keeps the reveal monotonic across source swaps (e.g. clip ends).
  const shown = Math.min(
    text.length,
    Math.max(paced ?? synth, maxShownRef.current)
  );
  maxShownRef.current = shown;

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
      <KeeperBox
        className="pointer-events-auto w-full max-w-xl shadow-panel animate-entry"
        actions={<PlateButton label={primaryLabel} onClick={onPrimary} />}
      >
        <div className="flex items-center gap-4">
          {/* THE EMBERKEEPER: the designer's character art (hooded, masked,
              burning eyes), the same keeper who greets at the front door,
              framed square like the front door's close-up and centered on
              the text column. The name lives on the forged plate riding the
              box's top edge. */}
          <img
            src={asset("/world/emberkeeper/arm-out.webp")}
            alt=""
            draggable={false}
            className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 rounded-md object-cover object-top ring-1 ring-black/70 shadow-[0_2px_10px_rgba(0,0,0,0.6)] select-none"
            aria-hidden
          />

          {/* Words + controls */}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div>
                {tour.index > 0 && (
                  <ImageButton name="back" label="Back" onClick={tour.back} width={80} />
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={cycleSpeed}
                  title="Narration speed"
                  aria-label={`Narration speed: ${speed}x. Click to change.`}
                  className="shrink-0 rounded-full border border-surface-3/70 px-2 py-0.5 text-text-3 text-[11px] tabular hover:text-brand hover:border-brand transition-colors"
                >
                  {speed}x
                </button>
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
                <ImageButton
                  name="skiptour"
                  label="Skip tour"
                  width={104}
                  onClick={() => setConfirmSkip(true)}
                />
              </div>
            </div>
            <div className="mb-0.5 text-text-3 text-[10px] uppercase tracking-widest">{headerLabel}</div>
            <KeeperText text={text} shown={shown} lines={3} />
          </div>
        </div>
      </KeeperBox>
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
          className="stone-panel w-full max-w-sm p-5 text-center animate-entry"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-display text-2xl text-brand">Skip the tour?</h3>
          <p className="text-text-2 text-sm mt-2 leading-relaxed">
            {introDone ? (
              "You can replay it any time from the kingdom."
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
