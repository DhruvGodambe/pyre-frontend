/* ============================================================================
   PYRE, UI primitives (token-driven, intentionally plain)
   ----------------------------------------------------------------------------
   The shared building blocks every panel is made of. They reference ONLY design
   tokens (bg-surface, text-brand, rounded-panel…), so when the designer's look
   lands in globals.css, these, and therefore the whole app, restyle at once.
   Deliberately rough now: this is the skeleton, not the final paint.
   ========================================================================== */

import type { CSSProperties, ReactNode } from "react";
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
}: {
  title?: string;
  tagline?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Carved frame around a translucent interior. `true` = wood (default skin),
      or pick "wood" / "stone" explicitly. Opt-in, so only framed panels change. */
  frame?: boolean | FrameSkin;
}) {
  // The forged skin: the keeper box's blackened-iron chrome (same border-image
  // frame, same forged name plate riding the top edge), so the buildings speak
  // the language the visitor already met at the gate and in the tour. The title
  // moves ONTO the plate; the tagline stays inside as the first line.
  if (frame === "forged") {
    return (
      <section className={`keeper-frame ${className}`}>
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
type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: ButtonProps) {
  const styles: Record<string, string> = {
    primary: "bg-brand text-bg hover:bg-brand-deep",
    ghost: "bg-surface-2 text-text hover:bg-surface-3 border border-surface-3",
    danger: "bg-danger/15 text-danger hover:bg-danger/25 border border-danger/40",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-4 py-2.5 text-sm font-medium transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/* --- Progress bar / ring ------------------------------------------------ */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-text-3 text-xs">{label}</span>}
      <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-base ease-warm"
          style={{ width: `${pct}%` }}
        />
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

/* --- Field: labelled amount input -------------------------------------- */
export function Field({
  label,
  value,
  onChange,
  placeholder = "0.0",
  suffix,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-text-3 text-xs uppercase tracking-wider">{label}</span>}
      <div className="flex items-center gap-2 rounded-md bg-surface-2 border border-surface-3 px-3 py-2.5 focus-within:border-brand/60">
        <input
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="tabular flex-1 bg-transparent outline-none text-text text-lg min-w-0"
        />
        {suffix && <span className="text-text-3 text-sm shrink-0">{suffix}</span>}
      </div>
    </label>
  );
}
