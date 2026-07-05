"use client";

/* THE EMBER CODEX BOOK: the one shared renderer for the medieval codex.

   Used by BOTH surfaces, so they cannot drift apart:
   - components/codex-page.tsx, the public /codex page (pyreprotocol.com/codex
     via the landing's rewrites), which passes no headerAction, the page is a
     dead-end reading room by design;
   - components/codex.tsx (CodexReader), the in-world overlay, which passes a
     Close button so a visitor mid-stake can consult the codex and drop back
     exactly where they were.

   The look: one dark desk texture behind everything, an aged book leaf cut
   out with real transparency lying on it, ink multiply-blended into the
   parchment, dark quiet chrome floating in the same darkness. */

import type { ReactNode } from "react";
import { BUILDING_BY_ID } from "@/components/buildings";
import { CODEX } from "@/lib/codex/content";
import { asset } from "@/lib/config";
import { CodexDiagram } from "@/components/codex-diagrams";
import { VillageHero } from "@/components/village-hero";

type Chapter = (typeof CODEX)[number];

/* Ink on parchment: dark enough to read like print. */
const INK = "#2e2113";
const INK_HEAD = "#5d2609";
const INK_SOFT = "#6b5233";
const INK_ACCENT = "#9c4a12";
const PLATE_FRAME = "border-2 border-[#9c7844]/60 rounded-md";

export function BookGlyph({ className = "" }: { className?: string }) {
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

export function CodexBook({
  chapterId,
  onChapter,
  headerAction,
  className = "",
}: {
  chapterId: string;
  onChapter: (id: string) => void;
  /** Optional control at the header's right edge (the reader's Close). */
  headerAction?: ReactNode;
  className?: string;
}) {
  const chapter = CODEX.find((c) => c.id === chapterId) ?? CODEX[0];

  const building = chapter.building ? BUILDING_BY_ID[chapter.building] : undefined;
  const iconSrc = building?.icon ?? chapter.icon;
  const heroSrc = building
    ? building.exterior ?? building.interior ?? building.art ?? ""
    : chapter.hero ?? "";
  const heroAlt = building ? `${building.name} in the Pyre kingdom` : chapter.heroAlt ?? "";

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col bg-[#14100c] ${className}`}>
      {/* ONE desk under everything: header, chapter list and page all sit on
          the same wood, so nothing can fail to blend. */}
      <img
        src={asset("/world/codex/desk.webp")}
        alt=""
        draggable={false}
        className="absolute inset-0 -z-10 h-full w-full object-cover select-none"
        aria-hidden
      />

      {/* Header: quiet lettering in the dark above the page. */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <BookGlyph className="h-6 w-6 text-brand shrink-0" />
          <div className="min-w-0">
            <h2 className="font-display text-xl text-brand leading-none">The Ember Codex</h2>
            <p className="text-text-3 text-[11px] uppercase tracking-widest mt-1 truncate">
              Official Pyre Protocol documentation
            </p>
          </div>
        </div>
        {headerAction}
      </header>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Chapter list: a scroll-strip on mobile, a sidebar on desktop,
            floating in the same dark as the page's backdrop. */}
        <nav className="shrink-0 md:w-72 md:overflow-y-auto">
          <ul className="flex md:flex-col gap-1 overflow-x-auto p-2 md:p-3">
            {CODEX.map((c) => {
              const active = c.id === chapter.id;
              const cbIcon = c.building ? BUILDING_BY_ID[c.building]?.icon : c.icon;
              return (
                <li key={c.id} className="shrink-0 md:shrink">
                  <button
                    onClick={() => onChapter(c.id)}
                    className={`w-full flex items-center gap-2.5 text-left rounded-md px-3 py-2 transition-colors ${
                      active
                        ? "bg-brand/10 border border-[#9c7844]/60"
                        : "hover:bg-[#241a10]/80 border border-transparent"
                    }`}
                  >
                    {cbIcon ? (
                      <img src={asset(cbIcon)} alt="" className="h-9 w-9 shrink-0 object-contain" />
                    ) : (
                      <span className="h-9 w-9 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-display text-base leading-tight ${
                          active ? "text-brand" : "text-[#d8b57a]"
                        }`}
                      >
                        {c.title}
                      </span>
                      <span className="hidden md:block text-text-3 text-xs leading-tight mt-0.5">
                        {c.tagline}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Chapter body: an old book leaf on the desk, the words inked on. */}
        <div className="relative flex-1 min-h-0">
          <img
            src={asset("/world/codex/leaf.webp")}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover lg:object-fill select-none lg:[filter:drop-shadow(0_16px_36px_rgba(0,0,0,0.55))]"
            aria-hidden
          />
          <article
            key={chapter.id}
            className="codex-ink codex-scroll codex-fade absolute inset-x-0 top-0 bottom-0 overflow-y-auto px-5 py-9 sm:px-10 lg:top-[4.5%] lg:bottom-[8%]"
          >
            <div className="mx-auto max-w-2xl pb-10">
              <div className="flex items-center gap-3">
                {iconSrc && (
                  <img
                    src={asset(iconSrc)}
                    alt=""
                    className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(60,35,10,0.45)]"
                  />
                )}
                <div className="min-w-0">
                  <h1
                    className="font-display text-3xl sm:text-4xl leading-tight"
                    style={{ color: INK_HEAD }}
                  >
                    {chapter.title}
                  </h1>
                  <p
                    className="mt-1 text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: INK_SOFT }}
                  >
                    {chapter.tagline}
                  </p>
                </div>
              </div>
              <div
                className="mt-4 h-px bg-gradient-to-r from-transparent via-[#8a6030]/70 to-transparent"
                aria-hidden
              />
              {heroSrc === "village" ? (
                <div
                  className={`mt-5 ${PLATE_FRAME} overflow-hidden shadow-[0_2px_10px_rgba(60,30,5,0.35)] [&_figure]:mt-0 [&_figure]:rounded-none [&_figure]:border-0 [&_figure]:bg-transparent`}
                >
                  <VillageHero />
                </div>
              ) : heroSrc ? (
                <img
                  src={asset(heroSrc)}
                  alt={heroAlt}
                  className={`mt-5 w-full ${PLATE_FRAME} shadow-[0_2px_10px_rgba(60,30,5,0.35)] [filter:sepia(0.15)_saturate(0.95)]`}
                />
              ) : null}
              <div className="mt-6 space-y-6">
                {chapter.sections.map((s, i) => (
                  <section key={i} className="space-y-3">
                    {s.heading && (
                      <h3 className="font-display text-xl" style={{ color: "#7a3a15" }}>
                        {s.heading}
                      </h3>
                    )}
                    {s.paragraphs?.map((p, j) => (
                      <p
                        key={j}
                        className={`codex-body${i === 0 && j === 0 ? " codex-lead" : ""}`}
                        style={{ color: INK }}
                      >
                        {p}
                      </p>
                    ))}
                    {s.bullets && (
                      <ul className="space-y-2">
                        {s.bullets.map((b, j) => (
                          <li key={j} className="codex-body flex gap-2" style={{ color: INK }}>
                            <span className="shrink-0" style={{ color: INK_ACCENT }} aria-hidden>
                              ✦
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {/* Illuminated plates paint their own borders and sit on
                        the parchment directly, like a figure printed on the leaf. */}
                    {s.diagram && <CodexDiagram id={s.diagram} />}
                  </section>
                ))}
              </div>
              <div className="mt-10 text-center text-sm" style={{ color: INK_SOFT }} aria-hidden>
                ✦ ✦ ✦
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
