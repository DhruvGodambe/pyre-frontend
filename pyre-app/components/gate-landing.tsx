"use client";

/* THE GATE ANSWERS, the desktop arrival (once the brand film is done).

   The sealed gate IS the login. No cards, no lore deck, no panel: the visitor
   stands before the closed doors, and the two carved plates (the landing
   page's button language) hang one on each door leaf:

     • Connect Wallet  → on the left leaf
     • Enter as Guest  → on the right leaf (the name is asked right there)

   The moment identity is set, the gate answers, and every visible frame of the
   opening is PAINTED (Nano Banana edits of the same scene), not CSS geometry:

     closed  →  the carved emblem ignites (glow)
             →  the doors crack AJAR, a blade of light through the seam
                (gate-ajar.webp, a painted frame of this exact scene)
             →  the light FLOODS the screen (bloom wash)
             →  the wash recedes onto the OPEN gate, kingdom glowing through,
                while the camera pushes in. First-timers walk straight into
                the Emberkeeper's guided tour.

   Geometry: the art is object-cover; a proxy container replicates that crop,
   so positions expressed in image coordinates stay on the doors at any
   viewport. Shows whenever there is NO identity yet (awake === false); a
   returning visitor gets a single carved Enter plate and the same opening. */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTour } from "@/lib/tour";
import { useIdentity } from "@/lib/identity";
import { useWallet } from "@/lib/wallet";
import { asset } from "@/lib/config";
import { playDoor } from "@/lib/sfx";
import { storageGet, storageSet } from "@/lib/safe-storage";

const SEEN_KEY = "pyre_intro_seen";

/* The three painted states of the same scene. */
const CLOSED_ART = "/world/interiors/gate-closed.webp";
const AJAR_ART = "/world/interiors/gate-ajar.webp";
const OPEN_ART = "/world/interiors/gate.webp";

/* Image-coordinate anchors (percent of the 16:9 frame). The door leaves sit
   either side of the center seam; one plate hangs on each, at door-middle. */
const PLATE_L = { x: 43.9, y: 61 };
const PLATE_R = { x: 56.1, y: 61 };
const PLATE_W = 11; // % of the frame width (593x166 source art)

/* Sequence pacing (ms from begin()). */
const T_AJAR = 600; // emblem glow → doors crack ajar
const T_FLOOD = 1500; // → light floods the screen
const T_DEPART = 1900; // → wash recedes onto the open gate, camera pushes
const T_DONE = 2950;

type Phase = "choose" | "guest" | "ready" | "igniting" | "ajar" | "flood" | "departing";

const SHADOW = { textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 14px rgba(0,0,0,0.5)" };

/* One carved plate (normal + molten hover, first hover never flickers),
   anchored to a point on the painting. */
function GatePlate({
  at,
  art,
  label,
  onClick,
  disabled,
  pending,
}: {
  at: { x: number; y: number };
  art: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-busy={pending}
      className="group absolute block -translate-x-1/2 -translate-y-1/2 outline-none transition-transform duration-200 hover:-translate-y-[calc(50%+2px)] hover:drop-shadow-[0_8px_24px_rgba(240,88,24,0.4)] focus-visible:ring-2 focus-visible:ring-brand rounded-lg disabled:opacity-70"
      style={{ left: `${at.x}%`, top: `${at.y}%`, width: `${PLATE_W}%` }}
    >
      <img src={asset(`/buttons/${art}_normal.png`)} alt="" draggable={false} className="block w-full h-auto select-none" />
      <img
        src={asset(`/buttons/${art}_hover.png`)}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full h-auto select-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      />
      {pending && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <span className="h-[18%] aspect-square rounded-full border-2 border-white/50 border-t-white animate-spin" />
        </span>
      )}
    </button>
  );
}

