"use client";

/* ============================================================================
   PYRE, Emberkeeper Intro  (the first-time, forced storytelling onboarding)
   ----------------------------------------------------------------------------
   The user-facing "Welcome, stranger" sequence shown on a visitor's FIRST visit.
   A narrated guide, the Emberkeeper, walks the stranger through three acts:

     ACT 1 · Cold open, the lore: what PYRE is, the fire & the decay, the docs.
     ACT 2 · The tour, every building, one narrated beat each, ending at the
                            Ashen Cup (the rites) to set up the funnel.
     ACT 3 · The funnel, introduce the rites, do the FIRST one for real
                            (Follow @PYRE → completes the real quest), then a
                            shareable "flex" card with a one-tap pre-filled tweet.

   Why this shape (from the GTM research on crypto game-worlds, Sunflower Land,
   Pixels, and Telegram funnels, Hamster Kombat):
     • Forced but feels optional: a muted Skip link + an ENDOWED progress bar
       (starts part-filled) so finishing feels inevitable, not trapped.
     • The X / share prompt lands AFTER a first win, never on the cold open.
     • Resumable: the current step is saved, so a refresh / wallet popup never
       restarts it.
     • Mobile-first: full-screen narrated cards (NOT DOM-anchored spotlights,
       which break across the two shells and off-screen on phones).

   This is NOT the DesignerIntro (that's a mock-only design-preview aid). This is
   the real product onboarding and shows in every mode. Token-only classes, so it
   reskins with the rest of the app when the designer's look lands.
   ========================================================================== */

import { useEffect, useState } from "react";
import Image from "next/image";
import { BUILDING_BY_ID, type BuildingId } from "@/components/buildings";
import { ProgressBar } from "@/components/ui/primitives";
import { EntryFork } from "@/components/ui/entry-fork";
import { QUEST_CATALOG } from "@/lib/quests/catalog";
import { useCompleteQuestTask, useReferral } from "@/lib/hooks";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { useTour } from "@/lib/tour";
import { useCodex } from "@/lib/codex";
import { shortAddress } from "@/lib/format";
import { X_HANDLE, tweetIntent, referralLink } from "@/lib/social";
import { USE_MOCK, asset } from "@/lib/config";
import { storageGet, storageSet, storageRemove } from "@/lib/safe-storage";

/* localStorage keys, "seen" gates the auto-show; "step" makes it resumable. */
const SEEN_KEY = "pyre_intro_seen";
const STEP_KEY = "pyre_intro_step";

/* Endowed-progress head start: the bar is already ~18% full at step one, so the
   stranger feels they've begun, not that they're staring down a long road. */
const PROGRESS_HEAD = 0.18;

/* The tour order, narrative flow, NOT registry order. Ends on the Tavern so the
   tour walks straight into the rites (the funnel). The Gate is excluded: it IS
   the connect mechanic, introduced in the lore, not toured. */
const TOUR: BuildingId[] = [
  "bonfire",
  "forge",
  "vault",
  "observatory",
  "exchange",
  "market",
  "immolated",
  "tavern",
];

/* The Emberkeeper's one line per building, "what you can do here", in his voice.
   Kept separate from the registry `description` (that copy is for the at-the-door
   preview; this is the guided-tour beat). */
const TOUR_LINE: Record<BuildingId, string> = {
  bonfire:
    "The heart of it all. Every $PYRE fed to the fire feeds this flame. Watch the burn climb, live.",
  forge:
    "Where you act. Stake your $PYRE to earn ETH yield and shield it from the decay, then burn $PYRE to forge your Pyre Acolyte, which multiplies that yield up to 3×.",
  vault:
    "Your own hold. Your Pyre Acolyte, your balances, your yield, your standing in the fire. Everything here is yours.",
  observatory:
    "The watchtower. Read the whole protocol at a glance: supply, decay, burns, yield. No wallet needed to look.",
  exchange:
    "The trading floor. Swap ETH and $PYRE, every fee shown to you honestly. Nothing is hidden in the dark.",
  market:
    "The bazaar. Browse and claim the Pyre Acolytes that other wallets have forged in the flame.",
  immolated:
    "The inner order. Reach the Pyre, burn once more, and these doors open to a deeper share of the fire.",
  tavern:
    "The Ashen Cup, and the reason you came early. Take up the quests, bring friends to the fire, and climb the leaderboard. The reward is revealed closer to launch.",
  gate: "",
};

