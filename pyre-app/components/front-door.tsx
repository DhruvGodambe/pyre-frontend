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
import { captureReferral } from "@/lib/quests/client";
import { track } from "@vercel/analytics";
import { VOICE_TIMING } from "@/lib/tour-voice-timing";

/* Pre-launch the gate stands SEALED and THE ASHWARDEN, the threshold guard,
   stands before it: the designer EXACT character art (clean cutout, zero
   repainting), layered over the scene in image coordinates. He delivers the
   message from the dialogue box once the film clears. At launch the original
   open-gate art returns. */
const CLOSED_GATE_ART = "/world/interiors/gate-closed.webp";

/* The keeper's voice for this scene. NOTE: free-tier ElevenLabs test clip in
   the gitignored voice-previews folder, so production simply stays silent
   (the play() catch swallows the 404) until the licensed voice replaces it.
   When a clip OR its lines change, re-run scripts/align-voice.py so the
   karaoke timing below stays letter-exact. */
const KEEPER_VOICE = "/voice-previews/mystic-callum-gate.mp3";
const GREETING_LINES = [
  "Welcome, stranger. The gate is currently closed. The kingdom still slumbers behind these doors, and I keep the fire while it dreams.",
  "You might want to study the Ember Codex while you wait.",
];

/* His answer to a hand on the sealed door (same voice, same recipe as the
   gate clip; regenerate via ElevenLabs if the lines change). */
const SEALED_VOICE = "/voice-previews/mystic-callum-sealed.mp3";
const SEALED_LINES = [
  "Patience, stranger. This gate stays sealed until the first flame rises.",
  "Study the Ember Codex, and be ready when the doors open.",
];

/* How far (seconds) the revealed text runs ahead of the voice, same lead as
   the tour narration: a touch of early reads as in-sync, trailing as broken. */
const VOICE_LEAD = 0.12;

/* The keeper's lines through the KeeperBox's fixed 3-line window (the box
   never grows with the script; earlier lines slide up teleprompter-style).
   The reveal is paced against the CLIP'S OWN PLAYHEAD with the word
   timestamps from scripts/align-voice.py, the same letter-exact karaoke as
   the tour narration: the text waits for the voice and never runs ahead of
   it. With no usable clip (missing in production, autoplay refused, ended
   early) it falls back to a reading-pace typewriter. Clicking the box
   (forceDone) lands everything at once. */
