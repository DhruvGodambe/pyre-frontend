/* ============================================================================
   PYRE — FileStore  (local-dev quest persistence, zero dependencies)
   ----------------------------------------------------------------------------
   Persists quest state to a JSON file under .data/ so the funnel works on your
   machine with no database at all. NOT for production: serverless filesystems
   are ephemeral/read-only, so on Vercel the SupabaseStore is used instead (see
   lib/db/index.ts). Reads/writes are serialised through a single in-flight
   promise so concurrent route handlers don't clobber the file.
   ========================================================================== */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { StoredIdentity } from "../types";
import type { QuestStore, WalletSubmission, LeaderboardRow, Referral } from "./store";

interface Shape {
  completions: Record<string, string[]>; // sessionId -> task ids
  submissions: Record<string, WalletSubmission>; // sessionId -> submission
  identities: Record<string, StoredIdentity>; // sessionId -> identity choice
  referrals: Record<string, Referral>; // sessionId -> referral code + referredBy
}

const FILE = path.join(process.cwd(), ".data", "quests.json");
const EMPTY: Shape = { completions: {}, submissions: {}, identities: {}, referrals: {} };

export class FileStore implements QuestStore {
  private chain: Promise<unknown> = Promise.resolve();

  /** Serialise every operation so read-modify-write stays consistent. */
  private run<T>(op: () => Promise<T>): Promise<T> {
    const next = this.chain.then(op, op);
    this.chain = next.catch(() => {});
    return next;
  }

  private async read(): Promise<Shape> {
    try {
      const raw = await fs.readFile(FILE, "utf8");
      return { ...EMPTY, ...(JSON.parse(raw) as Shape) };
    } catch {
      return structuredClone(EMPTY);
    }
  }

  private async write(data: Shape): Promise<void> {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
  }

  getCompletions(sessionId: string): Promise<string[]> {
    return this.run(async () => {
      const data = await this.read();
      return data.completions[sessionId] ?? [];
    });
  }

  markComplete(sessionId: string, taskId: string): Promise<void> {
    return this.run(async () => {
      const data = await this.read();
      const list = new Set(data.completions[sessionId] ?? []);
      list.add(taskId);
      data.completions[sessionId] = [...list];
      await this.write(data);
    });
  }

  getSubmission(sessionId: string): Promise<WalletSubmission | null> {
    return this.run(async () => {
      const data = await this.read();
      return data.submissions[sessionId] ?? null;
    });
  }

  submitWallet(sessionId: string, wallet: string): Promise<void> {
    return this.run(async () => {
      const data = await this.read();
      data.submissions[sessionId] = { wallet, at: Date.now() };
      await this.write(data);
    });
  }

  getIdentity(sessionId: string): Promise<StoredIdentity | null> {
    return this.run(async () => {
      const data = await this.read();
      return data.identities[sessionId] ?? null;
    });
  }

  setIdentity(sessionId: string, identity: StoredIdentity): Promise<void> {
    return this.run(async () => {
      const data = await this.read();
      data.identities[sessionId] = identity;
      await this.write(data);
    });
  }

  clearIdentity(sessionId: string): Promise<void> {
    return this.run(async () => {
      const data = await this.read();
      delete data.identities[sessionId];
      await this.write(data);
    });
  }

  getLeaderboard(): Promise<LeaderboardRow[]> {
    return this.run(async () => {
      const data = await this.read();
      const sids = new Set<string>([
        ...Object.keys(data.completions),
        ...Object.keys(data.submissions),
        ...Object.keys(data.referrals),
      ]);
      return [...sids].map((sid) => ({
        sessionId: sid,
        taskIds: data.completions[sid] ?? [],
        submitted: !!data.submissions[sid],
        username: data.identities[sid]?.username ?? null,
        wallet: data.identities[sid]?.wallet ?? data.submissions[sid]?.wallet ?? null,
        code: data.referrals[sid]?.code ?? null,
        referredBy: data.referrals[sid]?.referredBy ?? null,
      }));
    });
  }

  getReferral(sessionId: string, mintCode: string): Promise<Referral> {
    return this.run(async () => {
      const data = await this.read();
      const existing = data.referrals[sessionId];
      if (existing) return existing;
      const fresh: Referral = { code: mintCode, referredBy: null };
      data.referrals[sessionId] = fresh;
      await this.write(data);
      return fresh;
    });
  }

  setReferredBy(sessionId: string, byCode: string): Promise<void> {
    return this.run(async () => {
      const data = await this.read();
      const row = data.referrals[sessionId];
      if (!row) return; // getReferral mints the row first; nothing to set otherwise
      if (row.referredBy) return; // already attributed — never overwrite
      row.referredBy = byCode;
      await this.write(data);
    });
  }

  countReferrals(code: string): Promise<number> {
    return this.run(async () => {
      const data = await this.read();
      return Object.values(data.referrals).filter((r) => r.referredBy === code).length;
    });
  }
}
