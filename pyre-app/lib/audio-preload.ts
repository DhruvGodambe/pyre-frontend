/* AUDIO PRELOAD, warm the browser's cache for clips we know we'll play soon.

   The gate voice and the one-shot SFX are created with `new Audio(src)` at the
   moment they play (see components/front-door.tsx and lib/sfx.ts). On a slow or
   contended connection that means a fetch + decode right when the sound should
   fire, so the voice stalls (and the gate's 2s watchdog can bail to the silent
   typewriter) and the first door/zoom click lags.

   Warming works by kicking off the fetch early with preload="auto". Once the
   file is in the HTTP cache, the later `new Audio()` for the same URL plays from
   cache with no network wait. We keep the warming elements in a module-level set
   so they aren't garbage-collected mid-download, and dedupe so a URL is only ever
   warmed once per session. */

import { asset } from "./config";

const warmed = new Set<string>();
// Hold references so in-flight preloads aren't GC'd before they finish.
const held: HTMLAudioElement[] = [];

/** Kick off a background fetch for each clip so a later play() is cache-hot.
    Safe to call repeatedly and with URLs that 404 (they just fail silently). */
export function preloadAudio(srcs: string[]): void {
  if (typeof window === "undefined" || typeof Audio === "undefined") return;
  for (const src of srcs) {
    const url = asset(src);
    if (warmed.has(url)) continue;
    warmed.add(url);
    try {
      const a = new Audio();
      a.preload = "auto";
      a.src = url;
      // load() begins buffering without playing; the element stays muted/paused.
      a.load();
      held.push(a);
    } catch {
      /* no Audio support: nothing to warm */
    }
  }
}
