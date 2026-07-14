/* ============================================================================
   PYRE, UI primitives (token-driven, intentionally plain)
   ----------------------------------------------------------------------------
   The shared building blocks every panel is made of. They reference ONLY design
   tokens (bg-surface, text-brand, rounded-panel…), so when the designer's look
   lands in globals.css, these, and therefore the whole app, restyle at once.
   Deliberately rough now: this is the skeleton, not the final paint.
   ========================================================================== */

"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { asset } from "@/lib/config";

/* Carved frame skins for the framed Panel. A thick textured border (wood grain
   or hewn stone) with beveled, carved edges wraps a recessed translucent
   interior, so a panel reads like a wooden plaque / stone tablet hung on the
   tavern wall, the warm interior still glowing through. CSS-only (no asset), so
   we can dial the look live; swap to a real designer texture later. */
type FrameSkin = "wood" | "stone" | "forged";
/* Each skin fully defines the outer <section> style (it owns its own thickness,
   via padding for a textured band or a border for a nine-sliced frame) plus the
   corner radius the recessed interior should use. */
const FRAME_SKINS: Record<Exclude<FrameSkin, "forged">, { outer: CSSProperties; innerRadius: number }> = {
  wood: {
    innerRadius: 7,
    outer: {
      // REAL timber: a tiled wood-plank texture (designer reference) carries the
      // grain/plank detail a flat gradient never could. A warm multiply overlay
      // sinks it into our palette (lighter at top, deeper at the bottom) and the
      // bevel box-shadows carve the edges so it reads as a framed wooden plaque.
      padding: 20,
      borderRadius: 14,
      background: [
        "linear-gradient(180deg, rgba(46,26,10,0.18), rgba(18,9,3,0.5))", // depth overlay (multiply)
        `url(${asset("/world/ui/wood_planks.png")})`, // plank texture (tiled)
      ].join(", "),
      backgroundSize: "auto, 160px",
      backgroundRepeat: "no-repeat, repeat",
      backgroundBlendMode: "multiply, normal",
      boxShadow: [
        "0 12px 30px rgba(0,0,0,0.5)", // drop
        "inset 0 0 0 1.5px rgba(0,0,0,0.55)", // carved outer rim
        "inset 0 2px 0 rgba(255,214,150,0.18)", // top highlight
        "inset 0 -5px 8px rgba(0,0,0,0.4)", // bottom shade
      ].join(", "),
    },
  },
  stone: {
    innerRadius: 6,
    outer: {
      // Plain hewn-stone band (no tiled blocks, the user found those ugly): a
      // grey gradient with a faint chiselled texture + carved bevel edges.
      padding: 18,
      borderRadius: 12,
      background: [
        "radial-gradient(120% 120% at 30% 8%, rgba(255,255,255,0.06), transparent 42%)", // light catch
        "repeating-linear-gradient(38deg, rgba(0,0,0,0.10) 0 2px, transparent 2px 8px)", // hewn texture
        "linear-gradient(160deg, #595049 0%, #3e3833 60%, #2c2724 100%)", // base stone
      ].join(", "),
      boxShadow: [
        "0 12px 30px rgba(0,0,0,0.5)",
        "inset 0 0 0 1px rgba(0,0,0,0.5)",
        "inset 0 2px 0 rgba(255,255,255,0.10)",
        "inset 0 -5px 7px rgba(0,0,0,0.4)",
      ].join(", "),
    },
  },
};

/* The recessed translucent interior, shared by both skins: warm fire-lit scrim
   + soft bottom ember glow + backdrop blur, sunk into the frame with an inner
   shadow so it reads carved-in, not stuck-on. */
const FRAME_INTERIOR: CSSProperties = {
  background:
    "radial-gradient(120% 78% at 50% 100%, rgba(255,138,46,0.14), transparent 60%), linear-gradient(180deg, rgba(32,20,13,0.62), rgba(18,11,7,0.74))",
  backdropFilter: "blur(3px) saturate(1.08)",
  WebkitBackdropFilter: "blur(3px) saturate(1.08)",
  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,200,140,0.06)",
};

