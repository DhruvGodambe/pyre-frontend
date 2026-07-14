"use client";

/* ============================================================================
   THE EMBER CRYSTAL, the claimable at the sealed gate
   ----------------------------------------------------------------------------
   Pre-launch the gate is the ONLY surface the public can reach (the kingdom is
   sealed by middleware, and with it the Ashen Cup where the rites live), so a
   visitor, a KOL arriving from the announcement post, could watch the film, read
   the Codex, and leave with nothing. The crystal is what they leave with, and the
   only place outside the kingdom where anything can be earned.

   It is not a giveaway button, it is the funnel's front door, and it climbs:

     carry , the crystal names what sleeps inside, THEN asks for the decree to be
             carried (like + repost). The reward is named before the ask, so the
             visitor knows what the two clicks buy.
     take  , the fire is theirs. The crystals surge, the Embers count up.
     more  , the crystal still burns: follow, and bind a wallet so the Embers have
             somewhere to land at the unsealing.

   The X asks are SELF-ATTESTED link-outs (the Tavern's existing pattern), never
   OAuth: nobody has to sign in to anything to take part.

   These are the REAL rites (lib/quests/catalog), not a parallel score, so Embers
   taken here are already waiting in the Ashen Cup when the kingdom opens.

   ---- Two things this file is deliberately careful about --------------------

   1. THE CRYSTALS ARE SCENERY, NOT A STICKER. They were painted INTO the gate
      art (Nano Banana), then lifted back out by diffing against the original, so
      they carry the scene's own light and the glow they throw onto the rocks.
      They sit at the exact coordinates they were painted at, anchored in IMAGE
      space (the Ashwarden's cover-proxy trick). They NEVER idle-animate: a
      painted backdrop that breathes reads as a sticker, so they are perfectly
      still, and only surge on the claim itself.

   2. THE PHONE CANNOT SEE THEM. The gate art is object-cover, so on a phone it
      crops to roughly its middle quarter and the bottom-right rocks (with the
      crystals in them) fall off the side. Most visitors are on phones. So the
      scene cluster is desktop-only, and on mobile the crystal becomes the hero of
      the claim panel instead, where it surges just the same. The CLAIM ITSELF is
      never in the scene at all: it is a plate in the Ashwarden's box, which is
      the one place at this gate that is always on screen, at every size.
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { PlateButton } from "@/components/ui/keeper-box";
import { KeeperSpeech } from "@/components/ui/keeper-speech";
import { GameIcon } from "@/components/ui/game-icon";
import { asset } from "@/lib/config";
import { playEmberClaim, playEmberGain } from "@/lib/sfx";
import { likeIntent, repostIntent, DECREE_TWEET_ID, X_PROFILE_URL } from "@/lib/social";
import { completeQuestTask, fetchQuestTasks, submitWallet } from "@/lib/quests/client";
import type { QuestTask } from "@/lib/types";
import { track } from "@vercel/analytics";

/** The X brand marks that ride the rite's plates, so the decree reads as X actions at a
    glance: a heart on Like, the retweet arrows on Share, the X logo on Follow. Inline
    SVGs (not image assets) so they inherit the plate's gold via currentColor and stay
    crisp at any size, phone and desktop alike. */
const LikeMark = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full" aria-hidden>
    <path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.813-1.148 2.353-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z" />
  </svg>
);
const RetweetMark = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full" aria-hidden>
    <path d="M4.75 3.79l4.603 4.3-1.706 1.82L6 8.38v7.37c0 .97.784 1.75 1.75 1.75H13V20H7.75c-2.347 0-4.25-1.9-4.25-4.25V8.38L1.853 9.91.147 8.09l4.603-4.3zm11.5 2.71H11V4h5.25c2.347 0 4.25 1.9 4.25 4.25v7.37l1.647-1.53 1.706 1.82-4.603 4.3-4.603-4.3 1.706-1.82L18 15.62V8.25c0-.97-.784-1.75-1.75-1.75z" />
  </svg>
);
const XMark = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/** Where the cluster was painted, in IMAGE coordinates (% of the 16:9 frame).
    Measured from the extraction, so it lands exactly back in the rocks it grew
    out of, at every viewport. */