/* The scene list. Lore → building tour → identity → funnel → referral (which
   ends by sending the visitor into the Tavern). */
type Scene =
  | { kind: "lore"; title: string; body: string; docs?: boolean }
  | { kind: "building"; id: BuildingId }
  | { kind: "identity" }
  | { kind: "funnel" }
  | { kind: "referral" };

/* The intro is now just the LORE COLD-OPEN + the identity choice. Choosing how
   you enter hands off to the guided world Tour (lib/tour), one onboarding, not
   two. The building walk / rites that used to live here are the Tour now. */
const SCENES: Scene[] = [
  {
    kind: "lore",
    title: "Welcome to PYRE.",
    body:
      "PYRE is a project built around one idea: $PYRE is a token made to be burned. Burn and stake it to earn ETH yield and level up your NFT.",
  },
  {
    kind: "lore",
    title: "You're early.",
    body:
      "Not many people have found this yet, and early users are rewarded. There are quests to complete in these first days, and what they unlock is revealed closer to launch.",
  },
  {
    kind: "lore",
    title: "Let me show you around.",
    body:
      "I'm the Emberkeeper, your guide. Choose how you'll enter, and I'll walk you through the app, building by building, so you know how it all works. Want the full background first? It's always here.",
    docs: true,
  },
  { kind: "identity" },
];

/* The building glyph (placeholder until the designer's exterior art lands). */
const glyph = (id: BuildingId) =>
  id === "gate" ? "🏮" : id === "bonfire" ? "🔥" : "🏛";

