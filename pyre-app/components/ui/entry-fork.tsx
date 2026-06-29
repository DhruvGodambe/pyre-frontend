"use client";

/* THE ENTRY FORK, the connect-or-guest choice, shared by the Gate (dormant
   threshold) and the intro's identity beat so both look identical and polished.
   Presentational + behavior: it owns the connect/guest UI and calls back when a
   FRESH identity is chosen. The two callers keep their own post-choice flow
   (the Gate closes; the intro begins the tour).

   Styling: a warm frosted-glass plate that sits over the Gate art, an ember
   hairline at the crown, a real flame mark (no emoji), and two large choice
   rows. Token-only, so it reskins with the rest of the app. */

import { useEffect, useRef, useState } from "react";
import { useIdentity } from "@/lib/identity";
import { useWallet } from "@/lib/wallet";
import { GameIcon } from "./game-icon";

/* The PYRE mark: a small ember flame in the brand gradient. Replaces the old
   🏮 emoji, which read as a paper lantern and broke the tone. */
function FlameMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 40" className={className} aria-hidden fill="none">
      <defs>
        <linearGradient id="pyre-flame" x1="16" y1="2" x2="16" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-brand-soft)" />
          <stop offset="0.55" stopColor="var(--color-brand)" />
          <stop offset="1" stopColor="var(--color-brand-deep)" />
        </linearGradient>
      </defs>
      <path
        d="M16 2c1.6 6.2-3.4 8.9-5.9 12.6C7.2 18.7 6 22.1 6 25.4 6 32.4 10.9 38 16 38s10-5.6 10-12.6c0-2.6-.9-5-2.4-7.3-1 1.3-2.4 2.1-4 2.1 2.2-4.3 1-9.9-3.6-13.2Z"
        fill="url(#pyre-flame)"
      />
      <path
        d="M16 21c.9 2.7-1.4 3.8-1.4 6.2 0 2 1.5 3.6 3.4 3.6s2.9-1.6 2.9-3.6c0-2.6-2.4-3.9-4.9-6.2Z"
        fill="var(--color-bg)"
        fillOpacity="0.55"
      />
    </svg>
  );
}

/* A spinning ring (no asset), tinted to whatever text color it sits in. Shown in
   the Connect button while the wallet popup is open, so the wait reads as active. */
function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

function ChoiceRow({
  onClick,
  disabled,
  primary,
  icon,
  title,
  sub,
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group/row w-full flex items-center gap-3.5 rounded-lg px-4 py-3.5 text-left transition-all duration-fast disabled:opacity-60 ${
        primary
          ? "bg-gradient-to-b from-brand to-brand-deep text-bg shadow-[0_6px_20px_-8px_rgba(240,169,59,0.7)] hover:brightness-110"
          : "bg-surface-2/70 text-text border border-surface-3 hover:border-brand/50 hover:bg-surface-2"
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
          primary ? "bg-bg/15" : "bg-surface-3/70 text-brand"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{title}</span>
        <span className={`block text-xs leading-snug mt-0.5 ${primary ? "text-bg/70" : "text-text-3"}`}>
          {sub}
        </span>
      </span>
      <span
        className={`ml-auto shrink-0 text-lg transition-transform duration-fast group-hover/row:translate-x-0.5 ${
          primary ? "text-bg/70" : "text-text-3"
        }`}
        aria-hidden
      >
        →
      </span>
    </button>
  );
}

/* `heading`/`blurb` let each caller set the voice (Gate vs intro). `onChose`
   fires once a fresh identity is set (caller decides what happens next). */
export function EntryFork({
  heading = "Welcome to PYRE",
  blurb = "You don’t need a wallet to start. Connect one if you like, or continue as a guest, either way you get full access.",
  onChose,
  autoCloseOnConnect = true,
}: {
  heading?: string;
  blurb?: string;
  onChose?: () => void;
  autoCloseOnConnect?: boolean;
}) {
  const { mode, connectWallet, continueAsGuest } = useIdentity();
  const { status } = useWallet();
  const connecting = status === "connecting";
  const [guestOpen, setGuestOpen] = useState(false);
  const [name, setName] = useState("");

  // Fire onChose exactly once when a fresh wallet connect resolves (guest fires
  // inline on submit). startedSet guards against an identity present at mount.
  const startedSet = useRef(mode !== null);
  const fired = useRef(false);
  useEffect(() => {
    if (autoCloseOnConnect && mode === "wallet" && !startedSet.current && !fired.current) {
      fired.current = true;
      onChose?.();
    }
  }, [mode, onChose, autoCloseOnConnect]);

  return (
    <div className="text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 ring-1 ring-brand/30 shadow-[0_0_28px_-6px_rgba(240,169,59,0.6)]">
          <FlameMark className="h-7 w-7" />
        </span>
        <h2 className="font-display text-3xl text-brand leading-none">{heading}</h2>
        <p className="text-text-2 text-sm leading-relaxed max-w-xs">{blurb}</p>
      </div>

      <div className="mt-6">
        {!guestOpen ? (
          <div className="space-y-2.5">
            <ChoiceRow
              primary
              onClick={connectWallet}
              disabled={connecting}
              icon={connecting ? <Spinner className="h-5 w-5" /> : <GameIcon name="wallet" size={30} />}
              title={connecting ? "Connecting…" : "Connect wallet"}
              sub="Your address is your account, nothing else to submit."
            />
            <ChoiceRow
              onClick={() => setGuestOpen(true)}
              icon={<GameIcon name="guest" size={30} />}
              title="Continue as guest"
              sub="Stay private. Pick a name now, add a wallet at the end."
            />
          </div>
        ) : (
          <div className="space-y-3 text-left animate-entry">
            <label className="block">
              <span className="text-text-3 text-xs uppercase tracking-wider">Choose a name</span>
              <input
                autoFocus
                value={name}
                placeholder="stranger"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim().length >= 2) {
                    continueAsGuest(name);
                    onChose?.();
                  }
                }}
                className="mt-1 w-full rounded-md bg-surface-2 border border-surface-3 px-3.5 py-2.5 text-text text-base outline-none focus:border-brand/60 transition-colors"
              />
            </label>
            <button
              onClick={() => {
                continueAsGuest(name);
                onChose?.();
              }}
              disabled={name.trim().length < 2}
              className="w-full rounded-lg bg-gradient-to-b from-brand to-brand-deep text-bg px-4 py-3 text-sm font-medium shadow-[0_6px_20px_-8px_rgba(240,169,59,0.7)] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Enter as {name.trim() || "guest"}
            </button>
            <button
              onClick={() => setGuestOpen(false)}
              className="w-full text-text-3 text-xs hover:text-text-2 transition-colors pt-0.5"
            >
              ← back to options
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
