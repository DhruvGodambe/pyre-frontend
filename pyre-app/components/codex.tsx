"use client";

/* THE EMBER CODEX, the in-world documentation reader.

   - CodexReader: a full-screen reader (rendered once, globally, in AppShell).
     Chapter list on the side, the Emberkeeper's prose in the body. Opened from
     anywhere via useCodex().
   - CodexButton: the persistent tome button placed in both shells, so the docs
     are always one tap away, not buried in the tour or the gate.
   - CodexRiteLink: the contextual "Read the rite" link shown inside a building,
     opening the Codex straight to that building's chapter.

   Content + open/close state live in lib/codex/content.ts and lib/codex.tsx. */

import { useEffect } from "react";
import type { BuildingId } from "@/components/buildings";
import { useCodex } from "@/lib/codex";

/* Open-book glyph (placeholder until the designer ships a tome icon). */
function BookGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
      <path
        d="M12 5.5C10.5 4.3 8.4 3.8 6 4c-.9.07-1.5.8-1.5 1.7v11c0 1 .8 1.7 1.7 1.6 2-.16 3.9.3 5.3 1.4 1.4-1.1 3.3-1.56 5.3-1.4.9.08 1.7-.6 1.7-1.6v-11c0-.9-.6-1.63-1.5-1.7-2.4-.2-4.5.3-6 1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 5.5V18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

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
  const { chapter } = codex;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg animate-entry">
      {/* Warm stone wash behind everything, so the reader feels like part of the
          village, not a plain modal. */}
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(240,169,59,0.10), transparent 60%)" }}
        aria-hidden
      />

      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-surface-3/60 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <BookGlyph className="h-6 w-6 text-brand shrink-0" />
          <div className="min-w-0">
            <h2 className="font-display text-xl text-brand leading-none">The Ember Codex</h2>
            <p className="text-text-3 text-[11px] uppercase tracking-widest mt-1 truncate">
              Recorded by the Emberkeeper
            </p>
          </div>
        </div>
        <button
          onClick={codex.close}
          aria-label="Close the Codex"
          className="shrink-0 rounded-md text-text-3 hover:text-text-2 text-sm px-3 py-2 transition-colors"
        >
          Close ✕
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Chapter list: a scroll-strip on mobile, a sidebar on desktop. */}
        <nav className="shrink-0 border-b md:border-b-0 md:border-r border-surface-3/60 md:w-64 md:overflow-y-auto">
          <ul className="flex md:flex-col gap-1 overflow-x-auto p-2 md:p-3">
            {codex.chapters.map((c) => {
              const active = c.id === chapter.id;
              return (
                <li key={c.id} className="shrink-0 md:shrink">
                  <button
                    onClick={() => codex.setChapter(c.id)}
                    className={`w-full text-left rounded-md px-3 py-2 transition-colors ${
                      active ? "bg-brand/10 border border-brand/40" : "hover:bg-surface-2 border border-transparent"
                    }`}
                  >
                    <span className={`block font-display text-sm leading-tight ${active ? "text-brand" : "text-text-2"}`}>
                      {c.title}
                    </span>
                    <span className="hidden md:block text-text-3 text-[11px] leading-tight mt-0.5">
                      {c.tagline}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Chapter body */}
        <article className="flex-1 min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-2xl">
            <h1 className="font-display text-3xl sm:text-4xl text-brand">{chapter.title}</h1>
            <p className="text-text-3 text-xs uppercase tracking-widest mt-1">{chapter.tagline}</p>
            <div className="mt-6 space-y-6">
              {chapter.sections.map((s, i) => (
                <section key={i} className="space-y-3">
                  {s.heading && (
                    <h3 className="font-display text-lg text-text">{s.heading}</h3>
                  )}
                  {s.paragraphs?.map((p, j) => (
                    <p key={j} className="text-text-2 text-[15px] leading-relaxed">
                      {p}
                    </p>
                  ))}
                  {s.bullets && (
                    <ul className="space-y-1.5">
                      {s.bullets.map((b, j) => (
                        <li key={j} className="flex gap-2 text-text-2 text-[15px] leading-relaxed">
                          <span className="text-brand shrink-0" aria-hidden>
                            ✦
                          </span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
