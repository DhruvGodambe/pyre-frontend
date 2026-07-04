"use client";

/* THE EMBER CODEX, the in-world documentation reader.

   - CodexReader: a full-screen reader (rendered once, globally, in AppShell),
     the same medieval book as the public /codex page (shared CodexBook), plus
     a Close button: a visitor mid-stake can consult the codex and drop back
     exactly where they were. Opened from anywhere via useCodex().
   - CodexButton: the persistent tome button placed in both shells, so the docs
     are always one tap away, not buried in the tour or the gate.
   - CodexRiteLink: the contextual "Read the rite" link shown inside a building,
     opening the Codex straight to that building's chapter.

   Content + open/close state live in lib/codex/content.ts and lib/codex.tsx. */

import { useEffect } from "react";
import { type BuildingId } from "@/components/buildings";
import { useCodex } from "@/lib/codex";
import { BookGlyph, CodexBook } from "@/components/codex-book";

/* The persistent entry button. Drop it in a shell with positioning via className. */
export function CodexButton({ className = "" }: { className?: string }) {
  const codex = useCodex();
  return (
    <button
      onClick={() => codex.open()}
      aria-label="Open the Ember Codex"
      className={`inline-flex items-center gap-2 rounded-full bg-surface-2/95 border border-brand/40 text-brand text-xs px-3 py-1.5 shadow-panel backdrop-blur hover:border-brand hover:bg-surface-2 transition-colors ${className}`}
    >
      <BookGlyph className="h-4 w-4" />
      <span className="font-display tracking-wide">The Codex</span>
    </button>
  );
}

/* Contextual link for inside a building: opens the Codex to its chapter. */
export function CodexRiteLink({ building, className = "" }: { building: BuildingId; className?: string }) {
  const codex = useCodex();
  return (
    <button
      onClick={() => codex.openBuilding(building)}
      className={`inline-flex items-center gap-1.5 text-text-3 text-xs hover:text-brand transition-colors ${className}`}
    >
      <BookGlyph className="h-3.5 w-3.5" />
      Read the rite
    </button>
  );
}

export function CodexReader() {
  const codex = useCodex();

  // Close on Escape.
  useEffect(() => {
    if (!codex.isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") codex.close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [codex.isOpen, codex]);

  if (!codex.isOpen) return null;

  return (
    <CodexBook
      chapterId={codex.chapter.id}
      onChapter={codex.setChapter}
      className="animate-entry"
      headerAction={
        <button
          onClick={codex.close}
          aria-label="Close the Codex"
          className="shrink-0 rounded-md border border-[#9c7844]/60 bg-[#241a10]/85 px-3 py-1.5 font-display text-sm text-[#d8b57a] shadow-[0_2px_8px_rgba(0,0,0,0.5)] transition-colors hover:border-brand/70 hover:text-brand"
        >
          Close ✕
        </button>
      }
    />
  );
}
