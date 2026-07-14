/* IMAGE PRELOAD, warm the browser's cache for art we know is seconds away.

   The sibling of lib/audio-preload.ts, and it exists for the same reason. A CSS
   image (a border-image, a background) is not fetched when the stylesheet loads:
   the browser waits until an element actually carrying that class renders. So the
   keeper box's forged frame only STARTS downloading at the moment the box mounts,
   which is also the moment its text appears and its voice speaks. On a cold visit
   that means the words arrive before the chrome they sit in, and the Ashwarden
   talks over an empty scene until the frame paints.

   Warming here fetches the same URL early, so the CSS paints from cache.

   Resolves once every image has loaded OR failed. A missing file must not hang the
   thing waiting on it, so a failure resolves exactly like a success: the caller
   carries on and the CSS falls back to its own background. */

import { asset } from "./config";

const warmed = new Map<string, Promise<void>>();

/** Kick off a background fetch for each image. Safe to call repeatedly: a URL is
    only ever fetched once per session, and later calls await the same promise. */
export function preloadImages(srcs: string[]): Promise<void> {
  if (typeof window === "undefined" || typeof Image === "undefined") return Promise.resolve();
  return Promise.all(
    srcs.map((src) => {
      const url = asset(src);
      let p = warmed.get(url);
      if (!p) {
        p = new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
          // Already in cache and decoded: some browsers fire no event at all.
          if (img.complete) resolve();
        });
        warmed.set(url, p);
      }
      return p;
    })
  ).then(() => undefined);
}
