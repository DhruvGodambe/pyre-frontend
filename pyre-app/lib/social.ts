/* ============================================================================
   PYRE, Social / share helpers (one place for the public identity)
   ----------------------------------------------------------------------------
   Centralises the public PYRE handle + outbound links and the X (Twitter) web-
   intent builder. Per the project's opsec rule, ONLY the public identity appears
   here, never anything tying to a person. Swap the placeholders when live.
   ========================================================================== */

export const X_HANDLE = "pyre_protocol"; // no leading @
export const X_PROFILE_URL = `https://x.com/${X_HANDLE}`;
export const DOCS_URL = "https://docs.pyreprotocol.com"; // TODO: real docs URL
export const SITE_URL = "https://pyreprotocol.com"; // TODO: real site URL
/** Public community invite (the "Join the community" quest links here). One
    place to set: swap for the real Telegram invite before launch. */
export const COMMUNITY_URL = "https://t.me/pyreprotocol";

/** The pinned manifesto post the "share the manifesto" quest amplifies. */
export const MANIFESTO_TWEET_ID = "2069487264615346514";
export const MANIFESTO_TWEET_URL = `https://x.com/${X_HANDLE}/status/${MANIFESTO_TWEET_ID}`;

/** Build an X web-intent URL, no API/auth needed, the user just posts.
    URLSearchParams handles encoding; `via` carries the public handle only. */
export function tweetIntent(text: string, url?: string): string {
  const params = new URLSearchParams({ text });
  if (url) params.set("url", url);
  params.set("via", X_HANDLE);
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** One-click repost (X web-intent) of a tweet by id. Opens X's "Repost?"
    confirmation directly, the frictionless way to amplify a specific post. */
export function repostIntent(tweetId: string): string {
  return `https://twitter.com/intent/retweet?tweet_id=${tweetId}`;
}

/** One-click like (X web-intent) of a tweet by id. */
export function likeIntent(tweetId: string): string {
  return `https://twitter.com/intent/like?tweet_id=${tweetId}`;
}

/** A visitor's shareable referral link into the app (basePath = /app). */
export function referralLink(code: string): string {
  if (typeof window === "undefined") return `/app?ref=${code}`;
  return `${window.location.origin}/app?ref=${code}`;
}
