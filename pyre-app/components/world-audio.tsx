"use client";

/* BUILDING AUDIO, the per-building background music.
   Mounted by the shell while a building is open (its exterior view or inside).
   Plays that building's looping track, fades in on enter and out on leave, and
   carries a single persisted mute toggle (shared across buildings). Entering a
   building is a click, so autoplay is allowed; if the browser still refuses,
   play() rejects quietly and the mute button lets the user start it. */

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/config";

const MUTE_KEY = "pyre_world_muted";
const VOLUME = 0.45;

export function BuildingAudio({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  // Create + play the loop for this building. Re-runs when the building changes.
  useEffect(() => {
    const startMuted =
      typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
    setMuted(startMuted);

    const a = new Audio(asset(src));
    a.loop = true;
    a.volume = 0;
    a.muted = startMuted;
    audioRef.current = a;

    let raf = 0;
    a.play()
      .then(() => {
        const start = performance.now();
        const tick = (t: number) => {
          a.volume = VOLUME * Math.min(1, (t - start) / 800); // fade in over 800ms
          if (a.volume < VOLUME) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => {});

    return () => {
      cancelAnimationFrame(raf);
      const start = performance.now();
      const from = a.volume;
      const out = (t: number) => {
        const k = Math.min(1, (t - start) / 350); // fade out over 350ms
        a.volume = from * (1 - k);
        if (k < 1) requestAnimationFrame(out);
        else {
          a.pause();
          a.src = "";
        }
      };
      requestAnimationFrame(out);
      audioRef.current = null;
    };
  }, [src]);

  // Apply mute toggles to the live element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  const toggle = () =>
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* private mode / disabled storage: just keep it in memory */
      }
      return next;
    });

  return (
    <button
      onClick={toggle}
      title={muted ? "Unmute music" : "Mute music"}
      aria-label={muted ? "Unmute music" : "Mute music"}
      className="fixed bottom-3 left-3 z-40 rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-sm px-3 py-1.5 shadow-panel backdrop-blur hover:border-brand hover:text-brand transition-colors"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
