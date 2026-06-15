"use client";

/* THE TAVERN — the quest hub. Complete rites + refer friends to earn Embers and
   climb the leaderboard. No news here (that lives on X / Telegram); this is
   purely the pre-launch quest funnel, the referral earn, and the standings.

   Two extras wired here:
   - Deep-link: the Emberkeeper intro sends the visitor straight to the Rites tab
     (useNavigation → scroll into view + switch tab).
   - Identity-aware submission: wallet users are recorded automatically; guests
     submit their wallet manually (lib/identity). */

import { useEffect, useRef, useState } from "react";
import {
  useQuestTasks,
  useCompleteQuestTask,
  useSubmitWallet,
  useQuestLeaderboard,
  useReferral,
} from "@/lib/hooks";
import { useIdentity } from "@/lib/identity";
import { useNavigation } from "@/lib/navigation";
import { Panel, Badge, Button, Field } from "@/components/ui/primitives";
import { StateView } from "@/components/ui/state";
import { Tabs } from "@/components/ui/tabs";
import { NEWLY_LIT_WINDOW } from "@/lib/quests/catalog";
import { tweetIntent, referralLink } from "@/lib/social";
import { shortAddress, formatCountdown } from "@/lib/format";

export function TavernPanel() {
  const { pending, clearPending } = useNavigation();
  const [tab, setTab] = useState("rites");
  const ref = useRef<HTMLDivElement>(null);

  // Honour a deep-link into this building (e.g. intro → Rites): open the right
  // tab and bring the panel into view (matters on the mobile stacked page).
  useEffect(() => {
    if (pending?.building === "tavern") {
      if (pending.tab) setTab(pending.tab);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      clearPending();
    }
  }, [pending, clearPending]);

  return (
    <div ref={ref}>
      <Panel title="The Tavern" tagline="Quests & leaderboard">
        <p className="text-text-2 text-sm mb-4">
          Earn <span className="text-brand">Embers</span> by completing rites and
          bringing friends to the fire, then climb the leaderboard before it&rsquo;s
          lit. What the Embers unlock is revealed closer to launch.
        </p>
        <Tabs
          active={tab}
          onChange={setTab}
          tabs={[
            { id: "rites", label: "Rites", content: <QuestFunnel /> },
            { id: "leaderboard", label: "Leaderboard", content: <QuestLeaderboard /> },
          ]}
        />
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------------- Rites */

function QuestFunnel() {
  const tasks = useQuestTasks();
  const referral = useReferral();
  const complete = useCompleteQuestTask();
  const submit = useSubmitWallet();
  const { mode, address, username, connectWallet } = useIdentity();
  const [wallet, setWallet] = useState("");

  const submitted = tasks.data?.find((t) => t.id === "submit")?.done ?? false;

  // Wallet users never fill in a form — their connected address IS the entry, so
  // record it automatically (once) the first time they reach the funnel.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (mode !== "wallet") autoSubmitted.current = false;
  }, [mode]);
  useEffect(() => {
    if (mode === "wallet" && address && tasks.data && !submitted && !submit.isPending && !autoSubmitted.current) {
      autoSubmitted.current = true;
      submit.mutate(address);
    }
  }, [mode, address, tasks.data, submitted, submit.isPending, submit]);

  const referralEmbers = referral.data ? referral.data.count * referral.data.embersEach : 0;

  return (
    <div className="space-y-4">
      <StateView query={tasks}>
        {(rows) => {
          const questEmbers = rows.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
          const totalEmbers = questEmbers + referralEmbers;
          return (
            <>
              {/* Total Embers — rites + referrals. What it unlocks is the reveal. */}
              <div className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2.5 border border-surface-3/60">
                <span className="text-text-3 text-xs uppercase tracking-wider">Embers gathered</span>
                <span className="tabular text-brand text-lg">🔥 {totalEmbers}</span>
              </div>

              <ul className="space-y-2">
                {rows.map((t) => {
                  const locked = t.unlockAt !== null && t.unlockAt > Date.now();
                  const actionable = !t.done && !locked && t.id !== "submit";
                  const newlyLit = !t.done && !locked && Date.now() - t.addedAt < NEWLY_LIT_WINDOW;
                  if (t.id === "submit" && mode === "wallet") return null;
                  return (
                    <li key={t.id} className="flex items-center gap-3 rounded-md bg-surface-2 px-3 py-2">
                      <span className={t.done ? "text-success" : "text-text-3"}>
                        {t.done ? "✓" : locked ? "🔒" : "○"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-text text-sm">{t.title}</span>
                          {newlyLit && <Badge tone="brand">Newly lit</Badge>}
                        </div>
                        <div className="text-text-3 text-xs">
                          {locked && t.unlockAt
                            ? `Unlocks in ${formatCountdown(t.unlockAt - Date.now())}`
                            : t.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`tabular text-xs ${t.done ? "text-success" : "text-text-3"}`}>
                          +{t.points}
                        </span>
                        {actionable &&
                          (t.href ? (
                            <a
                              href={t.href}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => complete.mutate(t.id)}
                            >
                              <Badge tone="brand">Go</Badge>
                            </a>
                          ) : (
                            <button onClick={() => complete.mutate(t.id)}>
                              <Badge tone="brand">Mark done</Badge>
                            </button>
                          ))}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="pt-3 border-t border-surface-3/60 space-y-2">
                <SubmissionArea
                  mode={mode}
                  address={address}
                  username={username}
                  submitted={submitted}
                  wallet={wallet}
                  setWallet={setWallet}
                  submitting={submit.isPending}
                  submitError={submit.isError ? submit.error?.message : null}
                  onSubmit={() => submit.mutate(wallet.trim())}
                  onConnect={connectWallet}
                />
              </div>

              {/* Secondary, repeatable earn — bring friends to the fire. */}
              <ReferSection />
            </>
          );
        }}
      </StateView>
    </div>
  );
}

/* The bottom of the funnel adapts to how the visitor entered:
   - wallet : auto-recorded, just a confirmation (no form).
   - guest  : a name is set; submit the wallet manually.
   - none   : offer to connect, or submit manually as a guest would. */
function SubmissionArea({
  mode,
  address,
  username,
  submitted,
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
            ✓ Wallet {address ? shortAddress(address as `0x${string}`) : ""} locked in for your
            reward.
          </span>
        ) : (
          <span className="text-text-2">Recording your connected wallet…</span>
        )}
      </div>
    );
  }

  if (submitted) {
    return <div className="text-success text-sm">Wallet submitted. Your reward will land here.</div>;
  }

  return (
    <>
      {mode === "guest" && username && (
        <div className="text-text-3 text-xs">
          Entering as <span className="text-text-2">{username}</span>. Add the wallet that receives
          your reward.
        </div>
      )}
      <Field label="Your wallet address" value={wallet} onChange={setWallet} placeholder="0x…" />
      <Button onClick={onSubmit} disabled={wallet.trim().length < 10 || submitting} className="w-full">
        {submitting ? "Submitting…" : "Submit wallet"}
      </Button>
      {submitError && <p className="text-danger text-xs">{submitError}</p>}
      {mode === null && (
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

/* ------------------------------------------------------------- Referrals */

function ReferSection() {
  const referral = useReferral();
  const [copied, setCopied] = useState(false);

  return (
    <StateView query={referral}>
      {(r) => {
        const link = referralLink(r.code);
        const earned = r.count * r.embersEach;
        const tweet = tweetIntent(
          "I'm gathering Embers before the fire is lit. Come stand at the Tavern with me. ⟡",
          link
        );
        return (
          <div className="rounded-md bg-surface-2 p-4 space-y-3 border border-surface-3/60">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-text">Bring friends to the fire</h3>
              <span className="text-text-3 text-xs">+{r.embersEach} Embers each</span>
            </div>
            <p className="text-text-2 text-sm">
              Every friend who joins through your link earns you {r.embersEach} Embers, again and
              again. Stack them and climb the leaderboard.
            </p>
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-2">
                Friends joined: <b className="text-text tabular">{r.count}</b>
              </span>
              <span className="text-success tabular">+{earned} Embers</span>
            </div>
            <a
              href={tweet}
              target="_blank"
              rel="noreferrer"
              className="block text-center rounded-md bg-brand text-bg py-2.5 text-sm font-medium hover:bg-brand-deep transition-colors"
            >
              Share your link on X
            </a>
          </div>
        );
      }}
    </StateView>
  );
}

/* ----------------------------------------------------------- Leaderboard */

function QuestLeaderboard() {
  const lb = useQuestLeaderboard();
  return (
    <StateView query={lb}>
      {(data) =>
        data.top.length === 0 ? (
          <div className="text-center text-text-3 text-sm py-6">
            No Embers gathered yet. Be the first to light the board.
          </div>
        ) : (
          <div className="space-y-3">
            <ol className="space-y-1">
              {data.top.map((r) => (
                <li
                  key={r.rank}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    r.you ? "bg-brand/10 border border-brand/40" : "bg-surface-2"
                  }`}
                >
                  <span className="text-text-2 tabular truncate">
                    <span className="text-text-3">#{r.rank}</span> {r.name}
                    {r.you && <span className="text-brand"> (you)</span>}
                  </span>
                  <span className="tabular text-brand shrink-0">🔥 {r.embers}</span>
                </li>
              ))}
            </ol>
            {data.you && !data.top.some((t) => t.you) && (
              <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm bg-brand/10 border border-brand/40">
                <span className="text-text-2 tabular">
                  <span className="text-text-3">#{data.you.rank}</span> You
                </span>
                <span className="tabular text-brand shrink-0">🔥 {data.you.embers}</span>
              </div>
            )}
          </div>
        )
      }
    </StateView>
  );
}
