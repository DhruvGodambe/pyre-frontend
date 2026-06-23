/* ============================================================================
   PYRE, Quest catalog  (the pre-launch funnel, single source of truth)
   ----------------------------------------------------------------------------
   These are the task DEFINITIONS (content). They live in code, version-
   controlled, easy to edit, no SQL needed. The DATABASE only stores per-visitor
   state: which tasks a session completed, and the wallet it submitted.

   getQuestTasks() merges this catalog with that per-session state to produce the
   QuestTask[] the UI renders. Edit copy / order / unlock times here.

   `unlockAt` is an absolute ms timestamp (null = available immediately). Times
   are derived from FUNNEL_OPENS_AT so the whole funnel shifts by editing one
   constant when the launch window is locked.
   ========================================================================== */

import type { QuestTask } from "../types";
import { X_PROFILE_URL, COMMUNITY_URL, MANIFESTO_TWEET_URL } from "../social";

/** When the pre-launch funnel opens. Adjust when the launch window is fixed. */
export const FUNNEL_OPENS_AT = Date.UTC(2026, 5, 14, 0, 0, 0); // 2026-06-14 UTC
const HOURS = 3_600_000;
const DAYS = 24 * HOURS;

/** A rite glows "Newly lit" for this long after it's kindled (addedAt). */
export const NEWLY_LIT_WINDOW = 7 * DAYS;

/** Embers earned per friend who joins through your referral link. Referrals are
    a separate, repeatable earn from the one-off rites (see The Tavern). */
export const REFERRAL_EMBERS = 30;

/** A catalog entry = a QuestTask without the per-visitor `done` flag, plus the
    internal bits the server needs (how completion is decided). */
export interface QuestDef {
  id: string;
  title: string;
  description: string;
  href: string | null;
  unlockAt: number | null;
  /** Counts toward the "completed the funnel" boost when true. */
  required: boolean;
  /** How `done` is decided:
      - "click"  : marked complete when the visitor acts (POST /complete)
      - "wallet" : marked complete when a wallet is submitted (POST /wallet)   */
  completion: "click" | "wallet";
  /** "Embers" earned on completion, vary by effort/value of the rite. */
  points: number;
  /** When this rite was kindled. Drives the "Newly lit" marker; set to the
      current time when you add a brand-new rite so returning visitors see it. */
  addedAt: number;
}

export const QUEST_CATALOG: QuestDef[] = [
  {
    id: "intro",
    title: "Let the Emberkeeper guide you through Pyre",
    description: "Take the Emberkeeper's guided tour of the village.",
    href: null,
    unlockAt: null,
    required: true,
    // Credited in code when the visitor FINISHES the guided tour (the Tavern's
    // "Start" relaunches the tour; reaching the end grants this). The instant
    // reward on finishing is what kicks off the quest momentum.
    completion: "click",
    points: 20,
    addedAt: FUNNEL_OPENS_AT - 14 * DAYS,
  },
  {
    id: "quiz",
    title: "Pass the Emberkeeper's quiz",
    description: "Answer a few quick questions to prove you understood the tour.",
    href: null,
    unlockAt: null,
    required: true,
    // Credited when the visitor answers the in-app quiz correctly (not a link).
    completion: "click",
    points: 25,
    addedAt: FUNNEL_OPENS_AT - 10 * DAYS,
  },
  {
    id: "follow",
    title: "Follow @pyre_protocol on X",
    description: "Follow the official account.",
    href: X_PROFILE_URL,
    unlockAt: null,
    required: true,
    completion: "click",
    points: 10,
    addedAt: FUNNEL_OPENS_AT - 14 * DAYS,
  },
  {
    id: "share",
    title: "Share the manifesto",
    description: "Like and repost the pinned manifesto.",
    // Rendered as two actions (Like + Repost) in the Tavern; this is the fallback
    // link to the post itself.
    href: MANIFESTO_TWEET_URL,
    unlockAt: null,
    required: true,
    completion: "click",
    points: 20,
    addedAt: FUNNEL_OPENS_AT - 14 * DAYS,
  },
  {
    id: "join",
    title: "Join the community",
    description: "Join the official Telegram.",
    href: COMMUNITY_URL,
    unlockAt: null,
    required: true,
    completion: "click",
    points: 15,
    // Recently kindled, shows the "Newly lit" marker (example of an ad-hoc drop).
    addedAt: FUNNEL_OPENS_AT - 2 * DAYS,
  },
  {
    id: "submit",
    title: "Submit your wallet",
    description: "Add the address that will receive your rewards.",
    href: null,
    unlockAt: null,
    required: true,
    completion: "wallet",
    points: 50,
    addedAt: FUNNEL_OPENS_AT - 14 * DAYS,
  },
];

/** Merge the catalog with a session's completed-task ids + whether a wallet was
    submitted, into the QuestTask[] the UI consumes. */
export function buildQuestTasks(
  completed: ReadonlySet<string>,
  hasSubmittedWallet: boolean
): QuestTask[] {
  return QUEST_CATALOG.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    href: d.href,
    unlockAt: d.unlockAt,
    points: d.points,
    addedAt: d.addedAt,
    done: d.completion === "wallet" ? hasSubmittedWallet : completed.has(d.id),
  }));
}

/** Valid task ids that can be completed via the /complete endpoint. */
export const CLICK_TASK_IDS = new Set(
  QUEST_CATALOG.filter((d) => d.completion === "click").map((d) => d.id)
);
