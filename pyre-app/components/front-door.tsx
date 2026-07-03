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

/* Pre-launch the gate stands SEALED with the proclamation painted INTO the
   scene (same brushwork, torchlight and cast shadow, so it truly belongs);
   the HTML below only lays live text onto that painted paper. At launch the
   original open-gate art returns and the kingdom shows through the arch. */
const CLOSED_GATE_ART = "/world/interiors/gate-closed-decree.webp";
/* The painted paper's position in the art (measured): centered at
   (50.03%, 57.22%), 13.91% of the frame wide, aspect w/h 0.772. */

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

      {/* The proclamation, pinned to the DOORS themselves. The wrapper below
          replicates the gate art's object-cover geometry (16:9, centered,
          cover-scaled), so a position expressed in image coordinates stays on
          the doors at every viewport size. In the art the doors sit at the
          center-x, ~62% down. Hidden once we're crossing into the world. */}
      <div
        className="absolute inset-0 z-10 transition-opacity duration-300 pointer-events-none"
        style={{ opacity: entering ? 0 : 1 }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100vw,177.78vh)] h-[max(100vh,56.25vw)]">
        {/* The decree rectangle: positioned exactly over the paper PAINTED into
            the gate art (measured bbox), with container-query units so the type
            scales with the paper at every viewport. No pasted image: the paper
            is part of the painting; this only lays words onto it. */}
        <div className="animate-entry absolute left-[50.03%] top-[57.22%] w-[13.91%] aspect-[0.772] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto [container-type:inline-size]">

          {/* Content, laid onto the paper inside its safe area (clear of the
              nails at the top and the wax seal at the lower right). */}
          <div className="absolute inset-0 flex flex-col items-center px-[10%] pt-[9%] pb-[10%]">
          <div className="inline-flex items-center justify-center gap-[2.5cqw] mb-[2.5cqw]">
            {gate.icon && (
              <img
                src={asset(gate.icon)}
                alt=""
                className="h-[5.5cqw] w-[5.5cqw] shrink-0 object-contain"
              />
            )}
            <span className="text-[#7d5f38] text-[3.6cqw] uppercase tracking-[0.25em]">
              The Gate
            </span>
          </div>
          <h2 className="font-display text-[8.2cqw] text-[#5f3712] leading-tight">
            The Gate Opens Soon
          </h2>
          <p className="mt-[2cqw] text-[#54432b] text-[4.5cqw] leading-relaxed mx-auto">
            The kingdom is not yet open. Read the Pyre documentation in the Ember
            Codex, and return when the gate is unsealed.
          </p>

          {/* The two doors, stacked like the seals of a decree: the designer's
              carved plates (normal + molten hover, first hover never flickers),
              nudged slightly left so the wax seal keeps its corner. The Enter
              plate stays sealed (desaturated, inert) for anyone who isn't team. */}
          <div className="mt-auto flex flex-col items-center gap-[2.5cqw] -translate-x-[7%]">
            <button
              onClick={enter}
              disabled={!isTeam}
              aria-disabled={!isTeam}
              aria-label={isTeam ? "Enter Pyre Kingdom" : "Enter Pyre Kingdom (opens at launch)"}
              title={isTeam ? undefined : "The kingdom is not yet open"}
              className={
                "group relative block outline-none transition-transform duration-200 " +
                (isTeam
                  ? "hover:-translate-y-px hover:drop-shadow-[0_8px_24px_rgba(240,88,24,0.35)] focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
                  : "grayscale opacity-45 cursor-not-allowed")
              }
            >
              <img
                src={asset("/buttons/enter_normal.png")}
                alt=""
                draggable={false}
                className="block h-[13.5cqw] w-auto select-none"
              />
              {isTeam && (
                <img
                  src={asset("/buttons/enter_hover.png")}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 h-[13.5cqw] w-auto select-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              )}
            </button>

            {/* Read the Ember Codex, open to all. */}
            <Link
              href="/codex"
              aria-label="Read the Ember Codex"
              className="group relative block outline-none transition-transform duration-200 hover:-translate-y-px hover:drop-shadow-[0_8px_24px_rgba(240,88,24,0.35)] focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
            >
              <img
                src={asset("/buttons/codex_normal.png")}
                alt=""
                draggable={false}
                className="block h-[13.5cqw] w-auto select-none"
              />
              <img
                src={asset("/buttons/codex_hover.png")}
                alt=""
                aria-hidden
                draggable={false}
                className="absolute inset-0 h-[13.5cqw] w-auto select-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              />
            </Link>
          </div>
          </div>
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
