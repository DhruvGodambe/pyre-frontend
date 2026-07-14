"""Align the Emberkeeper voice clips to their scripts, word by word.

Reads every tour line (text + preText variants) straight out of lib/tour.tsx
PLUS the front door's voiced scripts (gate greeting + sealed reply) out of
components/front-door.tsx, transcribes each voice clip with faster-whisper
(word timestamps), aligns the known script words to the heard words, and
writes lib/tour-voice-timing.ts: per clip, per text variant, a [start, end]
second pair for every word. The narration box and the gate's KeeperSpeech use
those to reveal the line letter-exact with the voice.

Run from pyre-app/:  python scripts/align-voice.py
Re-run whenever voice clips, tour lines, or the gate lines change.

Requires: pip install faster-whisper  (model downloads on first run)
"""

import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
TOUR = APP / "lib" / "tour.tsx"
FRONT_DOOR = APP / "components" / "front-door.tsx"
GATE_CRYSTAL = APP / "components" / "gate-crystal.tsx"
OUT = APP / "lib" / "tour-voice-timing.ts"
VOICE_DIR = APP / "public"

LINE_RE = re.compile(
    r'text:\s*"([^"]+)",\s*preText:\s*"([^"]+)",\s*voice:\s*"([^"]+)"',
    re.DOTALL,
)


def gate_lines() -> list[tuple[str, str, str]]:
    """The front door's voiced scripts as (text, pre_text, voice) rows, read
    out of front-door.tsx. Line arrays join with a single space: KeeperSpeech
    joins them with one "\\n" and splits words on space OR newline, so the
    word count (and separator accounting) matches."""
    src = FRONT_DOOR.read_text(encoding="utf-8")

    def const_str(name: str) -> str:
        m = re.search(rf'const {name} = "([^"]+)";', src)
        if not m:
            sys.exit(f"missing const {name} in front-door.tsx")
        return m.group(1)

    def const_lines(name: str) -> str:
        m = re.search(rf"const {name} = \[(.*?)\];", src, re.DOTALL)
        if not m:
            sys.exit(f"missing const {name} in front-door.tsx")
        return " ".join(re.findall(r'"([^"]+)"', m.group(1)))

    return [
        (const_lines("GREETING_LINES"), const_lines("GREETING_LINES"), const_str("KEEPER_VOICE")),
        (const_lines("SEALED_LINES"), const_lines("SEALED_LINES"), const_str("SEALED_VOICE")),
    ]


def rite_lines() -> list[tuple[str, str, str]]:
    """The Emberheart rite's scripts, read out of gate-crystal.tsx.

    The Ashwarden speaks every rung of the crystal rite (carry / take / more / done),
    one clip each, through the same KeeperSpeech as his greeting. So those clips need
    word timings too, or his voice runs against words that are still being revealed.

    Pairs each stage in LORE with its clip in RITE_VOICE. Anchored on the closing "],"
    of each stage so the LAST stage is not silently dropped (a looser pattern skipped
    `done` once already, and a missing clip fails quietly: it just falls back to the
    typewriter, which is exactly the drift this file exists to prevent)."""
    src = GATE_CRYSTAL.read_text(encoding="utf-8")

    lore = re.search(r"const LORE:[^=]+= \{(.*?)\n\};", src, re.DOTALL)
    voices = re.search(r"const RITE_VOICE:[^=]+= \{(.*?)\n\};", src, re.DOTALL)
    if not lore or not voices:
        sys.exit("missing LORE / RITE_VOICE in gate-crystal.tsx")

    clips = dict(re.findall(r'(\w+):\s*"([^"]+)"', voices.group(1)))
    rows: list[tuple[str, str, str]] = []
    for stage, body in re.findall(r"(\w+):\s*\[(.*?)\n  \],", lore.group(1), re.DOTALL):
        if stage not in clips:
            sys.exit(f"LORE stage {stage} has no clip in RITE_VOICE")
        text = " ".join(re.findall(r'^\s*"(.+?)",\s*$', body, re.M))
        rows.append((text, text, clips[stage]))
    return rows