/* --- Panel: the card every feature lives in ----------------------------- */
export function Panel({
  title,
  tagline,
  action,
  children,
  className = "",
  frame = false,
  bg,
}: {
  title?: string;
  tagline?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Carved frame around a translucent interior. `true` = wood (default skin),
      or pick "wood" / "stone" explicitly. Opt-in, so only framed panels change. */
  frame?: boolean | FrameSkin;
  /** Swap the panel's interior FILL without touching the frame. "stone" lays the
      brick_bg texture over the forged frame's charred interior. Opt-in. */
  bg?: "stone";
}) {
  // The forged skin: the keeper box's blackened-iron chrome (same border-image
  // frame, same forged name plate riding the top edge), so the buildings speak
  // the language the visitor already met at the gate and in the tour. The title
  // moves ONTO the plate; the tagline stays inside as the first line.
  if (frame === "forged") {
    // IDENTICAL to the tour panel (KeeperBox): the keeper-frame border-image draws
    // the ornate lava-corner iron frame AND fills its own charred/ember interior,
    // so every building panel reads as the exact same forged panel the visitor met
    // on the guided tour. No extra stone overlay (that made building panels differ
    // from the tour panel).
    return (
      <section className={`keeper-frame ${bg === "stone" ? "keeper-frame--stone " : ""}${className}`}>
        {title && (
          <div className="keeper-plate">
            <span>{title}</span>
          </div>
        )}
        <div className="relative">
          {(tagline || action) && (
            <header className="flex items-baseline justify-between mb-4">
              {tagline && (
                <p className="text-text-3 text-xs uppercase tracking-widest">{tagline}</p>
              )}
              {action}
            </header>
          )}
          {children}
        </div>
      </section>
    );
  }
  if (frame) {
    const skin = FRAME_SKINS[frame === true ? "wood" : frame];
    return (
      <section className={`relative ${className}`} style={skin.outer}>
        <div
          className="relative p-5 sm:p-6"
          style={{ ...FRAME_INTERIOR, borderRadius: skin.innerRadius }}
        >
          {(title || action) && (
            <header className="flex items-baseline justify-between mb-4">
              <div>
                {title && (
                  <h2 className="font-display text-2xl text-text leading-none">{title}</h2>
                )}
                {tagline && (
                  <p className="text-text-3 text-xs mt-1 uppercase tracking-widest">{tagline}</p>
                )}
              </div>
              {action}
            </header>
          )}
          {children}
        </div>
      </section>
    );
  }
  return (
    <section
      className={`rounded-panel bg-surface shadow-panel border border-surface-3/60 p-5 ${className}`}
    >
      {(title || action) && (
        <header className="flex items-baseline justify-between mb-4">
          <div>
            {title && (
              <h2 className="font-display text-2xl text-text leading-none">{title}</h2>
            )}
            {tagline && (
              <p className="text-text-3 text-xs mt-1 uppercase tracking-widest">{tagline}</p>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/* --- Stat: a labelled number ------------------------------------------- */
export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-text-3 text-xs uppercase tracking-wider">{label}</span>
      <span className={`tabular text-xl ${accent ? "text-brand" : "text-text"}`}>{value}</span>
      {sub && <span className="text-text-2 text-xs">{sub}</span>}
    </div>
  );
}

/* --- Button ------------------------------------------------------------- */
/* Four reusable variants sharing one shape + one focus ring, so every panel's
   plain (non-diegetic) actions read as one family:
     • primary   , the molten fill, the single most important action on a screen
     • secondary , a warm-tinted brand action, second-tier but still "ours"
     • ghost     , a quiet neutral action (Cancel, toggles, back)
     • danger    , destructive / loss (unstake loss, reject). "destructive" alias.
   The ornate baked-art actions the designer drew (Burn, Stake…) use ImageButton
   instead; this family covers everything else. */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "destructive";
type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: ButtonProps) {
  // PRIMARY is the forged plate: the designer's blanked ornate plate as a
  // border-image (globals: .forged-btn), so any live label rides gilded stone
  // at any width. The label is wrapped so it sits above the plate art.
  if (variant === "primary") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`forged-btn ${className}`}
      >
        <span>{children}</span>
      </button>
    );
  }
  // Second-tier actions keep the pill shape but wear the carved bronze rim, so
  // they read as the same metal family without competing with the plate.
  const styles: Record<Exclude<ButtonVariant, "primary">, string> = {
    secondary:
      "border border-frame/60 bg-gradient-to-b from-surface-2 to-surface text-brand-soft shadow-[inset_0_1px_0_rgba(255,214,150,0.06)] hover:border-frame-strong hover:text-brand",
    ghost:
      "border border-surface-3 bg-surface-2/70 text-text hover:bg-surface-3 hover:border-frame/50",
    danger:
      "border border-danger/45 bg-danger/12 text-danger hover:bg-danger/22 hover:border-danger/70",
    destructive:
      "border border-danger/45 bg-danger/12 text-danger hover:bg-danger/22 hover:border-danger/70",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`rounded-md px-4 py-2.5 text-sm font-medium transition-[background-color,border-color,transform,box-shadow] duration-fast disabled:opacity-40 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* --- Progress bar / ring ------------------------------------------------ */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-text-3 text-xs">{label}</span>}
      <div className="pyre-bar">
        <div className="pyre-bar-trough">
          <div
            className="pyre-bar-fill"
            style={{ width: pct <= 0 ? 0 : `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* --- Badge (stage chip, LP/Immolated markers) -------------------------- */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "danger";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-3 text-text-2",
    brand: "bg-brand/15 text-brand border border-brand/40",
    success: "bg-success/15 text-success",
    danger: "bg-danger/15 text-danger",
  };
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* --- SegmentedControl: forged toggle / tabs ----------------------------
   The themed replacement for the plain amber-pill rows (Buy·Sell, Stake·
   Unstake, Auto·Custom). Recessed track, the active segment lifts to warm-lit
   stone. Controlled. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`seg ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value}
          onClick={() => onChange(o.value)}
          className="seg-item capitalize"
        >
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/* --- Chip: forged filter / quick-pick pill -----------------------------
   The gold-outlined stone chip (globals: .chip). One shared control for tier
   filters, variant filters, and quick-fill picks, so a bar of them reads as
   one family instead of mixed plain + ornate. */
export function Chip({
  active = false,
  onClick,
  children,
  ariaLabel,
  className = "",
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-active={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`chip ${className}`}
    >
      {children}
    </button>
  );
}

/* --- Select: themed dropdown (replaces native <select>) ----------------
   A forged-well trigger + a carved popover list. Closes on click-outside /
   Escape. Keeps the theme where a native <select> would punch an OS-grey hole
   through it (the Black Market Sort control). */
export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
  align = "right",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className="forged-field flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-2 hover:text-text outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
      >
        <span className="truncate">{current?.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-brand transition-transform duration-fast ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-30 mt-1.5 min-w-[11rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-frame/60 bg-surface py-1 shadow-panel ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o) => {
            const sel = o.value === value;
            return (
              <li key={o.value} role="option" aria-selected={sel}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-xs transition-colors duration-fast ${
                    sel ? "bg-brand/10 text-brand" : "text-text-2 hover:bg-surface-2 hover:text-text"
                  }`}
                >
                  {o.label}
                  {sel && (
                    <span className="text-brand text-[8px]" aria-hidden>
                      ◆
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* --- Field: labelled amount input -------------------------------------- */
export function Field({
  label,
  value,
  onChange,
  placeholder = "0.0",
  suffix,
  readOnly = false,
  hint,
}: {
  label?: string;
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  suffix?: ReactNode;
  /** Derived value the user can't edit (e.g. a paired amount computed from a price). */
  readOnly?: boolean;
  /** Small line under the field, e.g. "auto-calculated from the pool price". */
  hint?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-text-3 text-xs uppercase tracking-wider">{label}</span>}
      <div className={`forged-field flex items-center gap-2 px-3 py-2.5 ${readOnly ? "opacity-90" : ""}`}>
        <input
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          onChange={(e) => onChange?.(e.target.value)}
          className={`tabular flex-1 bg-transparent outline-none text-lg min-w-0 placeholder:text-text-3/60 ${
            readOnly ? "cursor-default text-text-2" : "text-text"
          }`}
        />
        {suffix && <span className="text-brand-soft/80 text-sm font-medium shrink-0">{suffix}</span>}
      </div>
      {hint && <span className="text-text-3 text-[11px]">{hint}</span>}
    </label>
  );
}
