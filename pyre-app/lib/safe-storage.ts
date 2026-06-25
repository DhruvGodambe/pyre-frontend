/* SAFE STORAGE, localStorage that never throws.

   On a machine with a FULL DISK, or in private / locked-down browser modes,
   localStorage.getItem/setItem/removeItem can THROW (QuotaExceededError,
   SecurityError), not just return null. An unguarded throw in a render or effect
   path takes out the whole React subtree, a blank screen, missing panels, a
   "stuck" app. These helpers swallow every failure: reads fall back to null,
   writes are best-effort. Persisted preferences quietly become ephemeral, but
   the app keeps working instead of crashing.

   Use these instead of touching localStorage directly. */

export function storageGet(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(key, value);
  } catch {
    /* full / blocked storage: best-effort, just drop it */
  }
}

export function storageRemove(key: string): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(key);
  } catch {
    /* full / blocked storage: ignore */
  }
}
