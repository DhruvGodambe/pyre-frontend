/* SOUND EFFECTS, one-shot UI sounds that play OVER the world.

   Unlike the background music (one persistent <audio> element in
   components/world-audio.tsx), each SFX is a throwaway Audio() instance. Playing
   on its own element means it MIXES with the music: the track keeps going at full
   volume, the effect layers on top, nothing dims or stops. The instance is GC'd
   once it finishes.

   Respects the same mute toggle as the music (the 🔊 button writes pyre_world_muted),
   so muting the world silences effects too. */

import { asset } from "./config";

// Same key the music mute button uses (see components/world-audio.tsx).
const MUTE_KEY = "pyre_world_muted";

const isMuted = () => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false; // private mode / disabled storage: just play
  }
};

/* The designer gave us three door-open takes. We rotate randomly for variety,
   but never play the same one twice in a row so the repetition isn't obvious. */
const DOOR_OPEN = [
  "/world/audio/sfx/door-1.mp3",
  "/world/audio/sfx/door-2.wav",
  "/world/audio/sfx/door-3.wav",
];
let lastDoor = -1;

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

/** Door creak/open, played when stepping into a building (the "Enter" click). */
export function playDoorOpen() {
  let i = Math.floor(Math.random() * DOOR_OPEN.length);
  if (i === lastDoor) i = (i + 1) % DOOR_OPEN.length; // avoid an immediate repeat
  lastDoor = i;
  playOneShot(DOOR_OPEN[i]);
}

/** Camera whoosh, played when clicking a building as the world flies in on it. */
export function playZoom() {
  playOneShot("/world/audio/sfx/zoom.wav");
}
