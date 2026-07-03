"use client";

/* THE PUBLIC FRONT DOOR.

   The first thing anyone arriving at app.pyreprotocol.com sees, with NO password.
   The cinematic film plays (PyreIntro), then it clears to the gate, where two
   doors are offered:

     • Enter Pyre Kingdom, the real app. LIVE only for the team (designer + team
       share one login). For everyone else it stays sealed and dimmed, because the
       kingdom is not open yet. Whether the visitor is team is asked of the public
       /api/session endpoint (the auth cookie is httpOnly, so we can't read it
       here). This is UX only: /kingdom is independently gated by middleware.
     • Read the Ember Codex, the public docs at /codex. Open to all, so KOLs can
       read how Pyre works without ever entering the kingdom.

   A discreet "Team access" link sends an un-signed-in team member to /login, and
   they land straight in the kingdom afterwards. KOLs have no reason to use it.

   RETURNING visitors skip all of this: if an identity is already set (a connected
   wallet or a saved guest name from a previous session), the front door sends them
   straight into the kingdom, no film, no gate. The film + gate are only for a
   fresh visitor with no identity yet.

   The gate art + vignette mirror the in-kingdom GateLanding, so crossing from the
   front door into the world feels continuous. */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BUILDING_BY_ID } from "@/components/buildings";
import { PyreIntro } from "@/components/pyre-intro";
import { useIdentity } from "@/lib/identity";
import { asset, KINGDOM_PATH, LAUNCHED } from "@/lib/config";
import { playDoor } from "@/lib/sfx";

/* Pre-launch the gate stands SEALED (closed stone doors, sun-wheel carved), so
   "The Gate Opens Soon" is literal. At launch the original open-gate art
   returns and the kingdom shows through the arch. */
const CLOSED_GATE_ART = "/world/interiors/gate-closed.webp";

