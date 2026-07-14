"use client";

/* ============================================================================
   PYRE, Cinematic Intro  (the brand opening, shown before the world)
   ----------------------------------------------------------------------------
   When a visitor arrives at the public front door they get the designer's
   Pyre_Intro film, full-screen over a black stage; a clear "Skip intro →" lets
   anyone move straight on. When the film ends (or is skipped) it dismisses and
   the gate is revealed underneath.

   Gating:
     • Plays on EVERY arrival at the front door (by design, so the cinematic
       always sets the tone), not just the first visit.
     • Rendered only on the public front door ("/"), NOT inside the kingdom, so
       stepping through the gate doesn't replay the film you just watched.

   Entry: LIGHT THE PYRE, from NOTHING. The title screen is darkness itself:
   black, a few drifting embers, one instruction. The visitor PRESSES AND
   HOLDS anywhere, and THE FILM ITSELF is the ignition: the hold starts the
   film playing from 0 WITH SOUND (the hold is the browser gesture that allows
   it). Fire rises out of the void under their finger and the film builds the
   burning emblem from it. There is no handoff and no transition: the visitor
   is watching the film from its first frame, they just caused it. Releasing
   before the fire has caught (the commit point) puts it out: the film pauses
   and rewinds to 0, back to darkness, light it again from scratch. Holding
   past the commit point means it is lit for good. If unmuted play is somehow
   refused, it falls back to muted so the film always rolls. Once committed,
   Skip and a mute toggle are the only chrome.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/config";
import { ImageButton } from "@/components/ui/image-button";

const VIDEO_SRC = `${BASE_PATH}/intro/pyre-intro.mp4`;

/* The title chrome (instruction, ember motes) burns away across the film's
   first FADE_END seconds. Holding until COMMIT seconds of film have played
   means the fire has truly caught: the ignition is irreversible from there. */
const FADE_END = 1.2;
const COMMIT = 1.3;

/* How fast the emblem cools back (per second of animation) after an early
   release. */
const COOL_MS = 450;

/* If the film stalls (buffering / decode hiccup) and never recovers, don't trap
   the visitor on a frozen frame, auto-dismiss after this long with no progress. */
const STALL_TIMEOUT_MS = 12000;

/* Ember motes for the title screen: hand-placed variety (same set as the
   landing page), CSS does the drifting (.ember in globals.css). */
const EMBERS: Array<React.CSSProperties & Record<string, string>> = [
  { "--x": "8%", "--s": "3px", "--t": "11s", "--d": "0s", "--o": "0.5", "--drift": "26px" },
  { "--x": "16%", "--s": "2px", "--t": "14s", "--d": "3.2s", "--o": "0.4", "--drift": "-18px" },
  { "--x": "24%", "--s": "4px", "--t": "9s", "--d": "1.4s", "--o": "0.6", "--drift": "30px" },
  { "--x": "33%", "--s": "2px", "--t": "13s", "--d": "5.1s", "--o": "0.35", "--drift": "-24px" },
  { "--x": "42%", "--s": "3px", "--t": "10s", "--d": "2.3s", "--o": "0.55", "--drift": "16px" },
  { "--x": "51%", "--s": "2px", "--t": "15s", "--d": "6.8s", "--o": "0.4", "--drift": "-30px" },
  { "--x": "58%", "--s": "4px", "--t": "8.5s", "--d": "0.8s", "--o": "0.65", "--drift": "22px" },
  { "--x": "66%", "--s": "2px", "--t": "12s", "--d": "4.4s", "--o": "0.4", "--drift": "-14px" },
  { "--x": "74%", "--s": "3px", "--t": "10.5s", "--d": "2.9s", "--o": "0.55", "--drift": "28px" },
  { "--x": "82%", "--s": "2px", "--t": "13.5s", "--d": "7.6s", "--o": "0.35", "--drift": "-22px" },
  { "--x": "90%", "--s": "3px", "--t": "9.5s", "--d": "1.9s", "--o": "0.5", "--drift": "18px" },
  { "--x": "96%", "--s": "2px", "--t": "14.5s", "--d": "5.7s", "--o": "0.4", "--drift": "-26px" },
];

