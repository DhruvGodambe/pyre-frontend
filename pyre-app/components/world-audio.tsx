"use client";

/* BUILDING AUDIO, the per-building background music.

   ONE persistent <audio> element, mounted for the whole awake world and just
   re-pointed at each building's track via the `src` prop (null = nothing open →
   fade out). Reusing a single element is deliberate: creating/destroying an
   Audio per building (the old approach) churned the browser's autoplay
   permission and, under React StrictMode's double-invoke, interrupted play()
   mid-start, so music played only sometimes. Entering a building is a click, so
   autoplay is allowed; if the browser still refuses, we retry on the next
   pointer gesture. A single persisted mute toggle is shared across buildings. */

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/config";

const MUTE_KEY = "pyre_world_muted";
const VOLUME = 0.45;

export function BuildingAudio({ src }: { src: string | null }) {
  const elRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const [muted, setMuted] = useState(false);

  // Restore the shared mute choice once.
  useEffect(() => {
    setMuted(typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1");
  }, []);

  // Drive the single persistent element from `src`.
  useEffect(() => {
    if (!elRef.current) {
      const a = new Audio();
      a.loop = true;
      a.volume = 0;
      elRef.current = a;
    }
    const el = elRef.current;

    const fadeTo = (target: number, ms: number, done?: () => void) => {
      cancelAnimationFrame(rafRef.current);
      const from = el.volume;
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        el.volume = from + (target - from) * k;
        if (k < 1) rafRef.current = requestAnimationFrame(step);
        else done?.();
      };
      rafRef.current = requestAnimationFrame(step);
    };

    // Nothing open: fade the current track out and pause, but KEEP the element.
    if (!src) {
      fadeTo(0, 350, () => el.pause());
      return () => cancelAnimationFrame(rafRef.current);
    }

    // Point the element at this building's track (only reload if it changed).
    const full = asset(src);
    if (!el.src.endsWith(src)) el.src = full;
    el.muted = muted;
    el.volume = 0;

    const rampUp = () => fadeTo(muted ? 0 : VOLUME, 800);
    el.play()
      .then(rampUp)
      .catch(() => {
        // Autoplay blocked (no warm gesture): start on the next click anywhere.
        const onGesture = () => {
          document.removeEventListener("pointerdown", onGesture);
          el.play().then(rampUp).catch(() => {});
        };
        document.addEventListener("pointerdown", onGesture, { once: true });
      });

    return () => cancelAnimationFrame(rafRef.current);
  }, [src, muted]);

  // Stop on true unmount (leaving the awake world). Keep the ref so StrictMode's
  // remount reuses the same element instead of spawning a new one.
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
      elRef.current?.pause();
    },
    []
  );

  const toggle = () =>
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        /* private mode / disabled storage: keep it in memory */
      }
      return next;
    });

  // No control when nothing is playing.
  if (!src) return null;

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
