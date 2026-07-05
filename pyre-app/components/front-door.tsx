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

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BUILDING_BY_ID } from "@/components/buildings";
import { PyreIntro } from "@/components/pyre-intro";
import { KeeperBox, KeeperText, PlateButton } from "@/components/ui/keeper-box";
import { useIdentity } from "@/lib/identity";
import { asset, KINGDOM_PATH, LAUNCHED } from "@/lib/config";
import { X_PROFILE_URL } from "@/lib/social";
import { playDoor } from "@/lib/sfx";

/* Pre-launch the gate stands SEALED and the EMBERKEEPER stands before it:
   the designer EXACT character art (AI-matted cutout, zero repainting),
   layered over the scene in image coordinates. He delivers the message from
   the dialogue box once the film clears. At launch the original open-gate
   art returns. */
const CLOSED_GATE_ART = "/world/interiors/gate-closed.webp";

/* The keeper's voice for this scene. NOTE: free-tier ElevenLabs test clip in
   the gitignored voice-previews folder, so production simply stays silent
   (the play() catch swallows the 404) until the licensed voice replaces it. */
const KEEPER_VOICE = "/voice-previews/mystic-callum-gate.mp3";

/* His answer to a hand on the sealed door (same voice, same recipe as the
   gate clip; regenerate via ElevenLabs if the lines change). */
const SEALED_VOICE = "/voice-previews/mystic-callum-sealed.mp3";
const SEALED_LINES = [
  "Patience, stranger. This gate stays sealed until the first flame rises.",
  "Study the Ember Codex, and be ready when the doors open.",
];
const SEALED_TEXT_LEN = SEALED_LINES.join("\n").length;

/* The keeper's lines, typed out like the tour's narration and shown through
   the KeeperBox's fixed 3-line window (the box never grows with the script;
   earlier lines slide up teleprompter-style). Clicking the box (forceDone)
   lands everything at once. */