function KeeperSpeech({
  lines,
  voice,
  audioRef,
  forceDone,
  onDone,
}: {
  lines: string[];
  /** the clip speaking this text; its playhead paces the reveal. */
  voice: string;
  /** receives the live Audio element so the caller can quiet a skip. */
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  forceDone: boolean;
  onDone: () => void;
}) {
  const text = lines.join("\n");
  const total = text.length;
  // The clip's playhead in seconds; null = nothing to pace against (fall back
  // to the reading-pace counter).
  const [playhead, setPlayhead] = useState<number | null>(0);
  const [synth, setSynth] = useState(0);
  const maxShownRef = useRef(0);
  const doneRef = useRef(false);

  // Create and play the clip, following its playhead while it sounds (the
  // tour narration's machinery). The light-the-pyre hold was the gesture, so
  // playback is allowed; if a browser still refuses, the watchdog bails to
  // the typewriter.
  useEffect(() => {
    const a = new Audio(asset(voice));
    audioRef.current = a;
    let raf = 0;
    const follow = () => {
      if (!a.paused && !a.ended) setPlayhead(a.currentTime);
      raf = requestAnimationFrame(follow);
    };
    const bail = () => {
      if (audioRef.current === a) setPlayhead(null);
    };
    a.addEventListener("ended", bail);
    a.addEventListener("error", bail);
    setPlayhead(0);
    raf = requestAnimationFrame(follow);
    void a.play().catch(bail);
    const watchdog = window.setTimeout(() => {
      if (a.paused || a.currentTime === 0) bail();
    }, 2000);
    return () => {
      window.clearTimeout(watchdog);
      cancelAnimationFrame(raf);
      a.pause();
      if (audioRef.current === a) audioRef.current = null;
    };
  }, [voice, audioRef]);

  // Reading-pace fallback: only consulted while there is no voice pacing.
  useEffect(() => {
    const id = window.setInterval(() => {
      setSynth((v) => (v >= total ? v : v + 1));
    }, 24);
    return () => window.clearInterval(id);
  }, [total]);

  // Letter-exact pacing against the clip's word timestamps. Lines join with
  // "\n" and words split on space OR newline so the word count (and the
  // one-separator-per-word character accounting) matches the timing table.
  const words = text.split(/[ \n]/);
  const timing = VOICE_TIMING[voice]?.find((t) => t.length === words.length);
  let paced: number | null = null;
  if (playhead !== null && timing) {
    const t = playhead + VOICE_LEAD;
    paced = 0;
    for (let i = 0; i < words.length; i++) {
      const [start, end] = timing[i];
      if (t >= end) {
        paced += words[i].length + 1; // the whole word and its separator
      } else {
        if (t > start) paced += Math.round((words[i].length * (t - start)) / (end - start));
        break;
      }
    }
    paced = Math.min(paced, total);
  }
  // Voice paces when it can; the reading-pace counter carries otherwise. The
  // max() keeps the reveal monotonic when pacing sources swap mid-line.
  const shown = forceDone
    ? total
    : Math.min(total, Math.max(paced ?? synth, maxShownRef.current));
  maxShownRef.current = shown;

  useEffect(() => {
    if (shown >= total && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [shown, total, onDone]);
  return <KeeperText text={text} shown={shown} lines={3} />;
}

export function FrontDoor() {
  const router = useRouter();
  const identity = useIdentity();
  const gate = BUILDING_BY_ID.gate;

  // A friend arriving via someone's ?ref=CODE link lands HERE (share links
  // point at the public front door, and pre-launch the kingdom is sealed), so
  // the referral is recorded at this threshold, not just in the AppShell.
  // Recording twice is harmless: the store only keeps the first referrer.
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("ref");
    if (!code) return;
    captureReferral(code);
    url.searchParams.delete("ref");
    window.history.replaceState({}, "", url.toString());
  }, []);

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
  // The live clips, assigned by each KeeperSpeech (which owns playback and
  // paces its text against the clip's playhead); held here so a deliberate
  // skip can quiet them.
  const keeperAudioRef = useRef<HTMLAudioElement | null>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

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
  // The reply KeeperSpeech is keyed by this counter, so every tap remounts it:
  // a fresh clip from the top (he never talks over himself) with the text
  // paced to it. The greeting clip is quieted here in case its tail is still
  // sounding when the reply begins.
  const sealedTap = () => {
    track("gate_sealed_tap");
    setReplyDone(false);
    setSealedReply((n) => n + 1);
    keeperAudioRef.current?.pause();
  };

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
          and the Ashwarden arrives at the threshold. */}
      <PyreIntro
        onDone={() => {
          track("film_done");
          setKeeper("appear");
        }}
      />

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
        {/* The Ashwarden himself: the designer's EXACT pixels (clean cutout,
            zero repainting), standing left of the doors, cropped by the frame
            bottom. Positioned in image coordinates via the same cover-proxy
            geometry as the art, so he stands on the path at every viewport. */}
        {!LAUNCHED && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100vw,177.78vh)] h-[max(100vh,56.25vw)] pointer-events-none">
            {/* Part of the painting, not a control: he stands at the gate and
                talks through the box below. The Codex has its own plate. */}
            <div className="absolute bottom-[-1.5%] left-[30%] -translate-x-1/2 h-[57%]">
              <img
                src={asset("/world/ashwarden/ashwarden-cut.webp")}
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

      {/* THE ASHWARDEN stands at the gate, painted into the scene itself.
          Once the film clears (and after a beat so he is SEEN), he speaks
          through the dialogue box, the same box chrome as the guided tour in
          the village, but a distinct persona from the Emberkeeper. */}
      {keeper === "box" && (
        <div
          className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-4 pb-[4vh] transition-opacity duration-300"
          style={{ opacity: entering ? 0 : 1 }}
        >
          <KeeperBox
            /* The gate persona is THE ASHWARDEN, the threshold guard, not the
               village's Emberkeeper (who guides inside the kingdom). Distinct
               name, distinct voice. */
            name="The Ashwarden"
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
                  onClick={(e) => {
                    e.stopPropagation();
                    track("codex_open", { source: "front_door" });
                  }}
                />
              </div>
            }
          >
            <div className="flex gap-4 items-center">
              {/* His face up close: the wide shot already shows the figure at
                  the gate, so the box carries the close-up (helm and burning
                  eyes) instead of repeating him in miniature. */}
              <img
                src={asset("/world/ashwarden/ashwarden-face.webp")}
                alt=""
                draggable={false}
                className="h-20 w-20 sm:h-28 sm:w-28 shrink-0 rounded-md object-cover ring-1 ring-black/70 shadow-[0_2px_10px_rgba(0,0,0,0.6)] select-none"
              />
              <div className="min-w-0 flex-1">
                {sealedReply === 0 ? (
                  <KeeperSpeech
                    lines={GREETING_LINES}
                    voice={KEEPER_VOICE}
                    audioRef={keeperAudioRef}
                    forceDone={spoken}
                    onDone={() => setSpoken(true)}
                  />
                ) : (
                  /* His answer to a hand on the sealed door. Keyed by tap count
                     so an impatient second tap delivers the line again. */
                  <KeeperSpeech
                    key={sealedReply}
                    lines={SEALED_LINES}
                    voice={SEALED_VOICE}
                    audioRef={replyAudioRef}
                    forceDone={replyDone}
                    onDone={() => setReplyDone(true)}
                  />
                )}
              </div>
            </div>
          </KeeperBox>
        </div>
      )}

      {/* X lives quietly on the scene's corner (never inside the keeper's
          speech): the standard footer-corner placement. The plate art is dark,
          so it gets full opacity + a faint ember rim to separate it from the
          equally dark backdrop; hover/focus cross-fades to the lit variant. */}
      <a
        href={X_PROFILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("x_profile_click", { source: "front_door" })}
        aria-label="Follow @pyre_protocol on X"
        title="@pyre_protocol"
        className="group absolute bottom-12 right-5 z-10 block h-9 w-9 outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md"
      >
        <img
          src={asset("/buttons/x_normal.webp")}
          alt=""
          draggable={false}
          className="block h-9 w-9 select-none drop-shadow-[0_0_6px_rgba(255,150,70,0.45)]"
        />
        <img
          src={asset("/buttons/x_hover.webp")}
          alt=""
          draggable={false}
          className="absolute inset-0 h-9 w-9 select-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
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
