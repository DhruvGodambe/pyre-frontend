"use client";

/* ============================================================================
   PYRE, Cinematic Intro  (the brand opening, shown before the world)
   ----------------------------------------------------------------------------
   When a visitor arrives, they first get the designer's Pyre_Intro film. It
   plays full-screen over a black stage; a clear "Skip intro →" lets anyone move
   straight to the world. When the film ends (or is skipped) it dismisses and the
   village / dashboard is revealed underneath, and, on a first visit, the
   Emberkeeper onboarding takes over from there.

   Gating:
     • Shows once per browser (localStorage "pyre_intro_video_seen"), so it lands
       on the first arrival but never nags on every refresh.
     • Force a replay any time with ?video=1 (or #video), for the team/designer
       to re-watch on demand without clearing storage.

   Sound: the film WANTS to be heard, so it plays with sound by default. Browsers
   block sound-on autoplay without a prior gesture (a first-time visitor with no
   interaction); when that happens we fall back to muted playback and the prominent
   "🔊 Sound on" control switches it on with one tap. On the designer portal the
   password login counts as a gesture, so sound usually plays straight away.
   Skip and the sound toggle are the only chrome, everything else is the film.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/config";

const SEEN_KEY = "pyre_intro_video_seen";
const VIDEO_SRC = `${BASE_PATH}/intro/pyre-intro.mp4`;
const POSTER_SRC = `${BASE_PATH}/intro/poster.webp`;

/* If the film stalls (buffering / decode hiccup) and never recovers, don't trap
   the visitor on a frozen frame, auto-dismiss after this long with no progress. */
const STALL_TIMEOUT_MS = 12000;

/* localStorage can THROW (Safari Private Mode, disabled storage, quota full), not
   just return null. A throw here must never break the intro: reads fall back to
   "not seen yet", and a failed write must NOT stop the film from dismissing. */
const seenIntro = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode / full / blocked: just don't remember it, the film still ends */
  }
};

export function PyreIntro() {
  const [open, setOpen] = useState(false);
  const [decided, setDecided] = useState(false);
  const [curtainGone, setCurtainGone] = useState(false);
  const [muted, setMuted] = useState(false); // sound ON by default
  const videoRef = useRef<HTMLVideoElement>(null);

  // Decide on the client (localStorage + URL) whether to play. Until we've
  // decided, an opaque branded curtain covers the app (rendered from the first
  // paint, so the village shell never flashes through behind the intro).
  useEffect(() => {
    const force =
      new URLSearchParams(window.location.search).has("video") ||
      window.location.hash === "#video";
    setOpen(force || !seenIntro());
    setDecided(true);
  }, []);

  // When we're NOT showing the film (returning visitor, or after it ends), fade
  // the curtain out and then drop it, so the world is revealed smoothly.
  useEffect(() => {
    if (!decided || open) return;
    const t = setTimeout(() => setCurtainGone(true), 550);
    return () => clearTimeout(t);
  }, [decided, open]);

  // Play SMOOTHLY on slow connections: wait until the browser has buffered enough
  // to play through before starting, instead of playing frames as they trickle in
  // (which causes the buffer → play-a-little → stall → repeat stutter). The poster
  // shows meanwhile. Plays WITH sound; if sound-on autoplay is refused (no prior
  // gesture) we fall back to muted so the film still rolls, and the "Sound on"
  // control unmutes it.
  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      v.muted = false;
      v.play()
        .then(() => !cancelled && setMuted(false))
        .catch(() => {
          if (cancelled) return;
          v.muted = true;
          setMuted(true);
          v.play().catch(() => {});
        });
    };

    // HAVE_ENOUGH_DATA (4) = the browser estimates it can reach the end without
    // stalling. If we're already there, go; otherwise wait for canplaythrough.
    if (v.readyState >= 4) start();
    else v.addEventListener("canplaythrough", start, { once: true });

    return () => {
      cancelled = true;
      v.removeEventListener("canplaythrough", start);
    };
  }, [open]);

  const finish = () => {
    // Dismiss FIRST, then try to remember it. If persistence throws (blocked
    // storage), the film must still go away, not trap the visitor on a frame.
    setOpen(false);
    markSeen();
  };

  // Safety net: if the film never makes progress (stuck buffering / decode hiccup,
  // a frozen frame with the page "still loading"), auto-dismiss so nobody is
  // stranded. The timer resets on every bit of real playback progress; it only
  // fires when playback has genuinely stalled.
  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(finish, STALL_TIMEOUT_MS);
    };
    arm(); // start the clock: if nothing happens at all, we still bail out
    // Reset on real playback progress OR download progress, so a slow-but-loading
    // film is never cut off; the timer only fires when BOTH have genuinely stalled.
    v.addEventListener("timeupdate", arm);
    v.addEventListener("progress", arm);
    return () => {
      window.clearTimeout(timer);
      v.removeEventListener("timeupdate", arm);
      v.removeEventListener("progress", arm);
    };
  }, [open]);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) v.play().catch(() => {}); // unmuting counts as a gesture
  };

  // Not playing the film: a plain black curtain. Opaque until we've decided
  // (covers the shell on first paint), then fades out to reveal the world. No
  // text, the film is dark, so this reads as the lights going down, not a card.
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
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        poster={POSTER_SRC}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="w-full h-full object-contain"
      />

      {/* No text placeholder — the poster frame shows while the film buffers. */}

      {/* Sound toggle, prominent, because the film wants to be heard. */}
      <button
        onClick={toggleSound}
        className="absolute top-5 left-5 rounded-full bg-black/55 border border-white/15 text-white/90 text-sm px-4 py-2 backdrop-blur hover:border-brand hover:text-brand transition-colors"
      >
        {muted ? "🔊 Sound on" : "🔇 Mute"}
      </button>

      {/* Skip, always available, never hidden. */}
      <button
        onClick={finish}
        className="absolute bottom-5 right-5 rounded-full bg-black/55 border border-white/15 text-white/90 text-sm px-5 py-2.5 backdrop-blur hover:border-brand hover:text-brand transition-colors"
      >
        Skip intro →
      </button>
    </div>
  );
}