export function GateLanding({ onDone }: { onDone: () => void }) {
  const tour = useTour();
  const identity = useIdentity();
  const { status } = useWallet();
  const connecting = status === "connecting";

  const [firstTime, setFirstTime] = useState(false);
  const [shown, setShown] = useState(false);
  const [phase, setPhase] = useState<Phase>("choose");
  const [name, setName] = useState("");
  const begunRef = useRef(false);
  // Set ONLY by a click on this screen. An identity that hydrates from the
  // server (saved guest / reconnecting wallet) must NOT open the gate by
  // itself: that shows the Welcome-back plate instead.
  const actedRef = useRef(false);

  useEffect(() => {
    setFirstTime(!storageGet(SEEN_KEY));
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // A known identity (present at mount OR hydrating late from the server):
  // the plates give way to a single carved Enter plate, no auto-entry.
  useEffect(() => {
    if (identity.isSet && !actedRef.current && (phase === "choose" || phase === "guest")) {
      setPhase("ready");
    }
  }, [identity.isSet, phase]);

  /* The gate answers: emblem ignites → ajar → flood → push through → done. */
  const begin = () => {
    if (begunRef.current) return;
    begunRef.current = true;
    setPhase("igniting");
    window.setTimeout(() => {
      setPhase("ajar");
      playDoor("gate");
    }, T_AJAR);
    window.setTimeout(() => setPhase("flood"), T_FLOOD);
    window.setTimeout(() => setPhase("departing"), T_DEPART);
    window.setTimeout(() => {
      if (firstTime) tour.start();
      storageSet(SEEN_KEY, "1");
      onDone();
    }, T_DONE);
  };

  // A wallet connect the visitor STARTED HERE resolving IS the choice: the
  // gate answers by itself.
  useEffect(() => {
    if (actedRef.current && identity.isSet && (phase === "choose" || phase === "guest")) {
      begin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.isSet, phase]);

  const chooseGuest = () => {
    const n = name.trim();
    if (n.length < 2) return;
    actedRef.current = true;
    identity.continueAsGuest(n);
    begin();
  };

  const chooseWallet = () => {
    actedRef.current = true;
    identity.connectWallet();
  };

  const departing = phase === "departing";
  const sealed = phase === "choose" || phase === "guest" || phase === "ready" || phase === "igniting";
  const choicesUp = phase === "choose" || phase === "guest";

  return (
    <div
      className="fixed inset-0 z-40 overflow-hidden bg-bg transition-opacity duration-[1000ms] ease-out"
      style={{ opacity: departing ? 0 : 1 }}
    >
      {/* The scene stack: settles in on arrival, pushes THROUGH on departure.
          Inside, a cover-geometry proxy keeps image coordinates true. */}
      <div
        className="absolute inset-0 transition-[transform,opacity] ease-out"
        style={{
          transform: departing ? "scale(1.6)" : shown ? "scale(1)" : "scale(1.08)",
          opacity: shown ? 1 : 0,
          transitionDuration: departing ? "1050ms" : "1200ms",
        }}
      >
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100vw,177.78vh)] h-[max(100vh,56.25vw)]">
          {/* Beneath everything: the OPEN gate, kingdom glowing through. */}
          <Image
            src={asset(OPEN_ART)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover select-none pointer-events-none"
          />

          {/* Doors cracked AJAR, the painted frame with the blade of light. */}
          <img
            src={asset(AJAR_ART)}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none transition-opacity duration-700"
            style={{ opacity: phase === "ajar" || phase === "flood" ? 1 : 0 }}
          />

          {/* The sealed gate, the resting state, crossfading into ajar. */}
          <img
            src={asset(CLOSED_ART)}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none transition-opacity duration-700"
            style={{ opacity: sealed ? 1 : 0 }}
          />

          {/* The carved emblem ignites the moment the gate accepts. */}
          <div
            className="absolute pointer-events-none transition-opacity duration-500"
            style={{
              left: "41.5%",
              top: "42%",
              width: "17%",
              height: "28%",
              opacity: phase === "igniting" ? 1 : 0,
              background:
                "radial-gradient(50% 50% at 50% 50%, rgba(240,169,59,0.55) 0%, rgba(240,105,35,0.25) 55%, transparent 78%)",
            }}
            aria-hidden
          />

          {/* The flood: light bursts from the seam and washes the screen, then
              recedes onto the open gate as the camera pushes through. */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              opacity: phase === "flood" ? 1 : 0,
              background:
                "radial-gradient(75% 95% at 50% 55%, rgba(255,241,208,1) 0%, rgba(250,190,90,0.96) 45%, rgba(150,60,15,0.75) 75%, rgba(30,12,5,0.4) 100%)",
            }}
            aria-hidden
          />

          {/* THE CHOICE: one plate on each door leaf. */}
          {choicesUp && !identity.isSet && (
            <>
              <GatePlate
                at={PLATE_L}
                art="connectwallet"
                label="Connect wallet"
                onClick={chooseWallet}
                disabled={connecting}
                pending={connecting}
              />
              {phase !== "guest" ? (
                <GatePlate
                  at={PLATE_R}
                  art="enterguest"
                  label="Enter as guest"
                  onClick={() => setPhase("guest")}
                />
              ) : (
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 [container-type:inline-size]"
                  style={{ left: `${PLATE_R.x}%`, top: `${PLATE_R.y}%`, width: `${PLATE_W + 2}%` }}
                >
                  <div className="flex flex-col items-center gap-[3.5cqw]">
                    <input
                      autoFocus
                      value={name}
                      placeholder="your name"
                      maxLength={24}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") chooseGuest();
                        if (e.key === "Escape") setPhase("choose");
                      }}
                      className="w-full bg-transparent text-center font-display text-[9.5cqw] text-[#f0c987] placeholder-[#f0c987]/40 outline-none border-b border-[#d8ae6b]/60 focus:border-[#f0c987] pb-[1cqw]"
                      style={SHADOW}
                      aria-label="Guest name"
                    />
                    <div className="flex items-center gap-[6cqw]">
                      <button
                        onClick={() => setPhase("choose")}
                        className="text-[5.5cqw] text-[#d8ae6b]/80 hover:text-[#f0c987] transition-colors"
                        style={SHADOW}
                      >
                        ← back
                      </button>
                      <button
                        onClick={chooseGuest}
                        disabled={name.trim().length < 2}
                        className="text-[6cqw] font-medium text-[#f0c987] underline underline-offset-2 decoration-[#d8ae6b]/70 hover:decoration-[#f0c987] transition-colors disabled:opacity-40"
                        style={SHADOW}
                      >
                        knock →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Returning visitor: one carved plate, the gate already knows you. */}
          {phase === "ready" && (
            <div className="absolute left-1/2 top-[68%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-[1.2vh]">
              <p className="text-brand-soft font-display text-xl drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                {identity.username ? `Welcome back, ${identity.username}` : "Your sigil is known"}
              </p>
              <button
                onClick={begin}
                aria-label="Enter Pyre Kingdom"
                className="group relative block rounded-lg outline-none transition-transform duration-200 hover:-translate-y-px hover:drop-shadow-[0_8px_24px_rgba(240,88,24,0.35)] focus-visible:ring-2 focus-visible:ring-brand"
              >
                <img
                  src={asset("/buttons/enter_normal.png")}
                  alt=""
                  draggable={false}
                  className="block h-14 w-auto select-none"
                />
                <img
                  src={asset("/buttons/enter_hover.png")}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute inset-0 h-14 w-auto select-none opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legibility vignette, gentle. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_45%,rgba(11,10,9,0.6)_100%)] pointer-events-none" />

      {/* Warm ember bloom as you cross the threshold. */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(240,169,59,0.55),transparent_60%)] transition-opacity duration-[900ms] ease-out"
        style={{ opacity: departing ? 1 : 0 }}
      />

      {/* Wordmark */}
      <div className="absolute top-5 left-6 z-10">
        <img
          src={asset("/brand/text-color.png")}
          alt="Pyre"
          draggable={false}
          className="h-8 w-auto select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
        />
      </div>

      {/* One whisper of guidance while the choice stands. */}
      {choicesUp && (
        <p className="absolute inset-x-0 bottom-[5vh] z-10 text-center text-white/45 text-xs tracking-[0.18em] uppercase drop-shadow-[0_1px_8px_rgba(0,0,0,0.9)] pointer-events-none">
          The gate opens for those who name themselves
        </p>
      )}
    </div>
  );
}