def norm(word: str) -> str:
    """Normalize a word for matching script to transcript ("$PYRE," -> "pyre")."""
    return re.sub(r"[^a-z0-9]", "", word.lower())


def align(script_words: list[str], heard: list) -> list[tuple[float, float]]:
    """Map each script word to a [start, end] via matched anchors; interpolate
    the unmatched stretches proportionally to word length."""
    s_norm = [norm(w) for w in script_words]
    h_norm = [norm(w.word) for w in heard]
    sm = SequenceMatcher(a=s_norm, b=h_norm, autojunk=False)

    spans: list[tuple[float, float] | None] = [None] * len(script_words)
    for block in sm.get_matching_blocks():
        for k in range(block.size):
            w = heard[block.b + k]
            spans[block.a + k] = (w.start, w.end)

    clip_end = heard[-1].end if heard else 0.0
    matched = sum(1 for s in spans if s)

    # Fill unmatched runs by spreading the surrounding gap across them,
    # weighted by word length (longer words take longer to say).
    i = 0
    while i < len(spans):
        if spans[i] is not None:
            i += 1
            continue
        j = i
        while j < len(spans) and spans[j] is None:
            j += 1
        gap_start = spans[i - 1][1] if i > 0 else (heard[0].start if heard else 0.0)
        gap_end = spans[j][0] if j < len(spans) else clip_end
        if gap_end <= gap_start:
            gap_end = gap_start
        weights = [max(2, len(script_words[k])) for k in range(i, j)]
        total = sum(weights)
        t = gap_start
        for k, wt in zip(range(i, j), weights):
            t2 = t + (gap_end - gap_start) * wt / total
            spans[k] = (t, t2)
            t = t2
        i = j

    # Enforce monotonic, non-degenerate spans.
    prev = 0.0
    fixed: list[tuple[float, float]] = []
    for s, e in spans:  # type: ignore[misc]
        s = max(s, prev)
        e = max(e, s)
        fixed.append((round(s, 2), round(e, 2)))
        prev = e
    print(f"    matched {matched}/{len(script_words)} words to the transcript")
    return fixed


def main() -> None:
    lines = LINE_RE.findall(TOUR.read_text(encoding="utf-8"))
    if not lines:
        sys.exit("No text/preText/voice blocks found in lib/tour.tsx")
    print(f"{len(lines)} voiced tour lines found in tour.tsx")
    lines += gate_lines()
    lines += rite_lines()
    print("+ 2 gate lines from front-door.tsx")

    from faster_whisper import WhisperModel

    print("loading whisper model (small, int8)...")
    model = WhisperModel("small", device="cpu", compute_type="int8")

    out: dict[str, list[list[list[float]]]] = {}
    for text, pre_text, voice in lines:
        clip = VOICE_DIR / voice.lstrip("/")
        if not clip.exists():
            sys.exit(f"missing clip: {clip}")
        print(f"{voice}")
        segments, _ = model.transcribe(
            str(clip),
            language="en",
            word_timestamps=True,
            initial_prompt=pre_text,
        )
        heard = [w for seg in segments for w in seg.words]
        print(f"    heard {len(heard)} words")

        variants = []
        seen: set[str] = set()
        for variant in (text, pre_text):
            if variant in seen:
                continue
            seen.add(variant)
            variants.append([list(p) for p in align(variant.split(" "), heard)])
        out[voice] = variants

    body = json.dumps(out, separators=(",", ":"))
    OUT.write_text(
        "/* AUTO-GENERATED by scripts/align-voice.py, do not edit by hand.\n"
        "   Word-level [start, end] seconds for every Emberkeeper voice clip,\n"
        "   one timing list per text variant of the line (launched text first,\n"
        "   preText second when it differs). The narration box picks the list\n"
        "   whose length matches the displayed line's word count and reveals\n"
        "   the words in step with the clip's playhead. */\n\n"
        "export const VOICE_TIMING: Record<string, [number, number][][]> =\n"
        f"  {body};\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
