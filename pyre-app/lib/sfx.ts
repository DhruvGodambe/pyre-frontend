/* SOUND EFFECTS, one-shot UI sounds that play OVER the world.

   Unlike the background music (one persistent <audio> element in
   components/world-audio.tsx), each SFX is a throwaway Audio() instance. Playing
   on its own element means it MIXES with the music: the track keeps going at full
   volume, the effect layers on top, nothing dims or stops. The instance is GC'd
   once it finishes.

   Respects the same mute toggle as the music (the 🔊 button writes pyre_world_muted),
   so muting the world silences effects too. */

import { asset } from "./config";
import { preloadAudio } from "./audio-preload";

// Same key the music mute button uses (see components/world-audio.tsx).
const MUTE_KEY = "pyre_world_muted";

const isMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false; // private mode / disabled storage: just play
  }
};

/* The designer gave us three door takes. Each building gets ONE of them, chosen
   deterministically from its id, so entering and leaving the same building always
   sound identical (and it stays consistent across visits), while different
   buildings get different doors for variety. */
const DOOR_OPEN = [
  "/world/audio/sfx/door-1.mp3",
  "/world/audio/sfx/door-2.wav",
  "/world/audio/sfx/door-3.wav",
];

function doorIndex(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % DOOR_OPEN.length;
}

/** A bit louder than the music (VOLUME 0.45) so the effect reads over the track. */
const SFX_VOLUME = 0.7;

function playOneShot(src: string, volume = SFX_VOLUME) {
  if (typeof window === "undefined" || isMuted()) return;
  try {
    const a = new Audio(asset(src));
    a.volume = volume;
    // Autoplay can reject if there's been no gesture yet; this is always called
    // from a click, so it'll play, but swallow the rejection just in case.
    a.play().catch(() => {});
  } catch {
    /* no Audio support: silently skip */
  }
}

/** Warm the SFX that fire on the very next interactions (door on Enter, zoom on
    a building click, the stake flourish), so the first play is cache-hot instead
    of downloading mid-click. Call once the world is about to be interactive. The
    forge stings are intentionally left out until the designer delivers them (they
    404 today and would just noise the console). Idempotent. */
export function preloadSfx() {
  preloadAudio([
    ...DOOR_OPEN,
    "/world/audio/sfx/zoom.wav",
    "/world/audio/sfx/stake-ward.mp3",
    // The gate's Embers chime: the very first rite must not land silently while the
    // file is still downloading.
    "/world/audio/sfx/ember-gain.wav",
  ]);
}

/** Door sound for a building, the SAME on enter and leave (keyed by building id). */
export function playDoor(key: string) {
  playOneShot(DOOR_OPEN[doorIndex(key)]);
}

/** Camera whoosh, played when clicking a building as the world flies in on it. */
export function playZoom() {
  playOneShot("/world/audio/sfx/zoom.wav");
}

/* ---- FORGE REVEAL SOUNDS (designer to deliver) -------------------------------
   The designer is making a Forge sting per tier upgrade, plus one for the LP
   burn. Until the files land these 404 and playback silently no-ops, so the
   cinematic still runs, just muted. File names the app expects:
     /world/audio/sfx/forge-tier-1.mp3 … forge-tier-4.mp3
     /world/audio/sfx/forge-tier-immolated.mp3
     /world/audio/sfx/forge-lp-burn.mp3
   ---------------------------------------------------------------------------- */

/** Tier upgrade sting (one per tier). `stage` 1-4, or immolated. */
export function playForgeTierUp(stage: number, isImmolated = false) {
  const file = isImmolated ? "forge-tier-immolated" : `forge-tier-${stage}`;
  playOneShot(`/world/audio/sfx/${file}.mp3`, 0.85);
}

/** LP burn sting (the bigger, permanent sacrifice). */
export function playLpBurn() {
  playOneShot("/world/audio/sfx/forge-lp-burn.mp3", 0.85);
}

/** Stake "warding" sound (commit → protection). Softer than the burn stings. */
export function playStakeWard() {
  playOneShot("/world/audio/sfx/stake-ward.mp3", 0.7);
}

/** The Ember Crystal cracking open at the sealed gate (the claim payoff). Same
    convention as the forge stings: silently no-ops until the designer delivers
    /world/audio/sfx/ember-claim.mp3, so the flourish still runs, just muted. */
export function playEmberClaim() {
  playOneShot("/world/audio/sfx/ember-claim.mp3", 0.8);
}

/** An Ember LANDING: one struck-crystal chime per rite credited at the gate, so the
    reward is HEARD and not just quietly added to a small number in the corner.

    PLACEHOLDER, synthesised (a bell's inharmonic partials, which is what makes glass
    sound like glass) because the ElevenLabs key is scoped to speech and its sound
    endpoint refuses us. Swap in the designer's when it lands; nothing else changes. */
export function playEmberGain() {
  playOneShot("/world/audio/sfx/ember-gain.wav", 0.55);
}