export function FrontDoor() {
  const router = useRouter();
  const identity = useIdentity();
  const gate = BUILDING_BY_ID.gate;

  // Until we've settled whether this is a returning visitor, an opaque curtain
  // covers everything, so a returning user never sees a flash of film/gate before
  // being sent in, and a fresh visitor never sees the gate before the film.
  const [decided, setDecided] = useState(false);
  const [shown, setShown] = useState(false);
  const [entering, setEntering] = useState(false);
  // null = still asking; true/false = the answer from /api/session.
  const [isTeam, setIsTeam] = useState<boolean | null>(null);

  // Returning wallet/guest visitor → straight into the app. Otherwise give the
  // identity a beat to hydrate (guest from storage, wallet reconnect), then commit
  // to the public front door (film + gate) for a fresh visitor.
  useEffect(() => {
    if (identity.isSet) {
      router.replace(KINGDOM_PATH);
      return;
    }
    const t = setTimeout(() => setDecided(true), 250);
    return () => clearTimeout(t);
  }, [identity.isSet, router]);

  useEffect(() => {
    if (!decided) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [decided]);

  // Ask the server whether this visitor is a signed-in team member.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { team: false }))
      .then((d: { team?: boolean }) => !cancelled && setIsTeam(!!d.team))
      .catch(() => !cancelled && setIsTeam(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Still settling, or redirecting a returning visitor in: hold a black curtain.
  if (!decided) {
    return <div className="fixed inset-0 z-[70] bg-black" aria-hidden />;
  }

  // Team member pressing Enter: the same door + push-through as the in-kingdom
  // gate, then navigate into the world.
  const enter = () => {
    if (entering || !isTeam) return;
    playDoor("gate");
    setEntering(true);
    setTimeout(() => router.push(KINGDOM_PATH), 1050);
  };

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden bg-bg transition-opacity duration-[1000ms] ease-out"
      style={{ opacity: entering ? 0 : 1 }}
    >
      {/* The cinematic film plays over everything on first arrival, then clears. */}
      <PyreIntro />

      {/* The gate, full-screen, settling in on arrival then pushing THROUGH as a
          team member steps into the world. */}
      <div
        className="absolute inset-0 transition-[transform,opacity] ease-out"
        style={{
          transform: entering ? "scale(1.6)" : shown ? "scale(1)" : "scale(1.08)",
          opacity: shown ? 1 : 0,
          transitionDuration: entering ? "1050ms" : "1200ms",
        }}
      >
        <Image
          src={asset(LAUNCHED ? gate.interior ?? CLOSED_GATE_ART : CLOSED_GATE_ART)}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover select-none pointer-events-none"
        />
      </div>

      {/* Legibility: vignette + bottom scrim. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_30%,rgba(11,10,9,0.72)_100%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg via-bg/60 to-transparent pointer-events-none" />

      {/* Warm ember bloom as a team member crosses the threshold. */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(240,169,59,0.55),transparent_60%)] transition-opacity duration-[900ms] ease-out"
        style={{ opacity: entering ? 1 : 0 }}
      />

      {/* Wordmark */}
      <div className="absolute top-5 left-6 z-10">
        <span className="font-display text-3xl text-brand tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          PYRE
        </span>
      </div>

      {/* The two doors. Hidden once we're crossing into the world. */}
      <div
        className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-4 sm:p-8 transition-opacity duration-300"
        style={{ opacity: entering ? 0 : 1 }}
      >
        <div className="animate-entry w-full max-w-md rounded-2xl bg-surface/80 border border-brand/20 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl ring-1 ring-inset ring-white/5 py-9 px-7 text-center">
          <div className="h-px -mt-3 mb-6 bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
          <div className="inline-flex items-center gap-2 mb-2">
            {gate.icon && (
              <img
                src={asset(gate.icon)}
                alt=""
                className="h-5 w-5 shrink-0 object-contain"
              />
            )}
            <span className="text-text-3 text-[11px] uppercase tracking-[0.25em]">
              The Gate
            </span>
          </div>
          <h2 className="font-display text-3xl text-brand leading-tight">
            The Gate Opens Soon
          </h2>
          <p className="mt-2 text-text-2 text-sm leading-relaxed max-w-xs mx-auto">
            The kingdom is not yet open. Read the Pyre documentation in the Ember
            Codex, and return when the gate is unsealed.
          </p>

          {/* The two doors, side by side. */}
          <div className="mt-6 flex items-stretch gap-3">
            {/* Enter Pyre Kingdom, live only for the team; "(Coming soon)" for all
                other visitors. */}
            <button
              onClick={enter}
              disabled={!isTeam}
              aria-disabled={!isTeam}
              className={
                "flex-1 flex flex-col items-center justify-center text-center rounded-lg px-4 py-3 text-sm font-medium transition-all " +
                (isTeam
                  ? "bg-gradient-to-b from-brand to-brand-deep text-bg shadow-[0_6px_20px_-8px_rgba(240,169,59,0.7)] hover:brightness-110"
                  : "bg-surface-2/70 text-text-3 border border-surface-3/60 cursor-not-allowed")
              }
            >
              <span>Enter Pyre Kingdom{isTeam ? " →" : ""}</span>
            </button>

            {/* Read the Ember Codex, open to all. */}
            <Link
              href="/codex"
              className="flex-1 flex items-center justify-center text-center rounded-lg bg-surface-2/95 border border-brand/40 text-brand px-4 py-3 text-sm font-medium hover:border-brand hover:bg-surface-2 transition-colors"
            >
              Read the Ember Codex
            </Link>
          </div>
        </div>
      </div>

      {/* Discreet team entrance: an un-signed-in team member signs in and lands in
          the kingdom. Only shown while not recognised as team. */}
      {isTeam === false && (
        <Link
          href={`/login?next=${encodeURIComponent(KINGDOM_PATH)}`}
          className="absolute bottom-4 right-5 z-10 text-text-3/70 text-xs hover:text-brand transition-colors"
        >
          Team access
        </Link>
      )}
    </div>
  );
}
