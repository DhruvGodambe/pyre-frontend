/* ============================================================================
   PYRE — Social / share helpers (one place for the public identity)
   ----------------------------------------------------------------------------
   Centralises the public PYRE handle + outbound links and the X (Twitter) web-
   intent builder. Per the project's opsec rule, ONLY the public identity appears
   here — never anything tying to a person. Swap the placeholders when live.
   ========================================================================== */

export const X_HANDLE = "PYRE_xyz"; // no leading @
export const DOCS_URL = "https://docs.pyreprotocol.com"; // TODO: real docs URL
export const SITE_URL = "https://pyreprotocol.com"; // TODO: real site URL

/** Build an X web-intent URL — no API/auth needed, the user just posts.
    URLSearchParams handles encoding; `via` carries the public handle only. */
export function tweetIntent(text: string, url?: string): string {
  const params = new URLSearchParams({ text });
  if (url) params.set("url", url);
  params.set("via", X_HANDLE);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** A visitor's shareable referral link into the app (basePath = /app). */
export function referralLink(code: string): string {
  if (typeof window === "undefined") return `/app?ref=${code}`;
  return `${window.location.origin}/app?ref=${code}`;
}