const SCENE = { left: 61.56, top: 63.15, width: 26.72, height: 36.85 };

/** How long "the crystal listens…" runs before the decree is credited. The Tavern
    pauses for the same reason: an instant tick reads as a checkbox nobody
    verified, so the beat makes the claim feel weighed. */
const LISTEN_MS = 5000;

/** The surge on claim, start to finish. */
const FLARE_MS = 2200;

const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);

/** A count-up, so the Embers visibly LAND rather than just appearing. */
function Count({ to }: { to: number }) {
  const [shown, setShown] = useState(to);
  const prev = useRef(to);
  useEffect(() => {
    const from = prev.current;
    prev.current = to;
    if (from === to) return;
    let raf = 0;
    let t0: number | null = null;
    const step = (t: number) => {
      if (t0 === null) t0 = t;
      const k = Math.min(1, (t - t0) / 900);
      setShown(Math.round(from + (to - from) * easeOut(k)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className="tabular">{shown}</span>;
}

/* ---------------------------------------------------------------------------
   The shared state. The claim plate lives in the Ashwarden's box, the crystals
   live in the scene, and the panel lives at the foot of the gate: three places
   in the tree, one rite. So it rides a context rather than being threaded
   through the front door as props.
   ------------------------------------------------------------------------- */

interface GateCrystalApi {
  ready: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  /** mid-surge: the crystals are giving up their fire right now. */
  flaring: boolean;
  /** anything still unclaimed out here (drives the pip on the plate). */
  pending: boolean;
  embers: number;
  reward: number;
  stage: "carry" | "take" | "more" | "done";
  claimed: boolean;
  followDone: boolean;
  walletDone: boolean;
  points: (id: string) => number;
  liked: boolean;
  reposted: boolean;
  /** true the instant Follow is clicked, not when the server catches up. Like and
      Repost confirm optimistically, and this one has to feel the same. */
  followed: boolean;
  listening: boolean;
  /** The decree write failed after the "listens" beat; offer a retry rather than
      stranding a visitor who did everything on a dead plate. */
  decreeFailed: boolean;
  retryDecree: () => void;
  /** The Embers that just LANDED, and a key that changes on every award so the flourish
      re-fires even when the same amount is won twice. null when nothing is landing. */
  award: { n: number; key: number } | null;
  taking: boolean;
  markLiked: () => void;
  markReposted: () => void;
  take: () => void;
  follow: () => void;
  bindWallet: (address: string) => Promise<string | null>;
}

const Ctx = createContext<GateCrystalApi | null>(null);

function useGate(): GateCrystalApi | null {
  return useContext(Ctx);
}

/** Controlled from the front door, which needs to know when the panel is up so the
    Ashwarden can step back rather than sit underneath it. */
export function GateCrystalProvider({
  children,
  open,
  onOpenChange,
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [tasks, setTasks] = useState<QuestTask[] | null>(null);
  const setOpen = onOpenChange;
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [listening, setListening] = useState(false);
  const [decreeFailed, setDecreeFailed] = useState(false);
  const [taking, setTaking] = useState(false);
  const [flaring, setFlaring] = useState(false);
  const listenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const refresh = useCallback(async () => {
    // Retry a few times before giving up: a single transient 500 on GET /api/quests
    // used to leave tasks null forever, which hides the entire earn surface (no Claim
    // plate, no crystal) with no feedback and no reason for a visitor to reload.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        setTasks(await fetchQuestTasks());
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      if (listenTimer.current) clearTimeout(listenTimer.current);
      if (flareTimer.current) clearTimeout(flareTimer.current);
    };
  }, [refresh]);

  /* EVERY Ember that lands is seen and heard. Watched centrally, here, off the total
     itself: the alternative is remembering to fire a flourish at each of the four call
     sites, and the one that gets forgotten is the one the visitor never notices. A rite
     credited with no reward is a rite they think failed. */
  const [award, setAward] = useState<{ n: number; key: number } | null>(null);
  const prevEmbers = useRef<number | null>(null);
  const awardKey = useRef(0);
  const awardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const by = useMemo(() => new Map((tasks ?? []).map((t) => [t.id, t])), [tasks]);
  const claimed = !!by.get("crystal")?.done;
  const shareDone = !!by.get("share")?.done;
  const followDone = !!by.get("follow")?.done;
  const walletDone = !!by.get("submit")?.done;
  const embers = (tasks ?? []).filter((t) => t.done).reduce((s, t) => s + t.points, 0);

  useEffect(() => {
    if (tasks === null) return;
    const prev = prevEmbers.current;
    prevEmbers.current = embers;
    // First load is not a win: a returning visitor's existing Embers must not chime.
    if (prev === null || embers <= prev) return;
    awardKey.current += 1;
    setAward({ n: embers - prev, key: awardKey.current });
    playEmberGain();
    if (awardTimer.current) clearTimeout(awardTimer.current);
    awardTimer.current = setTimeout(() => setAward(null), 1500);
  }, [embers, tasks]);

  /* Both X actions are self-attested link-outs. Once BOTH are clicked the crystal
     "listens" for a beat, then credits the decree. Driven from the click, not an
     effect, so a re-render can't reset the timer, and it fires exactly once. */
  const listen = (nextLiked: boolean, nextReposted: boolean) => {
    if (!nextLiked || !nextReposted || fired.current) return;
    fired.current = true;
    setDecreeFailed(false);
    setListening(true);
    listenTimer.current = setTimeout(async () => {
      const res = await completeQuestTask("share");
      setListening(false);
      // The write can FAIL (a Supabase blip, a dropped connection) and postJson
      // swallows it into {ok:false} rather than throwing. If it did, the visitor has
      // done everything asked and must not be stranded on a dead plate: re-arm so the
      // rite can offer them a retry, and say so. Only credit + advance on success.
      if (!res.ok) {
        fired.current = false;
        setDecreeFailed(true);
        return;
      }
      track("gate_crystal_decree");
      void refresh();
    }, LISTEN_MS);
  };

  const api: GateCrystalApi = {
    ready: !!tasks,
    open,
    setOpen,
    flaring,
    pending: !!tasks && (!claimed || !followDone || !walletDone),
    embers,
    reward: by.get("crystal")?.points ?? 25,
    claimed,
    followDone,
    walletDone,
    stage: !claimed ? (shareDone ? "take" : "carry") : !followDone || !walletDone ? "more" : "done",
    points: (id) => by.get(id)?.points ?? 0,
    liked,
    reposted,
    // Either the click just happened, or a previous visit already did it.
    followed: followed || followDone,
    listening,
    decreeFailed,
    retryDecree: () => listen(true, true),
    award,
    taking,
    markLiked: () => {
      setLiked(true);
      listen(true, reposted);
    },
    markReposted: () => {
      setReposted(true);
      listen(liked, true);
    },
    /* THE CLAIM. The crystals surge and give up their fire, the Embers count up.
       Optimistic: the flourish runs on the click and the rite is written behind
       it, so the payoff never waits on the network. */
    take: async () => {
      if (taking || claimed) return;
      setTaking(true);
      setFlaring(true);
      playEmberClaim();
      track("gate_crystal_claim");
      flareTimer.current = setTimeout(() => setFlaring(false), FLARE_MS);
      await completeQuestTask("crystal");
      await refresh();
      setTaking(false);
    },
    follow: async () => {
      setFollowed(true); // confirm on the click, not on the round-trip
      await completeQuestTask("follow");
      track("gate_crystal_follow");
      void refresh();
    },
    bindWallet: async (address: string) => {
      const value = address.trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(value)) return "Enter a valid wallet address (0x…).";
      const res = await submitWallet(value);
      if (!res.ok) return res.error ?? "That address could not be bound.";
      track("gate_crystal_wallet");
      void refresh();
      return null;
    },
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/* ---------------------------------------------------------------------------
   1. THE PLATE, in the Ashwarden's box. The only always-on-screen part, and so
      the actual way in. Carries a pip while anything is still unclaimed.
   ------------------------------------------------------------------------- */
export function GateCrystalPlate() {
  const gate = useGate();
  if (!gate?.ready) return null;
  return (
    <PlateButton
      label="Claim Embers"
      /* The Ember Crystal, the emblem Embers are counted with everywhere else, so the
         plate says what it pays before it is read. */
      icon="emberCrystal"
      onClick={(e) => {
        e.stopPropagation();
        gate.setOpen(!gate.open);
        if (!gate.open) track("gate_crystal_open", { stage: gate.stage });
      }}
    />
  );
}

/* ---------------------------------------------------------------------------
   2. THE CRYSTALS, in the rocks. Desktop only (see the header). Painted into the
      scene, perfectly still, and clickable as a second way in, but with NO hover
      state: a piece of the painting that lights up under the cursor would give
      the game away.
   ------------------------------------------------------------------------- */
export function GateCrystalScene() {
  const gate = useGate();
  if (!gate?.ready) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[max(100vh,56.25vw)] w-[max(100vw,177.78vh)] -translate-x-1/2 -translate-y-1/2 sm:block">
      <button
        type="button"
        onClick={() => {
          gate.setOpen(!gate.open);
          if (!gate.open) track("gate_crystal_open", { stage: gate.stage, source: "scene" });
        }}
        aria-label={gate.claimed ? `The Ember Crystal, ${gate.embers} Embers claimed` : "Claim your first Embers"}
        className={`gc-scene pointer-events-auto ${gate.flaring ? "is-flaring" : ""}`}
        style={{
          left: `${SCENE.left}%`,
          top: `${SCENE.top}%`,
          width: `${SCENE.width}%`,
          height: `${SCENE.height}%`,
        }}
      >
        <CrystalArt flaring={gate.flaring} src="/world/ui/crystal-cluster.webp" />
      </button>
    </div>
  );
}

/** The cluster + everything the surge does to it. Shared by the scene (desktop) and
    the panel (mobile), so the claim lands wherever the visitor can see it.

    `src` differs between the two on purpose. In the SCENE it is the painted Emberheart
    lifted out of the gate art, which carries the rocks and wall it grew from: right at
    full size, but at 80px in a dialogue box those rocks are most of the pixels and it
    just reads as a lump of masonry. So the box shows the Ember Crystal SYMBOL instead,
    the same emblem that counts Embers everywhere else. */
function CrystalArt({ flaring, src }: { flaring: boolean; src: string }) {
  // Fixed once, so a re-render mid-surge can't reshuffle the sparks.
  const sparks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        key: i,
        left: `${12 + Math.random() * 74}%`,
        top: `${34 + Math.random() * 46}%`,
        delay: `${(Math.random() * 0.4).toFixed(2)}s`,
        dur: `${(1.0 + Math.random() * 0.9).toFixed(2)}s`,
        size: 2 + Math.round(Math.random() * 4),
        drift: `${(Math.random() * 90 - 45).toFixed(0)}px`,
        rise: `${(70 + Math.random() * 80).toFixed(0)}px`,
      })),
    []
  );
  return (
    // The surge class rides the art itself, not the scene wrapper, so the copy in
    // the panel (mobile) flares exactly the same way.
    <span className={`gc-art ${flaring ? "is-flaring" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={asset(src)} alt="" draggable={false} className="gc-img" />
      <span className="gc-bloom" aria-hidden />
      {flaring &&
        sparks.map((s) => (
          <span
            key={s.key}
            className="gc-spark"
            style={
              {
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                "--dur": s.dur,
                "--delay": s.delay,
                "--drift": s.drift,
                "--rise": s.rise,
              } as CSSProperties
            }
            aria-hidden
          />
        ))}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   3. THE RITE, delivered by THE ASHWARDEN, in his own box.

      The crystal used to open a separate stone panel, which shoved the one
      character who could explain it off the stage: a Claim Embers button and no
      story anywhere. So the rite plays out as HIS dialogue instead. He names the
      Emberheart, his plates are the steps, and the crystal in the rocks answers
      him. No second narrator, no competing chrome.

      His portrait becomes the crystal for the duration, which is also how a phone
      sees the thing surge at all: the cluster itself is cropped out of the scene
      down there (see the header).
   ------------------------------------------------------------------------- */

/** What the Ashwarden says at each rung. Kept here, next to the rite it belongs
    to, and deliberately short: the box shows three lines and never grows. */
const LORE: Record<GateCrystalApi["stage"], string[]> = {
  /* The Emberheart is NAMED here, not in his greeting. This is the moment the visitor
     reached for it, so this is the moment it is worth explaining. */
  carry: [
    "That fire burning in the rocks is the Emberheart. It holds the kingdom's first embers.",
    "And fire does not spread in silence. Carry our decree beyond these walls, and it will answer you with embers of its own.",
  ],
  take: [
    "The word is carried, and the Emberheart has heard it.",
    "Look, the fire stirs in the stone. Take what it offers you.",
  ],
  more: [
    "The embers are yours, and they are counted.",
    "Follow the fire, and leave me an address, so what you have earned can find you when the doors open.",
  ],
  done: [
    "Your embers are counted, and the fire knows your name.",
    "Return when the gates unseal, stranger.",
  ],
};

/** HE SPEAKS every rung of the rite, in the same voice he greets you in. One clip per
    stage, paced letter-exact against the words by the shared KeeperSpeech (the same
    machinery as his greeting), so he talks the visitor through the Emberheart instead
    of the text simply appearing. Re-run scripts/align-voice.py whenever these lines or
    their clips change; it reads LORE straight out of this file. */
const RITE_VOICE: Record<GateCrystalApi["stage"], string> = {
  carry: "/voice-previews/gate-rite-carry.mp3",
  take: "/voice-previews/gate-rite-take.mp3",
  more: "/voice-previews/gate-rite-more.mp3",
  done: "/voice-previews/gate-rite-done.mp3",
};

/** The rite's BODY, handed to the KeeperBox as its children (in place of his face
    and his greeting). */
export function GateCrystalRite() {
  const gate = useGate();
  const [wallet, setWallet] = useState("");
  const [walletErr, setWalletErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Every hook runs BEFORE the readiness guard below.
  const stage = gate?.stage ?? "carry";
  const riteAudio = useRef<HTMLAudioElement | null>(null);
  // Rungs he has already delivered. Coming BACK to a rung (stepping out and in again)
  // must not make him recite it a second time, but advancing to a new one must.
  const said = useRef(new Set<string>());
  if (!gate?.ready) return null;

  const { embers, flaring, walletDone } = gate;
  const spokenAlready = said.current.has(stage);

  const bind = async () => {
    setSaving(true);
    const err = await gate.bindWallet(wallet);
    setSaving(false);
    setWalletErr(err);
  };

  return (
    /* NOT clickable. He is never cut off by a stray click here either: the plates are
       live from the moment the rung opens, so anyone in a hurry just presses one and
       never needs to swat at his words. */
    <div className="flex items-center gap-4">
      {/* The Ember Crystal: the emblem of the thing being claimed. On a phone this is
          the ONLY place the crystal can be seen, since the painted one in the rocks is
          cropped out of the scene entirely. */}
      {/* The crystal is the thing that is LISTENING, so the crystal is what shows it:
          it stirs while it weighs the decree. The plates keep their ticks, because
          nothing is pending on them, they are done. */}
      <div className={`gc-thumb h-20 w-20 shrink-0 sm:h-28 sm:w-28 ${gate.listening ? "is-listening" : ""}`}>
        <CrystalArt flaring={flaring} src="/world/ui/icons/ember_crystal.png" />
      </div>

      <div className="min-w-0 flex-1">
        {/* The Embers LAND: the total flares and a +N flies up off it, with a struck-
            crystal chime. Without this the reward for a rite is a small number quietly
            changing in a corner, which a visitor who just went out to X and back will
            not notice, and a rite they did not see pay out is a rite they think
            failed. */}
        {/* THE WAY BACK is no longer a small link riding this row: it is a plate on the
            frame, and only on the last rung (see GateCrystalActions). */}
        <span
          key={gate.award?.key ?? "idle"}
          className={`gc-total inline-flex items-center gap-1.5 text-brand-soft text-sm ${gate.award ? "is-won" : ""}`}
        >
          <GameIcon name="emberCrystal" size={16} />
          <Count to={embers} />
          <span className="text-text-3">Embers</span>
          {gate.award && <span className="gc-plus">+{gate.award.n}</span>}
        </span>

        {/* He TALKS the visitor through each rung, voice and words together. Keyed by
            stage, so every rung is a fresh delivery. Dumping the finished paragraph in
            made the three-line window scroll instantly and eat its own opening line. */}
        <div className="mt-1">
          <KeeperSpeech
            key={stage}
            lines={LORE[stage]}
            voice={RITE_VOICE[stage]}
            audioRef={riteAudio}
            forceDone={false}
            mute={spokenAlready}
            /* FOUR lines, not three. His `carry` lore is one line too long for the
               three-line window, so the teleprompter scrolled on arrival and ate its own
               opening ("...first embers." instead of "That fire burning in the rocks is
               the Emberheart"). The lore stays exactly as written; the window grows. */
            lineWindow={4}
            onDone={() => said.current.add(stage)}
          />
        </div>


        {/* The one control that cannot be a plate on the frame's edge. Appears only
            on the rung that needs it, so the box keeps its size everywhere else. */}
        {/* The address is the LAST rung, and it does NOT appear until the fire has been
            followed. Showing the field alongside the Follow plate let a visitor bind for
            +50 and walk away from the +10, skipping the rite entirely: the one ask that
            costs them nothing was the one they could dodge. It also broke the one-rung
            rule, with a plate and a field both live at once. */}
        {stage === "more" && gate.followed && !walletDone && (
          <div className="mt-2">
            <div className="flex gap-2">
              <input
                id="gate-wallet"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="0x…"
                aria-label="The address your Embers should land on"
                spellCheck={false}
                autoComplete="off"
                className="forged-field min-w-0 flex-1 px-3 py-1.5 text-sm text-text outline-none placeholder:text-text-3/60"
              />
              {/* The app's own button family (the forged plate the Codex and Replay Tour
                  use), not a bare chip. It sits INSIDE the box beside the field, so it
                  takes the small variant rather than the 52px plate that rides the
                  frame's edge. */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void bind();
                }}
                disabled={saving}
                className="forged-btn forged-btn--sm shrink-0 whitespace-nowrap disabled:opacity-60"
              >
                <span>{saving ? "Binding…" : `Bind +${gate.points("submit")}`}</span>
              </button>
            </div>
            {walletErr && <p className="mt-1 text-danger text-xs">{walletErr}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

/** The rite's PLATES, handed to the KeeperBox as its actions.

    ONE RUNG AT A TIME. Exactly one plate is ever on the frame: Like, then Share, then
    (once the crystal has opened) Take, then Follow. Four plates across the box read as a
    wall of choices, and worse, they were not four of the same thing.

    THE WAY BACK RIDES THE FRAME TOO, but ONLY on the last rung, beside Follow. The rite
    is meant to be walked, not browsed: while the decree is still being carried, or the
    Embers still unclaimed, there is no back plate, so the way out of the crystal is
    THROUGH it. Once the Embers are taken (stage "more") the ask is over and the plate
    appears, because a rite with nothing left to press and no exit strands the visitor
    away from the Codex and the gate. */
export function GateCrystalActions() {
  const gate = useGate();
  if (!gate?.ready) return null;
  const { stage, reward } = gate;

  const back = (
    <PlateButton
      label="Back to the gate"
      onClick={(e) => {
        e.stopPropagation();
        gate.setOpen(false);
      }}
    />
  );

  const plate = (() => {
    if (stage === "carry") {
      // The decree, one act at a time. Like, then Share, then the crystal weighs it.
      if (!gate.liked) {
        return (
          <PlateButton
            label="Like the decree"
            symbol={LikeMark}
            href={likeIntent(DECREE_TWEET_ID)}
            newTab
            onClick={(e) => {
              e.stopPropagation();
              gate.markLiked();
            }}
          />
        );
      }
      if (!gate.reposted) {
        return (
          <PlateButton
            label="Share the decree"
            symbol={RetweetMark}
            href={repostIntent(DECREE_TWEET_ID)}
            newTab
            onClick={(e) => {
              e.stopPropagation();
              gate.markReposted();
            }}
          />
        );
      }
      // The decree write faltered after the beat. Rather than a dead plate, offer the
      // retry: the visitor did everything asked and must be able to get their Embers.
      if (gate.decreeFailed) {
        return (
          <PlateButton
            label="The fire wavered — try again"
            onClick={(e) => {
              e.stopPropagation();
              gate.retryDecree();
            }}
          />
        );
      }
      // Both carried: the wait now has its own plate, filling to a known end, rather
      // than a tick being quietly undone on a button that already succeeded.
      return (
        <PlateButton
          label="The Emberheart listens…"
          disabled
          progressMs={gate.listening ? LISTEN_MS : undefined}
        />
      );
    }

    if (stage === "take") {
      return (
        <PlateButton
          label={gate.taking ? "Taking…" : `Take the ${reward} Embers`}
          disabled={gate.taking}
          onClick={(e) => {
            e.stopPropagation();
            gate.take();
          }}
        />
      );
    }

    // After the claim: Follow, and it STAYS once done and confirms itself with a tick.
    // Rendering it conditionally deleted it out of the tree on success, which is the
    // exact moment a visitor wonders whether they got their Embers.
    // The way back joins it here, and ONLY here: the rite is done being asked.
    return (
      <>
        <PlateButton
          label={gate.followed ? "Followed ✓" : "Follow Pyre"}
          symbol={gate.followed ? undefined : XMark}
          href={gate.followed ? undefined : X_PROFILE_URL}
          newTab
          disabled={gate.followed}
          onClick={(e) => {
            e.stopPropagation();
            gate.follow();
          }}
        />
        {back}
      </>
    );
  })();

  /* One plate rides the frame alone; the last rung rides two. On a phone they wrap
     (the plates sit below the box down there and are sized to their text), and from
     sm up they share one grid row, exactly like the Ashwarden's standing plates. */
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:inline-grid sm:w-auto sm:auto-cols-fr sm:grid-flow-col sm:gap-3">
      {plate}
    </div>
  );
}

/** The styles for all three pieces. Kept together so the surge reads as one
    thing, wherever it happens to be rendered. */
export function GateCrystalStyles() {
  return (
    <style>{`
      /* The cluster in the rocks: a piece of the painting. Anchored in image
         coordinates, so it stays in its rocks at every viewport. */
      .gc-scene {
        position: absolute;
        display: block;
        border: 0;
        padding: 0;
        background: none;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        /* NO hover state, and NO idle animation. It is scenery. */
      }
      .gc-scene:focus-visible { outline: 2px solid var(--color-brand); outline-offset: 4px; border-radius: 6px; }
      .gc-art {
        position: relative;
        display: block;
        width: 100%;
        height: 100%;
      }
      .gc-img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
        user-select: none;
        /* The surge: the fire inside swells and the shards run hot, then settle
           back to exactly where they were. Rooted at the base, because they grow
           out of the rock. */
        transform-origin: 50% 88%;
        transition: filter 400ms ease;
      }
      .gc-art.is-flaring .gc-img { animation: gc-surge ${FLARE_MS}ms var(--ease-warm); }

      /* The crystal standing in for his portrait while he speaks of it. Same
         dark bezel as the face it replaces, so the box doesn't change shape. */
      .gc-thumb {
        position: relative;
        border-radius: 6px;
        overflow: hidden;
        background: radial-gradient(circle at 50% 70%, rgba(255, 138, 46, 0.16), transparent 68%), #0b0705;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.7), 0 2px 10px rgba(0, 0, 0, 0.6);
      }
      .gc-thumb .gc-img { object-fit: contain; padding: 4px; }

      /* An Ember landing. The total flares, and the amount won flies up off it and
         burns out. Keyed on the award, so winning the same amount twice re-fires. */
      .gc-total { position: relative; }
      .gc-total.is-won { animation: gc-total-hit 700ms var(--ease-warm); }
      .gc-plus {
        position: absolute;
        left: 100%;
        top: 50%;
        margin-left: 8px;
        white-space: nowrap;
        font-family: var(--font-display);
        font-size: 15px;
        font-weight: 700;
        color: #fff3d2;
        text-shadow: 0 0 10px color-mix(in srgb, var(--color-brand) 90%, transparent), 0 1px 3px rgba(0,0,0,0.9);
        pointer-events: none;
        animation: gc-plus 1400ms var(--ease-warm) forwards;
      }
      @keyframes gc-total-hit {
        0%   { transform: scale(1);    filter: brightness(1); }
        30%  { transform: scale(1.18); filter: brightness(1.7); }
        100% { transform: scale(1);    filter: brightness(1); }
      }
      @keyframes gc-plus {
        0%   { opacity: 0; transform: translateY(-30%) scale(0.8); }
        18%  { opacity: 1; transform: translateY(-50%) scale(1.1); }
        45%  { opacity: 1; transform: translateY(-80%) scale(1); }
        100% { opacity: 0; transform: translateY(-190%) scale(0.9); }
      }
      @media (prefers-reduced-motion: reduce) {
        .gc-total.is-won { animation: none; }
        .gc-plus { animation: gc-plus-still 1400ms linear forwards; }
        @keyframes gc-plus-still { 0%,80% { opacity: 1; transform: translateY(-50%); } 100% { opacity: 0; } }
      }

      /* Weighing the decree: the crystal stirs, brightening and settling, until it
         answers. This is the ONE place it moves without being claimed. */
      @keyframes gc-listen {
        0%, 100% { filter: brightness(1);    transform: scale(1); }
        50%      { filter: brightness(1.45); transform: scale(1.05); }
      }
      .gc-thumb.is-listening .gc-img { animation: gc-listen 1.6s ease-in-out infinite; }
      .gc-thumb.is-listening {
        box-shadow:
          inset 0 0 0 1px rgba(0, 0, 0, 0.7),
          0 0 16px -2px color-mix(in srgb, var(--color-brand) 70%, transparent);
      }
      @media (prefers-reduced-motion: reduce) {
        .gc-thumb.is-listening .gc-img { animation: none; }
      }

      /* The light the crystals throw when they give up their fire. Invisible at
         rest, so the scene stays exactly as painted. */
      .gc-bloom {
        position: absolute;
        left: 50%;
        top: 62%;
        width: 190%;
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
        pointer-events: none;
        opacity: 0;
        mix-blend-mode: screen;
        background: radial-gradient(circle, rgba(255, 176, 84, 0.85), rgba(255, 120, 40, 0.28) 38%, transparent 66%);
      }
      .gc-art.is-flaring .gc-bloom { animation: gc-bloom ${FLARE_MS}ms ease-out; }

      .gc-spark {
        position: absolute;
        border-radius: 9999px;
        pointer-events: none;
        opacity: 0;
        background: radial-gradient(circle, #fff3d2, var(--color-brand) 55%, transparent);
        animation: gc-spark var(--dur) var(--delay) ease-out forwards;
      }

      @keyframes gc-surge {
        0%   { filter: none; transform: none; }
        18%  { filter: brightness(1.75) saturate(1.25); transform: scale(1.035); }
        45%  { filter: brightness(1.35) saturate(1.12); transform: scale(1.012); }
        100% { filter: none; transform: none; }
      }
      @keyframes gc-bloom {
        0%   { opacity: 0; }
        16%  { opacity: 1; }
        100% { opacity: 0; }
      }
      @keyframes gc-spark {
        0%   { opacity: 0; transform: translate(0, 0) scale(1); }
        18%  { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--drift), calc(var(--rise) * -1)) scale(0.25); }
      }
      /* The scene never moves for a visitor who asked for stillness; the claim
         still reads, through the panel's count-up. */
      @media (prefers-reduced-motion: reduce) {
        .gc-spark, .gc-bloom { display: none; }
        .gc-art.is-flaring .gc-img { animation: none; }
      }
    `}</style>
  );
}
