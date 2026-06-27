"use client";

/* BUILDING AUDIO, the per-building background music.

   ONE persistent <audio> element, mounted for the whole awake world and just
   re-pointed at each building's track via the `src` prop (null = nothing open →
   fade out). Reusing a single element keeps the browser's autoplay permission
   warm and avoids the play() churn that made music play only sometimes.

   Two effects: one keyed on `src` (load/play/stop, with an autoplay-retry that
   is properly torn down), and a separate one for `muted` so toggling mute never
   re-runs play() or restarts the fade. */

import { useCallback, useEffect, useRef, useState } from "react";
import { asset } from "@/lib/config";

const MUTE_KEY = "pyre_world_muted";
const VOLUME = 0.45;

export function BuildingAudio({ src, volume = VOLUME }: { src: string | null; volume?: number }) {
  const elRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const lastSrc = useRef<string | null>(null);
  // The live target volume, read by the ramp without re-running the `src` effect,
  // so changing volume (e.g. dimming for the tour's voice-over) never restarts
  // playback, it just fades to the new level.
  const volRef = useRef(volume);
  volRef.current = volume;
  const [muted, setMuted] = useState(false);

  // Restore the shared mute choice once.
  useEffect(() => {
    setMuted(typeof localStorage !== "undefined" && localStorage.getItem(MUTE_KEY) === "1");
  }, []);

  // Smoothly ramp the element's volume to a target. Shared by the load/play
  // effect and the live-volume effect; stable so neither re-runs on the other.
  const fadeTo = useCallback((target: number, ms: number, done?: () => void) => {
    const el = elRef.current;
    if (!el) return;
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
  }, []);

  // Load / play / stop, driven by `src`. (Mute and volume are handled separately
  // so this doesn't re-run, and thus can't restart playback, on those changes.)
  useEffect(() => {
    if (!elRef.current) {
      const a = new Audio();
      a.loop = true;
      a.volume = 0;
      elRef.current = a;
    }
    const el = elRef.current;
    let cancelled = false;

    // Nothing open: fade out and pause, but KEEP the element.
    if (!src) {
      fadeTo(0, 350, () => el.pause());
      return () => cancelAnimationFrame(rafRef.current);
    }

    // Point at this building's track (only reload when it actually changed; we
    // track the raw prop because el.src reports a resolved absolute URL).
    if (lastSrc.current !== src) {
      el.src = asset(src);
      lastSrc.current = src;
    }
    el.volume = 0;
    // muted is applied by its own effect; the `muted` property silences without
    // touching volume, so the ramp target is always the current `volume`.
    const rampUp = () => {
      if (!cancelled) fadeTo(volRef.current, 800);
    };

    // Autoplay is usually blocked on first load (no user gesture yet), which left
    // the ambience silent until the next interaction happened to retrigger it.
    // So if the immediate play() is rejected, listen for the FIRST interaction of
    // ANY kind and keep trying until it actually starts, then stop listening.
    const GESTURES = ["pointerdown", "keydown", "touchstart"] as const;
    function disarm() {
      GESTURES.forEach((e) => document.removeEventListener(e, onGesture));
    }
    function onGesture() {
      if (cancelled) return disarm();
      el.play()
        .then(() => {
          disarm();
          rampUp();
        })
        .catch(() => {
          /* still blocked: stay armed for the next interaction */
        });
    }

    el.play()
      .then(rampUp)
      .catch(() => GESTURES.forEach((e) => document.addEventListener(e, onGesture)));

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      disarm();
    };
  }, [src]);

  // Live volume change (e.g. the tour dimming the ambience for its voice-over):
  // fade the playing track to the new level without reloading or restarting it.
  useEffect(() => {
    const el = elRef.current;
    if (el && !el.paused) fadeTo(volume, 600);
  }, [volume, fadeTo]);

  // Apply mute to the live element without restarting playback.
  useEffect(() => {
    if (elRef.current) elRef.current.muted = muted;
  }, [muted]);

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
      className="fixed bottom-3 right-3 z-40 rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-sm px-3 py-1.5 shadow-panel backdrop-blur hover:border-brand hover:text-brand transition-colors"
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}