function KeeperSpeech({
  lines,
  forceDone,
  onDone,
  msPerChar = 22,
}: {
  lines: string[];
  forceDone: boolean;
  onDone: () => void;
  /** typing pace; the caller stretches it to the voice clip's duration. */
  msPerChar?: number;
}) {
  const text = lines.join("\n");
  const total = text.length;
  const [n, setN] = useState(0);
  const doneRef = useRef(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      setN((v) => (v >= total ? v : v + 1));
    }, msPerChar);
    return () => window.clearInterval(id);
  }, [total, msPerChar]);
  const shownTotal = forceDone ? total : n;
  useEffect(() => {
    if (shownTotal >= total && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [shownTotal, total, onDone]);
  return <KeeperText text={text} shown={shownTotal} lines={3} />;
}

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
  // The keeper's arrival: hidden (film still playing) -> APPEAR (he stands at
  // the gate, full figure) -> BOX (he settles into the dialogue box and talks).
  const [keeper, setKeeper] = useState<"hidden" | "appear" | "box">("hidden");
  const [spoken, setSpoken] = useState(false);
  // The keeper ANSWERS a tap on the sealed Enter plate (the plate is locked,
  // not dead: aria-disabled + clickable). Counter so every tap re-delivers
  // the line; 0 = still on the greeting.
  const [sealedReply, setSealedReply] = useState(0);
  const [replyDone, setReplyDone] = useState(false);
  const [voiceMs, setVoiceMs] = useState(22);
  const [replyMs, setReplyMs] = useState(22);
  const keeperAudioRef = useRef<HTMLAudioElement | null>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

  // His voice: plays when the box opens (the light-the-pyre hold was the
  // gesture, so playback is allowed; if a browser still refuses, the words
  // simply type in silence). The typewriter stretches to the clip's length.
  const KEEPER_TEXT_LEN = 187; // combined line length, keeps pacing honest
  useEffect(() => {
    if (keeper !== "box") return;
    const a = new Audio(asset(KEEPER_VOICE));
    keeperAudioRef.current = a;
    a.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(a.duration) && a.duration > 1) {
        setVoiceMs(Math.max(16, Math.round((a.duration * 1000 * 0.94) / KEEPER_TEXT_LEN)));
      }
    });
    a.play().catch(() => {});
    return () => {
      a.pause();
      keeperAudioRef.current = null;
    };
  }, [keeper]);

  // Skipping the words also quiets the keeper. Only a deliberate skip cuts the
  // voice; when the typing simply finishes first (it is paced to land a beat
  // early), the clip plays out its final words.
  const skipSpeech = () => {
    setSpoken(true);
    setReplyDone(true);
    keeperAudioRef.current?.pause();
    replyAudioRef.current?.pause();
  };

  // A tap on the sealed gate plate: the keeper explains instead of the plate
  // silently ignoring it (tooltips never show on touch, so HE is the tooltip).
  // Voiced with the same clip machinery as the greeting; a repeat tap restarts
  // the clip from the top so he never talks over himself.
  const sealedTap = () => {
    setReplyDone(false);
    setSealedReply((n) => n + 1);
    keeperAudioRef.current?.pause();
    let a = replyAudioRef.current;
    if (!a) {
      a = new Audio(asset(SEALED_VOICE));
      replyAudioRef.current = a;
      a.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(a!.duration) && a!.duration > 1) {
          setReplyMs(Math.max(16, Math.round((a!.duration * 1000 * 0.94) / SEALED_TEXT_LEN)));
        }
      });
    }
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  // The reply clip dies with the scene, same as the greeting clip.
  useEffect(() => {
    return () => {
      replyAudioRef.current?.pause();
      replyAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (keeper !== "appear") return;
    // A short beat so the visitor SEES him standing at the gate before he
    // starts talking.
    const t = window.setTimeout(() => setKeeper("box"), 1200);
    return () => window.clearTimeout(t);
  }, [keeper]);

  // PRE-LAUNCH: everyone faces the closed gate, no exceptions. A saved
  // wallet/guest identity from before the gate existed does NOT skip past it
  // (team still enters via the Enter Pyre plate; the film has a Skip plate).
  // AT LAUNCH the returning-visitor fast path comes back: identity set →
  // straight into the app, no film, no gate.
  useEffect(() => {
    if (LAUNCHED && identity.isSet) {
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
      {/* The cinematic film plays over everything on first arrival, then clears
          and the Emberkeeper arrives at the threshold. */}
      <PyreIntro onDone={() => setKeeper("appear")} />

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
        {/* The keeper himself: the designer's EXACT pixels (AI-matted cutout,
            zero repainting), standing left of the doors, cropped by the frame
            bottom. Positioned in image coordinates via the same cover-proxy
            geometry as the art, so he stands on the path at every viewport. */}
        {!LAUNCHED && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100vw,177.78vh)] h-[max(100vh,56.25vw)] pointer-events-none">
            {/* Part of the painting, not a control: he stands at the gate and
                talks through the box below. The Codex has its own plate. */}
            <div className="absolute bottom-[-1.5%] left-[30%] -translate-x-1/2 h-[57%]">
              <img
                src={asset("/world/emberkeeper/keeper-crossed-cut.webp")}
                alt=""
                draggable={false}
                className="keeper-idle h-full w-auto max-w-none select-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Legibility: a gentle vignette only. The decree carries its own
          contrast, so the scene (especially the foreground path) stays visible. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_45%,rgba(11,10,9,0.5)_100%)] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-bg/35 to-transparent pointer-events-none" />

      {/* Warm ember bloom as a team member crosses the threshold. */}
      <div
        className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(240,169,59,0.55),transparent_60%)] transition-opacity duration-[900ms] ease-out"
        style={{ opacity: entering ? 1 : 0 }}
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

      {/* THE EMBERKEEPER stands at the gate, painted into the scene itself.
          Once the film clears (and after a beat so he is SEEN), he speaks
          through the dialogue box, the same box, the same character, as the
          guided tour in the village. */}
      {keeper === "box" && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-4 pb-[4vh] transition-opacity duration-300"
          style={{ opacity: entering ? 0 : 1 }}
        >
          <KeeperBox
            className="animate-entry w-full max-w-2xl shadow-panel cursor-pointer"
            onClick={skipSpeech}
            actions={
              /* His instructions: forged plates riding the bottom edge, they
                 appear once the words have landed. The X now lives on the
                 scene's corner, not in his speech (see below). */
              <div
                className={
                  "inline-grid grid-flow-col auto-cols-fr items-center gap-3 transition-opacity duration-500 " +
                  (spoken ? "opacity-100" : "opacity-0 pointer-events-none")
                }
              >
                <PlateButton
                  label="Enter Pyre"
                  locked={!isTeam}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isTeam) {
                      sealedTap();
                      return;
                    }
                    enter();
                  }}
                />
                <PlateButton
                  label="Read the Codex"
                  href="/codex"
                  newTab
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            }
          >
            <div className="flex gap-4 items-center">
              {/* His face up close: the wide shot already shows the figure at
                  the gate, so the box carries the close-up (hood and burning
                  eyes) instead of repeating him in miniature. */}
              <img
                src={asset("/world/emberkeeper/crossed-face.webp")}
                alt=""
                draggable={false}
                className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 rounded-md object-cover ring-1 ring-black/70 shadow-[0_2px_10px_rgba(0,0,0,0.6)] select-none"
              />
              <div className="min-w-0 flex-1">
                {sealedReply === 0 ? (
                  <KeeperSpeech
                    lines={[
                      "Welcome, stranger. The gate is currently closed. The kingdom still slumbers behind these doors, and I keep the fire while it dreams.",
                      "You might want to study the Ember Codex while you wait.",
                    ]}
                    forceDone={spoken}
                    onDone={() => setSpoken(true)}
                    msPerChar={voiceMs}
                  />
                ) : (
                  /* His answer to a hand on the sealed door. Keyed by tap count
                     so an impatient second tap delivers the line again. */
                  <KeeperSpeech
                    key={sealedReply}
                    lines={SEALED_LINES}
                    forceDone={replyDone}
                    onDone={() => setReplyDone(true)}
                    msPerChar={replyMs}
                  />
                )}
              </div>
            </div>
          </KeeperBox>
        </div>
      )}

      {/* X lives quietly on the scene's corner (never inside the keeper's
          speech): muted until hovered, the standard footer-corner placement. */}
      <a
        href={X_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow @pyre_protocol on X"
        title="@pyre_protocol"
        className="absolute bottom-12 right-5 z-10 block h-8 w-8 opacity-55 hover:opacity-100 transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md"
      >
        <img
          src={asset("/buttons/x_normal.webp")}
          alt=""
          draggable={false}
          className="block h-8 w-8 select-none"
        />
      </a>

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