export function PyreIntro({ onDone }: { onDone?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const [decided, setDecided] = useState(false);
  const [curtainGone, setCurtainGone] = useState(false);
  // Flips at the commit point: the fire has caught, the film runs to the end.
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false); // sound ON by default
  const videoRef = useRef<HTMLVideoElement>(null);

  // The film opens on EVERY arrival. Until this runs, an opaque branded curtain
  // covers the page (from first paint, so nothing flashes through behind it).
  useEffect(() => {
    setOpen(true);
    setDecided(true);
  }, []);

  // When we're NOT showing the film (after it ends/skips), fade the curtain out
  // and then drop it, so the gate is revealed smoothly.
  useEffect(() => {
    if (!decided || open) return;
    const t = setTimeout(() => setCurtainGone(true), 550);
    return () => clearTimeout(t);
  }, [decided, open]);

  /* ---- Light the Pyre ----------------------------------------------------
     The dissolve progress (--p, 0..1) is painted onto the stage every frame.
     While HOLDING, p tracks the FILM'S OWN CLOCK (currentTime / FADE_END), so
     the cold metal fades exactly in step with the film's growing flames.
     After an early release, p animates back down while the film rewinds. */
  const stageRef = useRef<HTMLDivElement>(null);
  const holdingRef = useRef(false);
  const committedRef = useRef(false);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);

  const paintProgress = (p: number) => {
    progressRef.current = p;
    stageRef.current?.style.setProperty("--p", String(p));
  };

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setStarted(true); // the title layer unmounts (it is fully faded already)
  };

  const tick = (ts: number) => {
    const dt = lastTsRef.current ? ts - lastTsRef.current : 16;
    lastTsRef.current = ts;
    const v = videoRef.current;
    if (holdingRef.current && v) {
      // The film is playing under the hold: fade the metal on its clock.
      paintProgress(Math.min(1, v.currentTime / FADE_END));
      if (v.currentTime >= COMMIT) {
        commit();
        return;
      }
    } else {
      // Early release: cool back down while the film rewinds.
      const p = Math.max(0, progressRef.current - dt / COOL_MS);
      paintProgress(p);
      if (p <= 0) {
        rafRef.current = null;
        lastTsRef.current = 0;
        return;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const startLoop = () => {
    if (rafRef.current == null) {
      lastTsRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const holdStart = () => {
    if (committedRef.current) return;
    holdingRef.current = true;
    const v = videoRef.current;
    if (v) {
      // The hold IS the user gesture, so the film may play WITH SOUND from
      // its true beginning. Restart from 0 on every fresh attempt.
      try {
        if (v.currentTime > 0.05) v.currentTime = 0;
      } catch {
        /* not seekable yet: it will simply play from wherever it is */
      }
      v.muted = false;
      setMuted(false);
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    }
    startLoop();
  };

  const holdEnd = () => {
    if (committedRef.current) return;
    holdingRef.current = false;
    const v = videoRef.current;
    if (v) {
      v.pause();
      try {
        v.currentTime = 0;
      } catch {
        /* fine: next hold retries the rewind */
      }
    }
    startLoop(); // cool the emblem back down
  };

  // Tidy up if the intro unmounts mid-ritual.
  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const finish = () => {
    // Ends or is skipped: drop the film and reveal the gate underneath.
    setOpen(false);
    onDone?.();
  };

  // Safety net: once COMMITTED, if the film never makes progress (stuck
  // buffering / decode hiccup, a frozen frame), auto-dismiss so nobody is
  // stranded. The timer resets on every bit of real playback/download progress.
  useEffect(() => {
    if (!open || !started) return;
    const v = videoRef.current;
    if (!v) return;
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(finish, STALL_TIMEOUT_MS);
    };
    arm(); // start the clock: if nothing happens at all, we still bail out
    v.addEventListener("timeupdate", arm);
    v.addEventListener("progress", arm);
    return () => {
      window.clearTimeout(timer);
      v.removeEventListener("timeupdate", arm);
      v.removeEventListener("progress", arm);
    };
  }, [open, started]);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) v.play().catch(() => {}); // unmuting counts as a gesture
  };

  // Not playing the film: a plain black curtain. Opaque until we've decided
  // (covers the shell on first paint), then fades out to reveal the gate.
  if (!open) {
    if (curtainGone) return null;
    return (
      <div
        className={`fixed inset-0 z-[60] bg-black transition-opacity duration-500 ${
          decided ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      {/* The film is ALWAYS visible (it opens on black, so before the hold it
          simply reads as the dark stage). During the hold its flames grow
          through the dissolving cold emblem above it. No poster. */}
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        playsInline
        /* METADATA, not the whole film. It used to preload="auto", so every visitor
           downloaded 3.5MB of cinematic before the gate was usable, even though nobody
           had touched the screen yet and the film only ever plays if they hold. The
           browser now takes the header, and streams the rest the moment they ignite. */
        preload="metadata"
        onEnded={finish}
        onError={finish}
        /* Fill the whole screen. The film is 16:9, so object-contain letterboxed it with
           black bars above and below on a portrait phone. object-cover fills the phone
           instead, cropping a little off the sides (the action is centre-framed, so
           nothing important is lost); desktop, already ~16:9, sees no crop either way. */
        className="w-full h-full object-cover"
      />

      {/* LIGHT THE PYRE: darkness, embers, one instruction. Holding plays the
          film with sound from 0; fire rises from nothing under the visitor's
          finger while this chrome burns away on the film's clock. */}
      {!started && (
        <div
          ref={stageRef}
          role="button"
          tabIndex={0}
          aria-label="Press and hold to light the pyre"
          style={{ "--p": 0, WebkitTouchCallout: "none" } as React.CSSProperties}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            holdStart();
          }}
          onPointerUp={holdEnd}
          onPointerCancel={holdEnd}
          onKeyDown={(e) => {
            if (!e.repeat && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              holdStart();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === "Enter" || e.key === " ") holdEnd();
          }}
          className="absolute inset-0 z-10 overflow-hidden select-none touch-none cursor-pointer outline-none"
        >
          {/* Ember motes drifting over the dark; they hand over to the film's
              own sparks as it takes. */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ opacity: "calc(1 - var(--p))" }}
            aria-hidden
          >
            {EMBERS.map((style, i) => (
              <span key={i} className="ember" style={style} />
            ))}
          </div>

          {/* The instruction burns away as the fire takes. */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-[6vh] text-center">
            <p
              className="text-white/50 text-xs tracking-[0.18em] uppercase drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)]"
              style={{ opacity: "calc(0.9 - 0.9 * var(--p))" }}
            >
              Press and hold to light the pyre
            </p>
          </div>
        </div>
      )}

      {/* Playback chrome: only once the fire has caught. */}
      {started && (
        <>
          {/* Sound toggle: the designer's audio icon, the same control the
              tour's narration box uses, so mute looks identical app-wide. */}
          <button
            onClick={toggleSound}
            title={muted ? "Sound on" : "Mute"}
            aria-label={muted ? "Turn sound on" : "Mute"}
            className="absolute top-5 left-5 transition-transform duration-fast hover:scale-110 active:scale-95"
          >
            <img
              src={`${BASE_PATH}/world/ui/${muted ? "audio_off" : "audio_on"}.png`}
              alt=""
              draggable={false}
              className="h-8 w-auto select-none pointer-events-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
            />
          </button>

          {/* Skip, always available, never hidden: the designer's carved plate,
              matching the tour's controls. */}
          <div className="absolute bottom-5 right-5">
            <ImageButton name="skipintro" label="Skip intro" width={150} onClick={finish} />
          </div>
        </>
      )}
    </div>
  );
}
