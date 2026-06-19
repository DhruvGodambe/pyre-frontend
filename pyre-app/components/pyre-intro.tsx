"use client";

/* ============================================================================
   PYRE — Cinematic Intro  (the brand opening, shown before the world)
   ----------------------------------------------------------------------------
   When a visitor arrives, they first get the designer's Pyre_Intro film. It
   plays full-screen over a black stage; a clear "Skip intro →" lets anyone move
   straight to the world. When the film ends (or is skipped) it dismisses and the
   village / dashboard is revealed underneath — and, on a first visit, the
   Emberkeeper onboarding takes over from there.

   Gating:
     • Shows once per browser (localStorage "pyre_intro_video_seen"), so it lands
       on the first arrival but never nags on every refresh.
     • Force a replay any time with ?video=1 (or #video) — for the team/designer
       to re-watch on demand without clearing storage.

   Autoplay reality: browsers block sound-on autoplay, so the film starts MUTED
   and we surface a prominent "🔊 Sound on" control. Skip and the sound toggle
   are the only chrome — everything else is the film.
   ========================================================================== */

import { useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/config";

const SEEN_KEY = "pyre_intro_video_seen";
const VIDEO_SRC = `${BASE_PATH}/intro/pyre-intro.mp4`;

export function PyreIntro() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [started, setStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Decide on the client (localStorage + URL) whether to play.
  useEffect(() => {
    setReady(true);
    const force =
      new URLSearchParams(window.location.search).has("video") ||
      window.location.hash === "#video";
    if (force || !localStorage.getItem(SEEN_KEY)) setOpen(true);
  }, []);

  const finish = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    if (!next) v.play().catch(() => {}); // unmuting counts as a gesture
  };

  if (!ready || !open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={VIDEO_SRC}
        autoPlay
        muted={muted}
        playsInline
        preload="auto"
        onPlaying={() => setStarted(true)}
        onEnded={finish}
        className="w-full h-full object-contain"
      />

      {/* Loading shimmer until the film is actually painting frames. */}
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-display text-brand/80 text-xl tracking-[0.3em] uppercase animate-pulse">
            PYRE
          </span>
        </div>
      )}

      {/* Sound toggle — prominent, because the film wants to be heard. */}
      <button
        onClick={toggleSound}
        className="absolute top-5 left-5 rounded-full bg-black/55 border border-white/15 text-white/90 text-sm px-4 py-2 backdrop-blur hover:border-brand hover:text-brand transition-colors"
      >
        {muted ? "🔊 Sound on" : "🔇 Mute"}
      </button>

      {/* Skip — always available, never hidden. */}
      <button
        onClick={finish}
        className="absolute bottom-5 right-5 rounded-full bg-black/55 border border-white/15 text-white/90 text-sm px-5 py-2.5 backdrop-blur hover:border-brand hover:text-brand transition-colors"
      >
        Skip intro →
      </button>
    </div>
  );
}
