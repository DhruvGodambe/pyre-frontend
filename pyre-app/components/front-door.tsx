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
import {
  GateCrystalActions,
  GateCrystalPlate,
  GateCrystalProvider,
  GateCrystalRite,
  GateCrystalScene,
  GateCrystalStyles,
} from "@/components/gate-crystal";
import { PyreIntro } from "@/components/pyre-intro";
import { KeeperBox, PlateButton } from "@/components/ui/keeper-box";
import { KeeperSpeech } from "@/components/ui/keeper-speech";
import { useIdentity } from "@/lib/identity";
import { asset, KINGDOM_PATH, LAUNCHED } from "@/lib/config";
import { X_PROFILE_URL } from "@/lib/social";
import { playDoor, preloadSfx } from "@/lib/sfx";
import { preloadAudio } from "@/lib/audio-preload";
import { captureReferral } from "@/lib/quests/client";
import { track } from "@vercel/analytics";

/* Pre-launch the gate stands SEALED and THE ASHWARDEN, the threshold guard,
   stands before it: the designer EXACT character art (clean cutout, zero
   repainting), layered over the scene in image coordinates. He delivers the
   message from the dialogue box once the film clears. At launch the original
   open-gate art returns. */
/* THE GATE THE FILM LEAVES YOU AT: night, the kingdom burning behind a raised wall, a
   molten seam splitting the doors. Deliberately RESTRAINED. Earlier passes flooded the
   floor with lava and grew crystals out of every crack, and each addition traded away
   more of the original painting's craft until it read as machine-made. The designer's
   golden-hour original is untouched at gate-closed.webp; the open gate returns at LAUNCHED. */
const CLOSED_GATE_ART = "/world/interiors/gate-closed-lava-d175aab2.webp";
/* The same gate reframed TALL for a phone. The landscape art is 16:9, so object-cover on
   a portrait screen crops it to a slab of the doors, losing the walls, the lava and the
   whole scene. This 9:16 version fills a phone properly. It is shown ONLY below sm; the
   desktop scene (landscape art + the standing Ashwarden layer) is byte-for-byte unchanged. */
const CLOSED_GATE_ART_PORTRAIT = "/world/interiors/gate-portrait-9e42ab92.webp";

/* The keeper's voice for this scene. NOTE: free-tier ElevenLabs test clip in
   the gitignored voice-previews folder, so production simply stays silent
   (the play() catch swallows the 404) until the licensed voice replaces it.
   When a clip OR its lines change, re-run scripts/align-voice.py so the
   karaoke timing below stays letter-exact. */
const KEEPER_VOICE = "/voice-previews/mystic-callum-gate.mp3";
/* He does NOT explain the Emberheart here. At the threshold he only names the two
   things a stranger can actually do, and the crystal's own lore waits until they
   reach for it (see LORE in gate-crystal.tsx). Front-loading the whole myth into a
   greeting nobody asked for is how you get skipped.

   NOTE, do not put quoted text in this array's comments. scripts/align-voice.py
   scrapes the spoken script by matching quoted strings out of this file, so a quoted
   phrase in a comment gets read as a LINE and silently corrupts every word timing (it
   cost exactly that once). */
const GREETING_LINES = [
  "Welcome, stranger. The gate is currently closed. The kingdom still slumbers behind these doors, and I keep the fire while it dreams.",
  /* One clean sentence, no nested clauses. An earlier take wrapped a clause in commas
     (the Ember Codex, or claim your first embers, while you wait) and ElevenLabs reads
     commas as pauses, so Callum trailed off and muttered the ending. Keep any rewrite of
     this line free of comma-wrapped clauses. */
  "Study the Ember Codex and claim your first Embers while you wait.",
];

/* His answer to a hand on the sealed door (same voice, same recipe as the
   gate clip; regenerate via ElevenLabs if the lines change). */
