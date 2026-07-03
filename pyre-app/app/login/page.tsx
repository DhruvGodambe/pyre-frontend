"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BASE_PATH, KINGDOM_PATH } from "@/lib/config";

/* Login for the team (designer + team, one password). Reached via the discreet
   "Team access" link on the public front door, or by hitting a gated /kingdom URL
   directly. On success it lands in the kingdom. Fetches the BASE_PATH-prefixed
   API path so it works whether the app is served at the root or behind a prefix. */
export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`${BASE_PATH}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      // Honour ?next (a relative deep-link path) so shared building links land
      // where intended after the gate. Relative-only, to avoid open redirects.
      // Default into the kingdom: login is team-only, so there's no reason to send
      // them back to the public front door.
      const next = new URLSearchParams(window.location.search).get("next");
      const dest =
        next && next.startsWith("/") && !next.startsWith("//") ? next : KINGDOM_PATH;
      router.push(dest);
      router.refresh();
    } else {
      setError("The flame rejects this key.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-xs text-center space-y-4 rounded-panel bg-surface border border-surface-3/60 p-8">
        <div className="text-3xl text-brand" aria-hidden>
          ✦
        </div>
        <p className="text-text-3 text-xs uppercase tracking-widest">Private</p>
        <h1 className="font-display text-4xl text-brand">PYRE</h1>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            placeholder="········"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            aria-label="Password"
            className="w-full rounded-md bg-surface-2 border border-surface-3 px-3 py-2.5 text-center text-text outline-none focus:border-brand/60"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-brand text-bg py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {busy ? "Unsealing" : "Enter"}
          </button>
          <p className="text-danger text-xs h-4">{error}</p>
        </form>
      </div>
    </main>
  );
}
