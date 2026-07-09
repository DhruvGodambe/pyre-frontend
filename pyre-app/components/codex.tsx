"use client";

/* THE EMBER CODEX, the in-world documentation reader.

   - CodexReader: a full-screen reader (rendered once, globally, in AppShell),
     the same medieval book as the public /codex page (shared CodexBook), plus
     a Close button: a visitor mid-stake can consult the codex and drop back
     exactly where they were. Opened from anywhere via useCodex().
   - CodexButton: the persistent tome button placed in both shells, so the docs
     are always one tap away, not buried in the tour or the gate. Uses the
     designer's engraved frame art (book glyph + "The Codex"), same family as
     the Replay tour button beside it.

   Content + open/close state live in lib/codex/content.ts and lib/codex.tsx. */

import { useEffect } from "react";
import { useCodex } from "@/lib/codex";
import { CodexBook } from "@/components/codex-book";
import { ImageButton } from "@/components/ui/image-button";

/* The persistent entry button. Drop it in a shell with positioning via className. */
export function CodexButton({ className = "", width = 165 }: { className?: string; width?: number | string }) {
  const codex = useCodex();
  return (
    <ImageButton
      name="codex"
      label="Open the Ember Codex"
      width={width}
      onClick={() => codex.open()}
      className={className}
    />
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
