"use client";

/* THE KEEPER'S BOX, the one dialogue chrome for everywhere the Emberkeeper
   speaks (the front door greeting, the guided tour narration).

   The look is the Variant-B forged design (see globals.css "THE KEEPER'S
   BOX"): a painted dark-bronze frame with live embers in the four corner
   plates (border-image, one asset fits every size), a charred-soot panel,
   the name on a forged plate riding the top edge, and the PRIMARY actions
   as forged plates riding the bottom edge (PlateButton). Secondary controls
   stay small inside the panel.

   ONE SIZE, ALWAYS: the box never grows with the script. KeeperText shows
   the narration through a fixed 3-line window and line-scrolls (teleprompter
   style) as the reveal advances, so a long beat and a short beat produce the
   exact same box. */

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from "react";
import { GameIcon } from "@/components/ui/game-icon";

/* ------------------------------------------------------------- KeeperBox */

export function KeeperBox({
  name = "The Emberkeeper",
  className = "",
  onClick,
  actions,
  children,
}: {
  /** The name on the forged plate riding the top edge. */
  name?: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLDivElement>;
  /** Primary actions, rendered as a row of plates riding the bottom edge. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`keeper-frame ${className}`} onClick={onClick}>
      <div className="keeper-plate">
        <span>{name}</span>
      </div>
      <div className="relative">{children}</div>
      {actions && <div className="keeper-actions">{actions}</div>}
    </div>
  );
}

/* ----------------------------------------------------------- PlateButton */

/* A forged plate straddling the frame's bottom border, the primary-action
   language of the keeper box (label is real HTML, so one blank plate asset
   serves every action). 52px tall on phones / 47px on desktop, per the
   Material/HIG touch-target floors. */
export function PlateButton({
  label,
  onClick,
  href,
  newTab,
  disabled,
  locked,
  title,
}: {
  label: string;
  onClick?: MouseEventHandler<HTMLElement>;
  /** Renders an anchor instead of a button (e.g. the Codex link). */
  href?: string;
  newTab?: boolean;
  disabled?: boolean;
  /** Sealed world-state, NOT a dead control: looks shut (grayscale + lock
      crest) but stays focusable and clickable so the tap can be ANSWERED
      (aria-disabled, never the native disabled attribute). The caller's
      onClick decides what the answer is. */
  locked?: boolean;
  title?: string;
}) {
  const inner = (
    <span>
      {locked && <GameIcon name="lock" size={20} className="mr-2 -mt-0.5" />}
      {label}
    </span>
  );
  const cls = "keeper-plate-btn" + (locked ? " keeper-plate-btn--locked" : "");
  if (href && !disabled && !locked) {
    return (
      <a
        href={href}
        onClick={onClick}
        title={title}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className={cls}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || locked}
      title={title}
      className={cls}
    >
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------ KeeperText */

/* The fixed narration window. `text` may contain "\n" paragraph breaks;
   `shown` is how many characters of it are revealed (the callers' existing
   typewriter / karaoke counters). The window is always `lines` lines tall;
   once the reveal passes the window, earlier lines slide up so the line
   being spoken is always the bottom visible one. */
export function KeeperText({
  text,
  shown,
  lines = 3,
  className = "",
}: {
  text: string;
  shown: number;
  lines?: number;
  className?: string;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // Words with their character offsets into `text` (spaces and "\n" count,
  // matching the callers' char-based reveal counters).
  const paragraphs = useMemo(() => {
    let i = 0;
    return text.split("\n").map((p) => ({
      words: p.split(" ").map((w) => {
        const start = i;
        i += w.length + 1; // the word + its separator
        return { w, start };
      }),
    }));
  }, [text]);

  // Keep the word currently being revealed on the window's last line.
  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const spans = inner.querySelectorAll<HTMLElement>("[data-start]");
    let last: HTMLElement | null = null;
    for (const s of spans) {
      if (Number(s.dataset.start) < shown) last = s;
      else break;
    }
    if (!last) {
      setOffset(0);
      return;
    }
    const lh = parseFloat(getComputedStyle(inner).lineHeight) || 23;
    const windowH = lh * lines;
    setOffset(Math.max(0, last.offsetTop + lh - windowH));
  }, [shown, lines, text]);

  return (
    <>
      <div
        className={`keeper-window ${className}`}
        style={{ "--klines": lines } as CSSProperties}
        aria-hidden
      >
        <div
          ref={innerRef}
          className="keeper-window-scroll"
          style={{ transform: `translateY(-${offset}px)` }}
        >
          {paragraphs.map((p, pi) => (
            <p key={pi} className={pi > 0 ? "mt-1.5" : undefined}>
              {p.words.map(({ w, start }, wi) => {
                const vis = Math.max(0, Math.min(w.length, shown - start));
                return (
                  <span key={wi} data-start={start}>
                    {w.slice(0, vis)}
                    <span className="opacity-0">{w.slice(vis)}</span>{" "}
                  </span>
                );
              })}
            </p>
          ))}
        </div>
      </div>
      <span className="sr-only">{text.replace(/\n/g, " ")}</span>
    </>
  );
}
