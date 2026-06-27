"use client";

/* THE ASHEN CUP, the quest hub. Three boxes, three plain jobs:
   - Quests      : the pre-launch task list (complete tasks → earn Embers).
   - Invite      : referrals (earn Embers for every friend who joins).
   - Leaderboard : the top Ember earners.

   Copy rule for this file (and the app): name things by what they DO. Embers is
   the points name (kept, it's the brand), but labels, buttons and statuses are
   plain: Quests, Invite friends, Leaderboard, Submit wallet, New, Done.

   Two extras wired here:
   - Deep-link: the intro sends the visitor straight to the Quests box
     (useNavigation → scroll into view). The tab id stays "rites" so existing
     navigate({building:"tavern", tab:"rites"}) calls still work.
   - Identity-aware submission: wallet users are recorded automatically; guests
     submit their wallet manually (lib/identity). */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  useQuestTasks,
  useCompleteQuestTask,
  useSubmitWallet,
  useQuestLeaderboard,
  useReferral,
} from "@/lib/hooks";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { useTour } from "@/lib/tour";
import { Panel, Badge, Button, Field, ProgressBar } from "@/components/ui/primitives";
import { GameIcon, rankTile, type GameIconName } from "@/components/ui/game-icon";
import { ImageButton, ImageArt, type ImageButtonName } from "@/components/ui/image-button";
import { EmberCount } from "@/components/world-hud";
import { Skeleton, EmptyState, StateView } from "@/components/ui/state";
import { NEWLY_LIT_WINDOW } from "@/lib/quests/catalog";
import { tweetIntent, referralLink, likeIntent, repostIntent, MANIFESTO_TWEET_ID } from "@/lib/social";
import { shortAddress, formatCountdown } from "@/lib/format";
import type { QuestTask } from "@/lib/types";