const SEALED_VOICE = "/voice-previews/mystic-callum-sealed.mp3";
const SEALED_LINES = [
  "Patience, stranger. This gate stays sealed until the first flame rises.",
  "Study the Ember Codex, and be ready when the doors open.",
];

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

  // Warm the audio the visitor is seconds from hearing: the keeper's gate lines
  // (so the voice plays instantly and never trips the 2s watchdog into the silent
  // typewriter) and the world SFX (so the first door/zoom click doesn't lag).
  useEffect(() => {
    preloadAudio([KEEPER_VOICE, SEALED_VOICE]);
    preloadSfx();
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
  // The crystal's panel takes the Ashwarden's place at the foot of the scene
  // while it's open (they'd otherwise sit on top of each other), so he steps
  // back rather than talking over it.
  const [crystalOpen, setCrystalOpen] = useState(false);
  // The keeper ANSWERS a tap on the sealed Enter plate (the plate is locked,
  // not dead: aria-disabled + clickable). Counter so every tap re-delivers
  // the line; 0 = still on the greeting.
  const [sealedReply, setSealedReply] = useState(0);
  const [replyDone, setReplyDone] = useState(false);
  // The live clips, assigned by each KeeperSpeech (which owns playback and paces its
  // text against the clip's playhead); held here so a deliberate act (answering the
  // sealed door) can quiet them.
  const keeperAudioRef = useRef<HTMLAudioElement | null>(null);
  const replyAudioRef = useRef<HTMLAudioElement | null>(null);

  /* NOTHING SKIPS HIM BY ACCIDENT.

     Clicking the box used to cut him off mid-sentence and dump the rest of the line on
     screen. People click by reflex, at the scene, at the box, at nothing, and they were
     killing his delivery without ever meaning to, on the one screen where he explains
     what this place is.

     He simply speaks. Since he cannot be hurried, his instructions can no longer wait on
     him either: the plates come up straight away (see the actions below) and he talks
     over them. Anyone who wants to get on with it just presses one, and reaching for the
     crystal quiets him properly, because opening the rite unmounts his greeting. */

  // He has begun the greeting once. Stepping in and out of the crystal rite re-mounts
  // him, and a stranger should not be re-greeted from the top every time they come back.
  const greetingHeard = useRef(false);
  useEffect(() => {
    if (keeper === "box" && !crystalOpen) greetingHeard.current = true;
  }, [keeper, crystalOpen]);

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
    <GateCrystalProvider open={crystalOpen} onOpenChange={setCrystalOpen}>
    <div
      className="fixed inset-0 z-40 overflow-hidden bg-bg transition-opacity duration-[1000ms] ease-out"
      style={{ opacity: entering ? 0 : 1 }}
    >
      <GateCrystalStyles />
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
        {/* DESKTOP scene, unchanged: the landscape gate, with the standing Ashwarden
            layered on top below. Hidden on phones, where it cropped to a slab of doors. */}
        <Image
          src={asset(LAUNCHED ? gate.interior ?? CLOSED_GATE_ART : CLOSED_GATE_ART)}
          alt=""
          fill
          priority
          sizes="100vw"
          className="hidden object-cover select-none pointer-events-none sm:block"
        />
        {/* MOBILE, portrait framing of the same gate: the whole scene fits a tall screen,
            so no rotating the phone to see it. Only below sm; never touches desktop. At
            launch the open landscape gate returns for everyone. */}
        {!LAUNCHED && (
          <Image
            src={asset(CLOSED_GATE_ART_PORTRAIT)}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover select-none pointer-events-none sm:hidden"
          />
        )}
        {/* The Ashwarden himself: the designer's EXACT pixels (clean cutout,
            zero repainting), standing left of the doors, cropped by the frame
            bottom. Positioned in image coordinates via the same cover-proxy
            geometry as the art, so he stands on the path at every viewport. */}
        {!LAUNCHED && (
          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 w-[max(100vw,177.78vh)] h-[max(100vh,56.25vw)] pointer-events-none sm:block">
            {/* Part of the painting, not a control: he stands at the gate and
                talks through the box below. The Codex has its own plate. */}
            {/* Lifted off the frame's bottom edge so his OFFERED HAND clears the
                dialogue box below. He reads as standing a little further back up
                the path, which the receding cobbles support. */}
            <div className="absolute bottom-[5%] left-[30%] -translate-x-1/2 h-[57%]">
              {/* He OFFERS the Emberheart: his free hand is out, palm up, a small
                  ember crystal burning above it, so the invitation is in the painting
                  itself and not only on a plate. Still the designer's exact figure:
                  only the arm is new (helm, spear, cloak untouched, and
                  ashwarden-cut.webp remains for rollback).

                  HE DOES NOT MOVE. A painted figure that breathes reads as a sticker,
                  which is the same thing that sank the first floating crystal. The
                  ONLY thing alive here is the ember in his palm, which is why it is a
                  separate layer at all: the crystal was baked into his hand, so a
                  second pass repainted the hand EMPTY and the difference between the
                  two became the gem below. */}
              <img
                src={asset("/world/ashwarden/ashwarden-offering-empty.webp")}
                alt=""
                draggable={false}
                className="h-full w-auto max-w-none select-none"
              />
              {/* The gem, hovering over his open palm. Positioned in the figure's own
                  coordinates (this div is exactly the image's box), so it rides his
                  hand at every viewport. */}
              {/* THE EMBER from the film: one dark faceted shard with a furnace burning
                  inside it. Anchored so it rests on the same point of his open palm the
                  old gem did (its bottom point in his fingers), in the figure's own
                  coordinates, so it rides his hand at every viewport. */}
              <img
                src={asset("/world/ashwarden/hand-crystal.webp")}
                alt=""
                draggable={false}
                className="ashwarden-gem absolute select-none"
                style={{ left: "68.84%", top: "29.10%", width: "9.47%" }}
              />
            </div>
          </div>
        )}

        {/* MOBILE Ashwarden. The desktop layer above is anchored in the LANDSCAPE image's
            coordinates, so on the portrait art he would land in the wrong place. This one
            is anchored to the VIEWPORT instead: he stands left of the gate, offered hand
            toward centre, his feet a little into the dialogue box, the same reading as
            desktop. Only below sm; the desktop scene never sees it. Same designer cutout,
            same gem, so nothing new is drawn. */}
        {!LAUNCHED && (
          <div className="absolute inset-0 pointer-events-none sm:hidden">
            <div className="absolute bottom-[26%] left-[30%] h-[52%] -translate-x-1/2">
              <img
                src={asset("/world/ashwarden/ashwarden-offering-empty.webp")}
                alt=""
                draggable={false}
                className="h-full w-auto max-w-none select-none drop-shadow-[0_6px_24px_rgba(0,0,0,0.7)]"
              />
              <img
                src={asset("/world/ashwarden/hand-crystal.webp")}
                alt=""
                draggable={false}
                className="ashwarden-gem absolute select-none"
                style={{ left: "68.84%", top: "29.10%", width: "9.47%" }}
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

      {/* THE EMBER CRYSTAL, grown into the rocks at the right of the gate: the one
          thing out here that can actually be EARNED, and so the only reason a
          stranger who can't get in has to stay. Part of the painting, so it stands
          perfectly still and only surges when its fire is taken. The way IN is the
          Claim plate in the Ashwarden's box (below), which is on screen at every
          size; the crystals themselves are cropped away on a phone.
          At launch the doors open and the crystal has done its job. */}
      {!LAUNCHED && keeper !== "hidden" && !entering && <GateCrystalScene />}

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
            className="animate-entry w-full max-w-2xl shadow-panel"
            actions={
              /* While the crystal rite is open, HE runs it: the plates below are
                 its rungs, not his standing instructions. */
              crystalOpen ? (
                <GateCrystalActions />
              ) : (
              /* His instructions: forged plates riding the bottom edge, they
                 appear once the words have landed. The X now lives on the
                 scene's corner, not in his speech (see below).

                 Three plates do NOT fit across a phone (each has a 128px floor,
                 and the keeper frame leaves ~300px inside), so on mobile the
                 Claim plate takes its own row above the other two, which sit side
                 by side. From sm up, `contents` dissolves that inner row and all
                 three ride the one grid. */
              <div
                className={
                  "flex w-full animate-entry flex-col items-center gap-3 sm:inline-grid sm:w-auto sm:auto-cols-fr sm:grid-flow-col"
                }
              >
                <div className="flex items-center gap-3 sm:contents">
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
                {/* The way to the crystal, riding the right end of his instructions.
                    On a phone it drops to its own row beneath the other two (three
                    plates cannot fit across, see above). */}
                <GateCrystalPlate />
              </div>
              )
            }
          >
            {crystalOpen ? (
              <GateCrystalRite />
            ) : (
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
                    /* Stepping back out of the crystal rite re-mounts him. He does not
                       greet the same stranger twice: the words are simply THERE, and he
                       stays quiet. */
                    mute={greetingHeard.current}
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
                    /* Same as the greeting: a fresh TAP re-keys this and he answers
                       again, but merely coming back from the crystal must not make
                       him repeat an answer he has already given. */
                    mute={replyDone}
                    onDone={() => setReplyDone(true)}
                  />
                )}
              </div>
            </div>
            )}
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
    </GateCrystalProvider>
  );
}
