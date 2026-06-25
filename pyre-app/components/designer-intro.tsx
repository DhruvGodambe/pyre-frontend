"use client";

/* Designer onboarding, shown on first visit to the gated preview so the
   designer immediately knows what this is, that the look is placeholder, what
   the controls do, and where to start. Re-openable via the "?" button.
   Mock-only (it's a design-preview aid); never shows in the real app. */

import { useEffect, useState } from "react";
import { USE_MOCK } from "@/lib/config";
import { storageGet, storageSet } from "@/lib/safe-storage";

const SEEN_KEY = "pyre_designer_intro_seen";

export function DesignerIntro() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
    // Yield to the user-facing Emberkeeper intro: don't auto-open over it on a
    // first visit. Once that's been seen (or skipped), this aid auto-opens for
    // the designer. The "?" button re-opens it any time regardless.
    const userIntroSeen = storageGet("pyre_intro_seen");
    if (userIntroSeen && !storageGet(SEEN_KEY)) setOpen(true);
  }, []);

  if (!USE_MOCK || !ready) return null;

  const dismiss = () => {
    setOpen(false);
    storageSet(SEEN_KEY, "1");
  };

  return (
    <>
      {/* Re-open button (bottom-right; the Design Preview switcher is bottom-left) */}
      <button
        onClick={() => setOpen(true)}
        title="What is this? Guide"
        className="fixed bottom-3 right-3 z-40 w-9 h-9 rounded-full bg-surface-2/95 border border-surface-3 text-brand shadow-panel backdrop-blur hover:border-brand transition-colors"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm"
          onClick={dismiss}
        >
          <div
            className="animate-entry w-full max-w-md rounded-panel bg-surface border border-surface-3/60 shadow-panel p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-3xl text-brand mb-1" aria-hidden>
                ✦
              </div>
              <h2 className="font-display text-2xl text-brand">Welcome. This is the PYRE app</h2>
              <p className="text-text-3 text-[11px] uppercase tracking-widest mt-1">
                Working skeleton · placeholder look
              </p>
            </div>

            <p className="text-text-2 text-sm">
              This is the real, working app wearing rough placeholder paint. Every screen and flow
              is already built. <span className="text-text">Your job is the look.</span> Judge the
              structure and what&rsquo;s on each screen, not the colours.
            </p>

            <ul className="space-y-2.5 text-sm text-text-2">
              <li>
                <b className="text-text">① Start at the Gate</b>, the glowing lantern. Click it to
                wake the village and connect.
              </li>
              <li>
                <b className="text-text">② Design Preview</b> (bottom-left): switch New wallet /
                Burning / Immolated to see every empty, locked and full state of each screen.
              </li>
              <li>
                <b className="text-text">③ Go mobile</b>: narrow the window; the village becomes the
                phone dashboard. Most users are on phones, so design mobile-first.
              </li>
              <li>
                <b className="text-text">④ One piece at a time</b>: we start with the Gate. You
                design it, we drop it in, you react, then the next piece.
              </li>
            </ul>

            <button
              onClick={dismiss}
              className="w-full rounded-md bg-brand text-bg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors"
            >
              Got it, let me explore
            </button>
          </div>
        </div>
      )}
    </>
  );
}