export function EmberkeeperIntro() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  // Skip asks for confirmation first, a loss-aversion guard so people don't
  // bail on their first rite by reflex.
  const [confirmSkip, setConfirmSkip] = useState(false);
  const complete = useCompleteQuestTask();
  const { navigate } = useNavigation();
  const identity = useIdentity();
  const tour = useTour();

  // First visit → open at the saved step (resumable). Runs client-side only.
  //
  // Escape hatch for review: visiting with `?intro=1` (or `#intro`) FORCES the
  // intro open from the start, regardless of the "seen" flag and regardless of
  // mock/live mode. This is how the team and the designer re-watch the whole
  // flow on demand without clearing storage or hunting for the replay button, 
  // it skips otherwise because it's deliberately first-visit-only.
  useEffect(() => {
    setReady(true);
    const force =
      new URLSearchParams(window.location.search).has("intro") ||
      window.location.hash === "#intro";
    if (force) {
      setStep(0);
      setOpen(true);
      return;
    }
    if (storageGet(SEEN_KEY)) return;
    const saved = Number(storageGet(STEP_KEY) ?? 0);
    setStep(Number.isFinite(saved) ? Math.min(saved, SCENES.length - 1) : 0);
    setOpen(true);
  }, []);

  // Persist the step so a refresh / wallet popup resumes instead of restarting.
  useEffect(() => {
    if (open) storageSet(STEP_KEY, String(step));
  }, [open, step]);

  if (!ready || !open) {
    // Mock-only replay control, so the look can be re-tested without clearing
    // storage. Bottom-centre, clear of the DesignerIntro "?" (bottom-right) and
    // the Preview switcher (bottom-left). Never ships to the real app.
    //
    // FULL first-time reset: identity now persists server-side (Supabase, keyed
    // by the session cookie), so just reopening would show the "You're in"
    // identity scene instead of the virgin connect-vs-guest fork. identity.reset()
    // clears the guest choice (local + server) and disconnects the mock wallet,
    // so the designer sees the true first-visit experience on every replay.
    return ready && USE_MOCK ? (
      <button
        onClick={() => {
          identity.reset(); // clears guest (local + server) + disconnects wallet
          storageRemove(SEEN_KEY);
          storageRemove(STEP_KEY);
          setStep(0);
          setOpen(true);
        }}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 rounded-full bg-surface-2/95 border border-surface-3 text-text-3 text-xs px-3 py-1.5 shadow-panel backdrop-blur hover:border-brand hover:text-brand transition-colors"
        title="Replay the full first-time intro from scratch, resets identity so the connect-vs-guest fork shows fresh (mock only)"
      >
        ↺ Replay first-time intro
      </button>
    ) : null;
  }

  const scene = SCENES[step];
  const last = step === SCENES.length - 1;
  const progress = PROGRESS_HEAD + (step / (SCENES.length - 1)) * (1 - PROGRESS_HEAD);

  const next = () => setStep((s) => Math.min(s + 1, SCENES.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => {
    // Dismiss FIRST, then persist. A blocked/full-storage write must never stop
    // the intro from closing (that would strand the visitor behind the overlay).
    setOpen(false);
    storageSet(SEEN_KEY, "1");
    storageRemove(STEP_KEY);
  };
  // The closing hand-off: drop the visitor straight into The Tavern → Rites.
  // (No "intro" credit here, that quest is the guided TOUR, granted on finishing
  // it. Someone who skips straight to the rites can take the tour from there.)
  const enterRites = () => {
    navigate({ building: "tavern", tab: "rites" });
    finish();
  };

  // Hand off from the lore/identity intro to the guided Tour, one onboarding.
  // Desktop flies the camera over the map; mobile scrolls + spotlights panels.
  // The "intro" rite is credited when the tour is FINISHED (see tour-ui.tsx),
  // not here, so the reward lands as the payoff for doing the walk.
  const beginTour = () => {
    finish();
    tour.start();
  };

  return (
    <>
    {/* Forced: the backdrop does NOT dismiss. The only exits are Skip / Enter. */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/92 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-panel bg-surface border border-surface-3/60 shadow-panel">
        {/* Top bar, endowed progress + a muted, deliberately un-inviting skip. */}
        <div className="flex items-center gap-3 px-5 pt-4">
          <div className="flex-1">
            <ProgressBar value={progress} />
          </div>
          {/* Always-available exit. Kept secondary (muted), research says a
              forced flow with no out raises drop-off, but the reward hook above
              is what pulls people through rather than trapping them. */}
          <button
            onClick={() => setConfirmSkip(true)}
            className="text-text-3 text-xs hover:text-text-2 transition-colors shrink-0"
          >
            Skip intro
          </button>
        </div>

        {/* Narrator chrome, the Emberkeeper. No face; an ember glyph + a name. */}
        <div className="flex items-center gap-2 px-5 pt-4">
          <span className="text-brand text-lg" aria-hidden>
            ✦
          </span>
          <span className="text-text-3 text-[11px] uppercase tracking-[0.25em]">
            The Emberkeeper
          </span>
        </div>

        {/* COLD-OPEN HOOK (step 0 only). Plant the goal + reward up front so the
            visitor has a reason to finish, without pitching the quest ask yet
            (that lands after a first win). Glosses "rite" in plain words on first
            use, and teases the reward without over-promising (revealed at launch).
            Backed by onboarding research: early reward expectation + goal-gradient
            lift completion; unexplained jargon drives drop-off. */}
        {step === 0 && (
          <div className="mx-5 mt-3 rounded-md border border-brand/25 bg-brand/[0.06] px-3.5 py-2.5">
            <p className="text-text-2 text-xs leading-relaxed">
              Stay to the end and you&rsquo;ll complete your{" "}
              <span className="text-brand">first quest</span>. The early
              are rewarded: quests earn <span className="text-text">Points</span>, and what
              they unlock is revealed closer to launch.
            </p>
          </div>
        )}

        {/* Scene, re-animates on each step via the `key`. */}
        <div key={step} className="animate-entry px-5 pb-5 pt-2">
          {scene.kind === "lore" && (
            <LoreScene title={scene.title} body={scene.body} docs={scene.docs} />
          )}
          {scene.kind === "building" && <BuildingScene id={scene.id} />}
          {scene.kind === "identity" && <IdentityScene onChose={beginTour} />}
          {scene.kind === "funnel" && (
            <FunnelScene
              onFollow={() => {
                complete.mutate("follow");
                next();
              }}
            />
          )}
          {scene.kind === "referral" && <ReferralScene />}

          {/* Footer controls. The identity scene drives its own forward action
              (connect / enter as guest), so it shows only Back. */}
          <div className="mt-6 flex items-center gap-3">
            {step > 0 && (
              <button
                onClick={back}
                className="text-text-3 text-sm hover:text-text-2 transition-colors px-2 py-3"
              >
                ← Back
              </button>
            )}
            <div className="flex-1" />
            {(scene.kind === "lore" || scene.kind === "building") && (
              <button
                onClick={next}
                className="rounded-md bg-brand text-bg px-6 py-3 text-sm font-medium hover:bg-brand-deep transition-colors"
              >
                Continue
              </button>
            )}
            {scene.kind === "identity" && identity.isSet && (
              <button
                onClick={beginTour}
                className="rounded-md bg-brand text-bg px-6 py-3 text-sm font-medium hover:bg-brand-deep transition-colors"
              >
                Begin the tour →
              </button>
            )}
            {scene.kind === "funnel" && (
              <button
                onClick={next}
                className="text-text-3 text-sm hover:text-text-2 transition-colors px-2 py-3"
              >
                Maybe later →
              </button>
            )}
            {scene.kind === "referral" && (
              <button
                onClick={enterRites}
                className="rounded-md bg-brand text-bg px-6 py-3 text-sm font-medium hover:bg-brand-deep transition-colors"
              >
                Enter the Ashen Cup →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Skip confirmation, loss-aversion guard. Primary action KEEPS them in;
        skipping is the quiet secondary choice. */}
    {confirmSkip && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-panel bg-surface border border-surface-3/60 shadow-panel p-6 text-center space-y-3 animate-entry">
          <h3 className="font-display text-2xl text-brand">Skip the introduction?</h3>
          <p className="text-text-2 text-sm leading-relaxed">
            You&rsquo;ll miss your <span className="text-brand">first quest</span>, which
            earns Points, with rewards revealed closer to launch.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={() => setConfirmSkip(false)}
              className="rounded-md bg-brand text-bg px-5 py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors"
            >
              Keep going
            </button>
            <button
              onClick={() => {
                setConfirmSkip(false);
                finish();
              }}
              className="text-text-3 text-xs hover:text-text-2 transition-colors py-1"
            >
              Skip anyway
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

/* ---------------------------------------------------------------- scenes */

/* The intro's docs link now opens the in-world Ember Codex instead of leaving
   the site (the docs belong to the village). */
function LoreDocsLink() {
  const codex = useCodex();
  return (
    <button
      onClick={() => codex.open()}
      className="inline-block text-brand text-sm hover:text-brand-soft transition-colors"
    >
      Open the Ember Codex →
    </button>
  );
}

function LoreScene({
  title,
  body,
  docs,
}: {
  title: string;
  body: string;
  docs?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h2 className="font-display text-3xl text-brand">{title}</h2>
      <p className="text-text-2 text-base leading-relaxed">{body}</p>
      {docs && <LoreDocsLink />}
    </div>
  );
}

function BuildingScene({ id }: { id: BuildingId }) {
  const b = BUILDING_BY_ID[id];
  const n = TOUR.indexOf(id) + 1;
  return (
    <div className="space-y-4">
      {/* Exterior close-up, the designer's building art (glyph fallback until
          a building's art is delivered, e.g. the Observatory). */}
      <div
        className="relative h-36 rounded-md flex items-end justify-center overflow-hidden border border-surface-3/60"
        style={{
          background:
            "radial-gradient(circle at 50% 75%, #221a12, var(--color-surface) 78%)",
        }}
      >
        {b.art ? (
          <Image
            src={asset(b.art)}
            alt={b.name}
            width={1000}
            height={855}
            className="max-h-[92%] w-auto object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
          />
        ) : (
          <span className="text-5xl pb-4">{glyph(id)}</span>
        )}
      </div>
      <div>
        <div className="text-text-3 text-[11px] uppercase tracking-widest mb-1">
          {n} of {TOUR.length} · {b.tagline}
        </div>
        <h2 className="font-display text-3xl text-brand leading-none">{b.name}</h2>
      </div>
      <p className="text-text-2 text-base leading-relaxed">{TOUR_LINE[id]}</p>
    </div>
  );
}

/* The fork: connect a wallet, or enter as a named guest. Connecting is never
   forced, many people are wary of it, so guest is an equal, first-class path. */
function IdentityScene({ onChose }: { onChose: () => void }) {
  const { mode, address, username, reset } = useIdentity();

  // Already chosen (revisited via Back): confirm + let the footer Continue.
  if (mode) {
    return (
      <div className="space-y-3">
        <h2 className="font-display text-3xl text-brand">You&rsquo;re in.</h2>
        <p className="text-text-2 text-base leading-relaxed">
          {mode === "wallet"
            ? `Connected as ${address ? shortAddress(address) : "your wallet"}. Your address is your entry.`
            : `Entering as ${username}. You’ll add your wallet at the very end.`}
        </p>
        <button
          onClick={reset}
          className="text-text-3 text-xs hover:text-text-2 transition-colors"
        >
          Change how I enter
        </button>
      </div>
    );
  }

  return (
    <EntryFork
      heading="How will you enter?"
      blurb="The fire doesn’t demand your wallet. Connect if you like, or stay a guest and keep your distance. Either way, the quests are open to you."
      onChose={onChose}
    />
  );
}

function FunnelScene({ onFollow }: { onFollow: () => void }) {
  const follow = QUEST_CATALOG.find((q) => q.id === "follow");
  const { mode, address, username } = useIdentity();
  return (
    <div className="space-y-4">
      <div>
        <div className="text-text-3 text-[11px] uppercase tracking-widest mb-1">
          The Ashen Cup
        </div>
        <h2 className="font-display text-3xl text-brand leading-none">The Quests</h2>
        <p className="text-text-3 text-xs mt-1">Short tasks, do them, earn Points.</p>
      </div>
      <p className="text-text-2 text-base leading-relaxed">
        You came early, and early users are rewarded. Each quest you complete
        earns <span className="text-brand">Points</span>; what they unlock is
        revealed closer to launch. New quests are added as launch gets closer,
        so this is only the beginning.
      </p>
      {mode === "wallet" && address && (
        <p className="text-text-3 text-xs">
          Connected as {shortAddress(address)}. Your wallet is already set, nothing to submit
          later.
        </p>
      )}
      {mode === "guest" && username && (
        <p className="text-text-3 text-xs">
          Entering as {username}. You&rsquo;ll add your wallet at the end to claim.
        </p>
      )}

      {/* The rites, previewed, this is the "introduce the quest platform" beat. */}
      <ul className="space-y-1.5">
        {QUEST_CATALOG.filter((q) => q.id !== "submit")
          .slice(0, 5)
          .map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="text-text-3">○</span>
                <span className="text-text-2 truncate">{q.title}</span>
              </span>
              <span className="tabular text-text-3 text-xs shrink-0">+{q.points}</span>
            </li>
          ))}
        <li className="text-text-3 text-xs pl-5">…and submit your wallet to lock it in.</li>
      </ul>

      {/* The FIRST rite, done for real, the "first win" before the share card. */}
      <a
        href={follow?.href ?? "https://x.com"}
        target="_blank"
        rel="noreferrer"
        onClick={onFollow}
        className="block text-center rounded-md bg-brand text-bg px-6 py-3 text-sm font-medium hover:bg-brand-deep transition-colors"
      >
        Begin the first quest: Follow @{X_HANDLE} on X
      </a>
    </div>
  );
}

/* The closing beat, introduce refer-a-friend (the repeatable earn) right before
   handing the visitor into the Tavern. Doubles as the viral share moment. */
function ReferralScene() {
  const referral = useReferral();
  const [copied, setCopied] = useState(false);
  const code = referral.data?.code;
  const link = code ? referralLink(code) : "";
  const embersEach = referral.data?.embersEach ?? 30;
  const tweet = tweetIntent(
    "I'm earning Points on PYRE before launch. Join me:",
    link || undefined
  );

  return (
    <div className="space-y-4">
      {/* A small flex moment. */}
      <div
        className="rounded-md p-6 text-center border border-brand/30"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(240,169,59,0.18), var(--color-surface-2) 70%)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        <div className="text-4xl mb-2" aria-hidden>
          🔥
        </div>
        <h2 className="font-display text-2xl text-brand">Spread the word.</h2>
        <p className="text-text-2 text-sm mt-2 max-w-xs mx-auto">
          You showed up early. Now bring others. Every friend who joins through
          your link earns you {embersEach} Points, again and again.
        </p>
      </div>

      {/* The referral link + the viral share, at peak satisfaction. */}
      {link && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="tabular flex-1 min-w-0 rounded-md bg-surface-2 border border-surface-3 px-3 py-2 text-xs text-text-2 outline-none"
          />
          <button
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
            className="shrink-0 rounded-md bg-surface-2 text-text border border-surface-3 px-4 py-2 text-sm hover:bg-surface-3 transition-colors"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <a
        href={tweet}
        target="_blank"
        rel="noreferrer"
        className="block text-center rounded-md bg-brand text-bg px-6 py-3 text-sm font-medium hover:bg-brand-deep transition-colors"
      >
        Share your link on X
      </a>
    </div>
  );
}
