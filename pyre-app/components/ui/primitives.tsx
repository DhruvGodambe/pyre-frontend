/* ============================================================================
   PYRE, UI primitives (token-driven, intentionally plain)
   ----------------------------------------------------------------------------
   The shared building blocks every panel is made of. They reference ONLY design
   tokens (bg-surface, text-brand, rounded-panel…), so when the designer's look
   lands in globals.css, these, and therefore the whole app, restyle at once.
   Deliberately rough now: this is the skeleton, not the final paint.
   ========================================================================== */

import type { ReactNode } from "react";

/* --- Panel: the card every feature lives in ----------------------------- */
export function Panel({
  title,
  tagline,
  action,
  children,
  className = "",
}: {
  title?: string;
  tagline?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
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
