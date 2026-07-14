"use client";

/* THE SPOKEN LINE, wherever a keeper speaks.

   Lifted out of the front door so the gate's crystal rite can use the SAME machinery
   rather than a second, drifting copy of it: one place that knows how to reveal a
   script against a voice, used by the Ashwarden's greeting, his answer to the sealed
   door, and every rung of the Emberheart rite.

   The reveal is paced against THE CLIP'S OWN PLAYHEAD, using the word timestamps in
   lib/tour-voice-timing.ts (written by scripts/align-voice.py), so the words appear
   letter-exact with the voice and never run ahead of it. With no usable clip (missing
   in production, autoplay refused, ended early) it falls back to a reading-pace
   typewriter, so the line always lands either way.

   ---- Why this re-renders as rarely as it does ------------------------------

   It renders ONLY when a new character is actually revealed, roughly ten times a
   second, and stops dead once the line has landed.

   That is deliberate, and it was not free. The first version kept the playhead in state
   and wrote it every animation frame (~60 renders/sec whether or not a letter appeared),
   AND ran a 24ms typewriter interval alongside it (another ~40/sec) even while the voice
   was doing the pacing. Every one of those re-rendered the whole dialogue, and KeeperText
   re-measures its layout on each render. Three loops fighting over one box, and it
   visibly stuttered while the Embers were landing. One loop now, and it only speaks up
   when it has something new to say. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KeeperText } from "@/components/ui/keeper-box";
import { asset } from "@/lib/config";
import { VOICE_TIMING } from "@/lib/tour-voice-timing";

/** How far (seconds) the revealed text runs ahead of the voice. A touch of early
    reads as in-sync; trailing reads as broken. */
const VOICE_LEAD = 0.12;

/** Reading pace for any stretch no voice is covering. */
const MS_PER_CHAR = 24;

export function KeeperSpeech({
  lines,
  voice,
  audioRef,
  forceDone,
  mute = false,
  lineWindow = 3,
  onDone,
}: {
  lines: string[];
  /** the clip speaking this text; its playhead paces the reveal. */
  voice: string;
  /** receives the live Audio element, so the caller can quiet a skip. */
  audioRef?: React.MutableRefObject<HTMLAudioElement | null>;
  forceDone: boolean;
  /** He has ALREADY said this: the words are simply there, and he stays quiet.

      Leaving the crystal rite re-mounts him, and a fresh mount would otherwise build a
      new Audio and deliver the whole line again at someone who already heard it. Read
      once, at mount: flipping it mid-sentence must not restart anything. */
  mute?: boolean;
  lineWindow?: number;
  onDone: () => void;
}) {
  const text = useMemo(() => lines.join("\n"), [lines]);
  const total = text.length;

  // The script, and the clip's word timings for it. The clip normally covers the whole
  // script; it may also cover only a PREFIX, when a line was written after the take was
  // recorded. Then the recorded words still pace letter-exact and the tail types on at
  // reading pace, rather than the voice saying one thing while the screen shows another.
  const { words, timing, spokenChars } = useMemo(() => {
    const w = text.split(/[ \n]/);
    const table = VOICE_TIMING[voice];
    const t = table?.find((x) => x.length === w.length) ?? table?.find((x) => x.length < w.length);
    const chars = t ? w.slice(0, t.length).reduce((n, x) => n + x.length + 1, 0) : 0;
    return { words: w, timing: t, spokenChars: chars };
  }, [text, voice]);

  const [shown, setShown] = useState(0);
  const shownRef = useRef(0);
  const doneRef = useRef(false);
  const mutedAtMount = useRef(mute);

  /** The reveal only ever moves FORWARD, and only re-renders when it actually moves. */
  const reveal = useCallback(
    (n: number) => {
      const next = Math.min(total, Math.max(n, shownRef.current));
      if (next === shownRef.current) return;
      shownRef.current = next;
      setShown(next);
    },
    [total]
  );

  useEffect(() => {
    if (forceDone) reveal(total);
  }, [forceDone, reveal, total]);

  useEffect(() => {
    // Already delivered: the words are his, so they are simply on screen.
    if (mutedAtMount.current) {
      reveal(total);
      return;
    }

    const a = new Audio(asset(voice));
    if (audioRef) audioRef.current = a;

    let voiced = true; // false once the clip is missing, refused, or finished early
    const bail = () => {
      voiced = false;
    };
    a.addEventListener("error", bail);
    void a.play().catch(bail);
    const watchdog = window.setTimeout(() => {
      if (a.paused || a.currentTime === 0) bail();
    }, 2000);

    const t0 = performance.now();
    let tailFrom: number | null = null; // when the voice ran out of recorded words
    let raf = 0;

    const step = (now: number) => {
      let target: number;

      if (voiced && timing && !a.paused && !a.ended) {
        const t = a.currentTime + VOICE_LEAD;
        let paced = 0;
        for (let i = 0; i < timing.length; i++) {
          const [start, end] = timing[i];
          if (t >= end) {
            paced += words[i].length + 1; // the whole word and its separator
          } else {
            if (t > start) paced += Math.round((words[i].length * (t - start)) / (end - start));
            break;
          }
        }
        // Past the clip's last recorded word, reading pace carries the tail, rebased to
        // the moment the voice fell silent so it types on rather than snapping in.
        if (paced >= spokenChars && spokenChars < total) {
          if (tailFrom === null) tailFrom = now;
          paced = spokenChars + Math.floor((now - tailFrom) / MS_PER_CHAR);
        }
        target = paced;
      } else {
        // No voice pacing (never played, or the clip has ended): reading pace, carrying
        // on from wherever the voice got to.
        const base = tailFrom !== null ? spokenChars : 0;
        target = base + Math.floor((now - (tailFrom ?? t0)) / MS_PER_CHAR);
      }

      reveal(target);
      if (shownRef.current < total) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      window.clearTimeout(watchdog);
      cancelAnimationFrame(raf);
      a.pause();
      if (audioRef && audioRef.current === a) audioRef.current = null;
    };
  }, [voice, audioRef, reveal, total, timing, words, spokenChars]);

  useEffect(() => {
    if (shown >= total && !doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }, [shown, total, onDone]);

  return <KeeperText text={text} shown={shown} lines={lineWindow} />;
}