export function TavernPanel() {
  const { pending, clearPending } = useNavigation();
  const ref = useRef<HTMLDivElement>(null);
  const summonRef = useRef<HTMLDivElement>(null);
  const standingRef = useRef<HTMLDivElement>(null);

  // Honour a deep-link into this building (e.g. intro → Quests): scroll the
  // matching box into view. Three boxes now, no tabs, so navigation is a scroll,
  // not a tab switch. Old deep-links still pass tab:"rites" (→ the top).
  useEffect(() => {
    if (pending?.building === "tavern") {
      const target =
        pending.tab === "summon" ? summonRef : pending.tab === "leaderboard" ? standingRef : ref;
      target.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      clearPending();
    }
  }, [pending, clearPending]);

  return (
    <div ref={ref} className="space-y-5">
      <p className="text-text-2 text-sm">
        Earn <span className="text-brand">Points</span> before launch: complete
        quests, invite friends, and climb the leaderboard. What Points unlock is
        revealed closer to launch.
      </p>

      {/* Three separate boxes. On desktop the tall Quests box takes the left two
          thirds; Invite + Leaderboard stack down the right. On mobile they fall
          into one column. No tabs, everything is visible at once. */}
      <div className="grid gap-5 items-start lg:grid-cols-3">
        <Panel title="Quests" tagline="Complete tasks to earn Points" className="lg:col-span-2">
          <QuestFunnel />
        </Panel>
        <div className="space-y-5">
          <div ref={summonRef}>
            <Panel title="Invite friends" tagline="Earn Points for every friend">
              <SummonSection />
            </Panel>
          </div>
          <div ref={standingRef}>
            <Panel title="Leaderboard" tagline="Top point earners">
              <QuestLeaderboard />
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================== QUESTS == */

function QuestFunnel() {
  const tasks = useQuestTasks();
  const referral = useReferral();
  const lb = useQuestLeaderboard();
  const complete = useCompleteQuestTask();
  const submit = useSubmitWallet();
  const tour = useTour();
  const { mode, address, username, connectWallet } = useIdentity();
  const [wallet, setWallet] = useState("");
  const [quizOpen, setQuizOpen] = useState(false);

  const submitted = tasks.data?.find((t) => t.id === "submit")?.done ?? false;

  // The wallet can only be submitted once EVERY other quest is done (the full
  // Ember haul). This is the gate on the reward, no shortcut to the end.
  const otherQuests = (tasks.data ?? []).filter((t) => t.id !== "submit");
  const allQuestsDone = otherQuests.length > 0 && otherQuests.every((t) => t.done);

  // Wallet users never fill in a form, their connected address IS the entry, so
  // record it automatically (once), but ONLY after they've done every quest.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (mode !== "wallet") autoSubmitted.current = false;
  }, [mode]);
  useEffect(() => {
    if (mode === "wallet" && address && tasks.data && !submitted && !submit.isPending && !autoSubmitted.current && allQuestsDone) {
      autoSubmitted.current = true;
      submit.mutate(address);
    }
  }, [mode, address, tasks.data, submitted, submit.isPending, submit, allQuestsDone]);

  // Referral Embers feed the same total (resilient: 0 if invites are unavailable
  // / the query errored, so a backend gap never breaks the Quests box).
  const referralEmbers = referral.data ? referral.data.count * referral.data.embersEach : 0;

  return (
    <div className="space-y-4">
      <StateView query={tasks}>
        {(rows) => {
          const quests = rows.filter((t) => t.id !== "submit");
          const questEmbers = rows.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
          const totalEmbers = questEmbers + referralEmbers;
          const done = quests.filter((t) => t.done).length;
          const total = quests.length;
          // Loss aversion: what's still sitting on the table (incl. the wallet).
          const unclaimed = rows.filter((t) => !t.done).reduce((s, t) => s + t.points, 0);

          // The one quest that gets the spotlight: first actionable, not-done,
          // not-locked. Everything else is dimmed so there's a single focus.
          const nextId = quests.find(
            (t) => !t.done && !(t.unlockAt !== null && t.unlockAt > Date.now())
          )?.id;

          return (
            <>
              {/* Rank + uncollected: the two nudges, stacked. */}
              <StandingStrip lb={lb} unclaimed={unclaimed} allDone={allQuestsDone && submitted} />

              {/* Ember total, ticks up on completion. */}
              <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2.5 border border-surface-3/60">
                <span className="text-text-3 text-xs uppercase tracking-wider">Points earned</span>
                <span className="inline-flex items-center gap-1.5 tabular text-brand text-lg">
                  <GameIcon name="fireToken" size={18} /> <EmberCount value={totalEmbers} />
                </span>
              </div>

              {/* Progress, kept visible (the unfinished pulls you back). */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-3 uppercase tracking-wider">Your quests</span>
                  <span className="tabular text-text-2">
                    {done} of {total} done
                  </span>
                </div>
                <ProgressBar value={total ? done / total : 0} />
              </div>

              {/* The quest list: connected steps, one spotlit. */}
              <ol id="tavern-rites" className="scroll-mt-24">
                {quests.map((t, i) => (
                  <QuestStep
                    key={t.id}
                    task={t}
                    index={i}
                    total={total}
                    last={i === quests.length - 1}
                    spotlight={t.id === nextId}
                    onComplete={() => complete.mutate(t.id)}
                    onStartTour={() => tour.start()}
                    onOpenQuiz={() => setQuizOpen(true)}
                  />
                ))}
              </ol>

              {/* The last step: submit the wallet, only after every quest is done. */}
              <div className="pt-3 border-t border-surface-3/60 space-y-2">
                <SubmissionArea
                  mode={mode}
                  address={address}
                  username={username}
                  submitted={submitted}
                  gateOpen={allQuestsDone}
                  questsRemaining={quests.filter((t) => !t.done).length}
                  requiredEmbers={quests.reduce((s, t) => s + t.points, 0)}
                  earnedEmbers={quests.filter((t) => t.done).reduce((s, t) => s + t.points, 0)}
                  wallet={wallet}
                  setWallet={setWallet}
                  submitting={submit.isPending}
                  submitError={submit.isError ? submit.error?.message : null}
                  onSubmit={() => submit.mutate(wallet.trim())}
                  onConnect={connectWallet}
                />
              </div>
            </>
          );
        }}
      </StateView>

      {quizOpen && (
        <QuizModal
          onClose={() => setQuizOpen(false)}
          onPass={() => complete.mutate("quiz")}
        />
      )}
    </div>
  );
}

/* A single step in the quest list. Done steps collapse to a checked row; the
   spotlit (next) step opens up with a clear call to action; the rest sit dimmed
   below. A left rail draws the connecting line. */
function QuestStep({
  task,
  index,
  total,
  last,
  spotlight,
  onComplete,
  onStartTour,
  onOpenQuiz,
}: {
  task: QuestTask;
  index: number;
  total: number;
  last: boolean;
  spotlight: boolean;
  onComplete: () => void;
  onStartTour: () => void;
  onOpenQuiz: () => void;
}) {
  const locked = task.unlockAt !== null && task.unlockAt > Date.now();
  const isNew = !task.done && !locked && Date.now() - task.addedAt < NEWLY_LIT_WINDOW;

  const node = task.done
    ? "border-success bg-success/20 text-success"
    : locked
    ? "border-surface-3 bg-surface-2 text-text-3"
    : spotlight
    ? "border-brand bg-brand/20 text-brand"
    : "border-surface-3 bg-surface-2 text-text-3";

  return (
    <li className="flex gap-3">
      {/* Left rail: step number + connecting line to the next step. */}
      <div className="flex flex-col items-center">
        <span
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${node} ${
            spotlight ? "shadow-[0_0_0_4px_rgba(255,122,26,0.12)]" : ""
          }`}
        >
          {task.done ? "✓" : locked ? <GameIcon name="lock" size={13} /> : index + 1}
        </span>
        {!last && (
          <span className={`w-px flex-1 my-1 ${task.done ? "bg-success/40" : "bg-surface-3"}`} />
        )}
      </div>

      {/* Body. Spotlight gets the framed, opened-up treatment. */}
      <div
        className={`mb-2 flex-1 min-w-0 rounded-md px-3 py-2.5 transition-colors ${
          spotlight
            ? "border border-brand/40 bg-brand/[0.06]"
            : task.done
            ? "opacity-70"
            : "bg-surface-2"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-text-3 text-[10px] uppercase tracking-widest">
            Quest {index + 1} of {total}
          </span>
          {isNew && <Badge tone="brand">New</Badge>}
          {spotlight && !task.done && (
            <span className="text-[10px] uppercase tracking-widest text-brand">Do this next</span>
          )}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={`text-sm ${task.done ? "text-text-3 line-through" : "text-text"}`}>
            {task.title}
          </span>
          <span className={`tabular shrink-0 text-xs ${task.done ? "text-success" : "text-text-3"}`}>
            {task.done ? "✓ " : "+"}
            {task.points}
          </span>
        </div>

        <p className="mt-0.5 text-text-3 text-xs">
          {locked && task.unlockAt
            ? `Unlocks in ${formatCountdown(task.unlockAt - Date.now())}`
            : task.description}
        </p>

        {/* Call to action only on the open quests, emphasised on the spotlight.
            Two quests act in-app instead of opening a link: the tour relaunches
            the guided walk (finishing it credits this), the quiz opens the
            comprehension quiz. The rest open their link and self-attest. */}
        {!task.done && !locked && (
          <div className="mt-2">
            {task.id === "intro" ? (
              <CtaImageButton art="taketour" label="Take the tour" width={172} spotlight={spotlight} onClick={onStartTour} />
            ) : task.id === "quiz" ? (
              <CtaImageButton art="takequiz" label="Take the quiz" width={172} spotlight={spotlight} onClick={onOpenQuiz} />
            ) : task.id === "share" ? (
              <ShareActions onBothDone={onComplete} />
            ) : task.href ? (
              <CtaImageLink art="go" label="Go" width={92} spotlight={spotlight} href={task.href} onClick={onComplete} />
            ) : (
              <button onClick={onComplete}>
                <CtaPill spotlight={spotlight}>Start</CtaPill>
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/* The "Like + repost the manifesto" rite needs TWO X actions (no single intent
   does both), so it renders two buttons and only completes once both are done.
   Self-attested like every click rite. */
function ShareActions({ onBothDone }: { onBothDone: () => void }) {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // Fire the completion exactly once, and only after a short verification beat.
  const fired = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Both X actions open in a new tab and are self-attested. Once BOTH have been
  // clicked, run a ~5s "verifying" pass before crediting the rite, so it reads as
  // a real check, nobody clicks straight through without actually liking +
  // reposting. Started from the click (not an effect) so the timer is set once and
  // never reset by re-renders. Completion is optimistic, so the rite ticks done
  // the instant the timer fires.
  const beginVerify = (nextLiked: boolean, nextReposted: boolean) => {
    if (nextLiked && nextReposted && !fired.current) {
      fired.current = true;
      setVerifying(true);
      timer.current = setTimeout(onBothDone, 5000);
    }
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <ShareLink
          art="like"
          label="Like the manifesto"
          width={112}
          done={liked}
          doneLabel="♥ Liked"
          href={likeIntent(MANIFESTO_TWEET_ID)}
          onClick={() => {
            setLiked(true);
            beginVerify(true, reposted);
          }}
        />
        <ShareLink
          art="repost"
          label="Repost the manifesto"
          width={132}
          done={reposted}
          doneLabel="↻ Reposted"
          href={repostIntent(MANIFESTO_TWEET_ID)}
          onClick={() => {
            setReposted(true);
            beginVerify(liked, true);
          }}
        />
      </div>
      {verifying && (
        <div className="flex items-center gap-2 text-xs text-text-3">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-3/30 border-t-brand" />
          Verifying your like and repost…
        </div>
      )}
    </div>
  );
}

/* One X action (like / repost) in the designer's button art. Self-attested: the
   click opens X in a new tab and optimistically flips to a success chip (the art
   has fixed text, so "done" is a separate confirmation chip, not a label swap). */
function ShareLink({
  art,
  label,
  width,
  done,
  doneLabel,
  href,
  onClick,
}: {
  art: ImageButtonName;
  label: string;
  width: number;
  done: boolean;
  doneLabel: string;
  href: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  if (done)
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/15 px-3 py-1.5 text-sm font-medium text-success">
        {doneLabel}
      </span>
    );
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="inline-block transition-transform duration-fast hover:scale-[1.03] active:scale-[0.97]"
    >
      <ImageArt name={art} width={width} hover={hover} />
    </a>
  );
}

function CtaPill({ children, spotlight }: { children: React.ReactNode; spotlight: boolean }) {
  return spotlight ? (
    <span className="inline-flex items-center rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-bg transition-colors hover:bg-brand-deep">
      {children}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-sm border border-brand/40 bg-brand/15 px-2 py-0.5 text-xs text-brand transition-colors hover:bg-brand/25">
      {children}
    </span>
  );
}

/* A quest's call to action. The spotlit "do this next" step wears the designer's
   ornate button art; the dimmed waiting steps keep the compact text pill, so the
   eye still lands on a single focus. Button form (tour, quiz) vs link form (Go,
   opens the task's URL and self-attests). */
function CtaImageButton({
  art,
  label,
  width,
  spotlight,
  onClick,
}: {
  art: ImageButtonName;
  label: string;
  width: number;
  spotlight: boolean;
  onClick: () => void;
}) {
  if (!spotlight)
    return (
      <button onClick={onClick}>
        <CtaPill spotlight={false}>{label} →</CtaPill>
      </button>
    );
  return <ImageButton name={art} label={label} width={width} onClick={onClick} />;
}

function CtaImageLink({
  art,
  label,
  width,
  spotlight,
  href,
  onClick,
}: {
  art: ImageButtonName;
  label: string;
  width: number;
  spotlight: boolean;
  href: string;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  if (!spotlight)
    return (
      <a href={href} target="_blank" rel="noreferrer" onClick={onClick}>
        <CtaPill spotlight={false}>{label} →</CtaPill>
      </a>
    );
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="inline-block transition-transform duration-fast hover:scale-[1.03] active:scale-[0.97]"
    >
      <ImageArt name={art} width={width} hover={hover} />
    </a>
  );
}

/* ============================================================== QUIZ ==== */
/* The Emberkeeper's comprehension quiz, the second quest. Comes right after the
   tour so a visitor who just learned the loop proves it and racks up a SECOND
   completion fast, building quest momentum. All three right = the rite is
   granted; wrong picks turn red to retry (correct answers aren't revealed). */
const QUIZ: { q: string; options: string[]; answer: number }[] = [
  {
    q: "What happens to the $PYRE you stake?",
    options: [
      "It earns ETH yield and is shielded from decay",
      "It is burned permanently",
      "Nothing, it just sits in your wallet",
    ],
    answer: 0,
  },
  {
    q: "What does burning $PYRE do?",
    options: [
      "Gives you more $PYRE back",
      "Forges and levels your Acolyte, raising your yield multiplier",
      "Instantly unstakes your tokens",
    ],
    answer: 1,
  },
  {
    q: "What happens to $PYRE you do NOT stake?",
    options: [
      "It earns the most yield",
      "It is safe forever",
      "It slowly decays",
    ],
    answer: 2,
  },
];

function QuizModal({ onClose, onPass }: { onClose: () => void; onPass: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null));
  const [checked, setChecked] = useState(false);
  // Once all three are right we credit the rite straight away (completion is
  // optimistic, so the quest ticks done instantly behind the modal) but hold the
  // window open for a short "Correct!" beat, so it never closes onto a dead gap.
  const [passed, setPassed] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const allCorrect = answers.every((a, i) => a === QUIZ[i].answer);

  const submitAnswers = () => {
    setChecked(true);
    if (!allCorrect) return;
    setPassed(true);
    onPass(); // grants the rite (optimistic → marks done at once)
    setTimeout(onClose, 1100); // let the success land, then close
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-panel bg-surface border border-surface-3/60 shadow-panel p-6 animate-entry"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl text-brand">The Emberkeeper&rsquo;s quiz</h2>
          <button onClick={onClose} className="text-text-3 hover:text-text-2 text-sm">
            Close
          </button>
        </div>
        <p className="mb-4 text-text-2 text-sm">
          Three quick questions to prove you understood the tour. Get all three right to earn the rite.
        </p>

        <div className="space-y-5">
          {QUIZ.map((item, qi) => (
            <div key={qi}>
              <p className="mb-2 text-sm font-medium text-text">
                {qi + 1}. {item.q}
              </p>
              <div className="space-y-1.5">
                {item.options.map((opt, oi) => {
                  const selected = answers[qi] === oi;
                  const wrong = checked && selected && oi !== item.answer;
                  const right = checked && selected && oi === item.answer;
                  return (
                    <button
                      key={oi}
                      disabled={passed}
                      onClick={() => {
                        setChecked(false);
                        setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)));
                      }}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default ${
                        right
                          ? "border-success bg-success/15 text-success"
                          : wrong
                          ? "border-danger bg-danger/15 text-danger"
                          : selected
                          ? "border-brand bg-brand/15 text-brand"
                          : "border-surface-3 bg-surface-2 text-text-2 hover:border-brand/40"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {checked && !allCorrect && !passed && (
          <p className="mt-4 text-xs text-danger">
            Not quite. The picks in red are wrong, change them and try again.
          </p>
        )}

        {passed ? (
          <div className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-success/40 bg-success/15 px-4 py-2.5 text-sm font-medium text-success">
            ✓ All correct, granting your rite.
          </div>
        ) : (
          <button
            onClick={submitAnswers}
            disabled={!allAnswered}
            className="mt-5 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-40"
          >
            {allAnswered ? "Submit answers" : "Answer all three to submit"}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
}

/* Rank + uncollected: the live nudge strip at the top of Quests.
   Resilient, the rank line simply doesn't render if the leaderboard is down. */
function StandingStrip({
  lb,
  unclaimed,
  allDone,
}: {
  lb: ReturnType<typeof useQuestLeaderboard>;
  unclaimed: number;
  allDone: boolean;
}) {
  const you = lb.data?.you ?? null;
  // Gap to the rank directly above you, when that row is in the visible top.
  const above = you ? lb.data?.top.find((r) => r.rank === you.rank - 1) ?? null : null;
  const gap = above && you ? Math.max(0, above.embers - you.embers) : null;

  return (
    <div className="rounded-md border border-brand/30 bg-brand/[0.06] px-3 py-2.5 text-xs leading-relaxed text-text-2">
      {allDone ? (
        <span className="text-text-2">
          All quests done. Your Points are locked in, your reward arrives at launch.
        </span>
      ) : unclaimed > 0 ? (
        <span>
          <span className="text-brand">⚠ {unclaimed} Points</span> still unclaimed.
          Rewards are revealed at launch.
        </span>
      ) : (
        <span>Rewards are revealed at launch.</span>
      )}
      {you && (
        <span className="mt-1 block text-text-3">
          You&rsquo;re <span className="text-text-2 tabular">#{you.rank}</span>
          {gap !== null && gap > 0 && above ? (
            <>
              {" · "}
              <span className="text-brand tabular">{gap} Points</span> behind #{above.rank}.
            </>
          ) : (
            "."
          )}
        </span>
      )}
    </div>
  );
}

/* The last step adapts to how the visitor entered:
   - wallet : auto-recorded, just a confirmation (no form).
   - guest  : a name is set; submit the wallet manually.
   - none   : offer to connect, or submit manually as a guest would. */
function SubmissionArea({
  mode,
  address,
  username,
  submitted,
  gateOpen,
  questsRemaining,
  requiredEmbers,
  earnedEmbers,
  wallet,
  setWallet,
  submitting,
  submitError,
  onSubmit,
  onConnect,
}: {
  mode: "wallet" | "guest" | null;
  address: string | null;
  username: string | null;
  submitted: boolean;
  gateOpen: boolean;
  questsRemaining: number;
  requiredEmbers: number;
  earnedEmbers: number;
  wallet: string;
  setWallet: (v: string) => void;
  submitting: boolean;
  submitError: string | null;
  onSubmit: () => void;
  onConnect: () => void;
}) {
  if (mode === "wallet") {
    return (
      <div className="text-sm">
        {submitted ? (
          <span className="text-success">
            ✓ Wallet {address ? shortAddress(address as `0x${string}`) : ""} saved for your
            reward.
          </span>
        ) : gateOpen ? (
          <span className="text-text-2">Saving your connected wallet…</span>
        ) : (
          <GateNote remaining={questsRemaining} earned={earnedEmbers} required={requiredEmbers} />
        )}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-md border border-success/30 bg-success/[0.06] px-3 py-2.5 text-success text-sm">
        ✓ Wallet submitted. Your reward will arrive here at launch.
      </div>
    );
  }

  return (
    <>
      {!gateOpen && (
        <GateNote remaining={questsRemaining} earned={earnedEmbers} required={requiredEmbers} />
      )}
      {gateOpen && mode === "guest" && username && (
        <div className="text-text-3 text-xs">
          Entering as <span className="text-text-2">{username}</span>. Add the wallet that receives
          your reward.
        </div>
      )}
      <Field label="Your wallet address" value={wallet} onChange={setWallet} placeholder="0x…" />
      {gateOpen ? (
        <Button
          onClick={onSubmit}
          disabled={wallet.trim().length < 10 || submitting}
          className="w-full"
        >
          {submitting ? "Submitting…" : "Submit wallet"}
        </Button>
      ) : (
        // Locked until every quest is done: the designer's engraved
        // "COMPLETE ALL QUESTS FIRST" plate, shown as a non-interactive bar.
        <div className="flex justify-center" aria-label="Complete all quests first" role="note">
          <ImageArt name="completequest" width="100%" className="max-w-[420px] opacity-90" />
        </div>
      )}
      {submitError && <p className="text-danger text-xs">{submitError}</p>}
      {mode === null && gateOpen && (
        <button
          onClick={onConnect}
          className="w-full text-text-3 text-xs hover:text-brand transition-colors pt-1"
        >
          Prefer to connect your wallet instead? →
        </button>
      )}
    </>
  );
}

/* The lock on the last step: the wallet only goes in once every quest is done.
   Tells the visitor exactly how much is left. */
function GateNote({
  remaining,
  earned,
  required,
}: {
  remaining: number;
  earned: number;
  required: number;
}) {
  return (
    <div className="rounded-md border border-brand/30 bg-brand/[0.06] px-3 py-2.5 text-xs leading-relaxed text-text-2">
      <GameIcon name="lock" size={13} className="mr-1" /> Complete every quest first. Finish{" "}
      <span className="text-brand">
        {remaining} more {remaining === 1 ? "quest" : "quests"}
      </span>{" "}
      to submit your wallet. {earned} / {required} Points earned.
    </div>
  );
}

/* ============================================================== INVITE == */

/** Invite milestones: an escalating ladder so the count feels like progress,
    not a flat tally. Embers are concrete; what each milestone unlocks is
    revealed at launch (rewards-revealed-near-launch), which is itself the hook. */
const INVITE_MILESTONES: { at: number; title: string; crest: GameIconName }[] = [
  { at: 1, title: "First", crest: "first" },
  { at: 3, title: "Bronze", crest: "bronze" },
  { at: 5, title: "Silver", crest: "silver" },
  { at: 10, title: "Gold", crest: "gold" },
  { at: 25, title: "Legend", crest: "legend" },
];

function SummonSection() {
  const referral = useReferral();
  const [copied, setCopied] = useState(false);
  const [shareHover, setShareHover] = useState(false);

  // Resilient: invites depend on the quest_referrals table. If that query is
  // down, show a plain notice + retry here, never a broken skeleton.
  if (referral.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (referral.isError || !referral.data) {
    return (
      <EmptyState
        icon="✦"
        title="Invites aren't available right now"
        message="We couldn't load your invite link. Try again in a moment."
        action={
          <Button variant="ghost" onClick={() => referral.refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const r = referral.data;
  const link = referralLink(r.code);
  const earned = r.count * r.embersEach;
  const tweet = tweetIntent(
    "I'm earning Points on PYRE before launch. Join me:",
    link
  );

  // Current milestone + the next one to chase ("1 more to X").
  const reached = INVITE_MILESTONES.filter((m) => r.count >= m.at);
  const currentTitle = reached.length ? reached[reached.length - 1].title : null;
  const next = INVITE_MILESTONES.find((m) => r.count < m.at) ?? null;
  const ceiling = INVITE_MILESTONES[INVITE_MILESTONES.length - 1].at;
  const trackPct = Math.min(1, r.count / ceiling);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-xl text-text">Invite friends</h3>
        <p className="mt-1 text-text-2 text-sm">
          Every friend who joins with your link earns you{" "}
          <span className="text-brand">{r.embersEach} Points</span>, again and again.
          There&rsquo;s no limit, the more you invite, the higher you climb.
        </p>
      </div>

      {/* Friends invited + Embers earned: the running tally. */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md bg-surface-2 px-3 py-2.5 border border-surface-3/60">
          <div className="text-text-3 text-[11px] uppercase tracking-wider">Friends invited</div>
          <div className="tabular text-text text-2xl">{r.count}</div>
        </div>
        <div className="rounded-md bg-surface-2 px-3 py-2.5 border border-surface-3/60">
          <div className="text-text-3 text-[11px] uppercase tracking-wider">Points from invites</div>
          <div className="inline-flex items-center gap-1.5 tabular text-brand text-2xl"><GameIcon name="fireToken" size={22} /> {earned}</div>
        </div>
      </div>

      {/* The milestone ladder: nodes light as you pass them; the next is the chase. */}
      <div className="rounded-md bg-surface-2 p-4 border border-surface-3/60 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-text-3 text-[11px] uppercase tracking-wider">Your tier</span>
          <span className="text-sm text-brand">{currentTitle ?? "None yet"}</span>
        </div>
        <ProgressBar value={trackPct} />
        <div className="flex justify-between">
          {INVITE_MILESTONES.map((m) => {
            const hit = r.count >= m.at;
            const isNext = next?.at === m.at;
            return (
              <div key={m.at} className="flex flex-col items-center gap-1 text-center">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-full ${
                    isNext && !hit ? "ring-2 ring-brand/50" : ""
                  }`}
                >
                  <GameIcon
                    name={m.crest}
                    size={34}
                    alt={m.title}
                    className={hit ? "" : "opacity-30 grayscale"}
                  />
                </span>
                <span className={`text-[10px] ${hit ? "text-text-2" : "text-text-3"}`}>{m.title}</span>
              </div>
            );
          })}
        </div>
        {next && (
          <p className="text-center text-xs text-text-3">
            <span className="text-brand">{next.at - r.count} more</span> to reach{" "}
            <span className="text-text-2">{next.title}</span>. What each tier unlocks is
            revealed at launch.
          </p>
        )}
      </div>

      {/* The invite link + share. */}
      <div className="space-y-2">
        <span className="text-text-3 text-[11px] uppercase tracking-wider">Your invite link</span>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="tabular flex-1 min-w-0 rounded-md bg-surface border border-surface-3 px-3 py-2 text-xs text-text-2 outline-none"
          />
          <Button
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
            variant="ghost"
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <a
          href={tweet}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on X"
          onMouseEnter={() => setShareHover(true)}
          onMouseLeave={() => setShareHover(false)}
          onFocus={() => setShareHover(true)}
          onBlur={() => setShareHover(false)}
          className="block transition-transform duration-fast hover:scale-[1.02] active:scale-[0.98]"
        >
          <ImageArt name="sharex" width="100%" hover={shareHover} className="mx-auto block max-w-[340px]" />
        </a>
      </div>
    </div>
  );
}

/* =========================================================== LEADERBOARD == */

/* Ranks 1-5 get the designer's numbered lava tiles (the viewer's own row lights
   up with the "active" variant); everyone past 5th gets a plain number. */
function RankMark({ rank, you = false }: { rank: number; you?: boolean }) {
  const tile = rankTile(rank, you);
  if (tile) return <GameIcon name={tile} size={30} alt={`Rank ${rank}`} className="shrink-0" />;
  return (
    <span className={`tabular w-7 text-center shrink-0 ${you ? "text-brand font-medium" : "text-text-3"}`}>
      #{rank}
    </span>
  );
}

function QuestLeaderboard() {
  const lb = useQuestLeaderboard();
  return (
    <StateView query={lb}>
      {(data) =>
        data.top.length === 0 ? (
          <div className="text-center text-text-3 text-sm py-6">
            No Points earned yet. Be the first on the board.
          </div>
        ) : (
          <div className="space-y-3">
            <ol className="space-y-1">
              {data.top.map((r) => (
                <li
                  key={r.rank}
                  className={`flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm ${
                    r.you ? "bg-brand/10 border border-brand/40" : "bg-surface-2"
                  }`}
                >
                  <span className="flex items-center gap-2 text-text-2 tabular truncate">
                    <RankMark rank={r.rank} you={r.you} />
                    <span className="truncate">{r.name}</span>
                    {r.you && <span className="text-brand"> (you)</span>}
                  </span>
                  <span className="flex items-center gap-1 tabular text-brand shrink-0">
                    <GameIcon name="fireToken" size={16} /> {r.embers}
                  </span>
                </li>
              ))}
            </ol>
            {data.you && !data.top.some((t) => t.you) && (
              <div className="space-y-1">
                {/* Show the "jump" dots only when ranks are actually skipped
                    (rank 7+). If you're exactly #6, your row sits right under the
                    top 5 with no misleading gap. */}
                {data.you.rank > data.top.length + 1 && (
                  <div
                    className="flex justify-center text-text-3 leading-none tracking-[0.3em] select-none"
                    aria-hidden
                  >
                    ···
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm bg-brand/10 border border-brand/40">
                  <span className="flex items-center gap-2 text-text-2 tabular">
                    <RankMark rank={data.you.rank} you />
                    <span>You</span>
                  </span>
                  <span className="flex items-center gap-1 tabular text-brand shrink-0">
                    <GameIcon name="fireToken" size={16} /> {data.you.embers}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      }
    </StateView>
  );
}
