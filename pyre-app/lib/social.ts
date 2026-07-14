/* ============================================================================
   PYRE, Social / share helpers (one place for the public identity)
   ----------------------------------------------------------------------------
   Centralises the public PYRE handle + outbound links and the X (Twitter) web-
   intent builder. Per the project's opsec rule, ONLY the public identity appears
   here, never anything tying to a person. Swap the placeholders when live.
   ========================================================================== */

import { BASE_PATH } from "./config";

export const X_HANDLE = "pyre_protocol"; // no leading @
export const X_PROFILE_URL = `https://x.com/${X_HANDLE}`;
export const DOCS_URL = "https://docs.pyreprotocol.com"; // TODO: real docs URL
export const SITE_URL = "https://pyreprotocol.com"; // TODO: real site URL
/** Public community invite (the "Join the community" quest links here). One
    place to set: swap for the real Telegram invite before launch. */
export const COMMUNITY_URL = "https://t.me/pyreprotocol";

/** The pinned manifesto post the Ashen Cup's "share the manifesto" rite amplifies. */
export const MANIFESTO_TWEET_ID = "2069487264615346514";
export const MANIFESTO_TWEET_URL = `https://x.com/${X_HANDLE}/status/${MANIFESTO_TWEET_ID}`;

/* ============================================================================
   THE DECREE: the ONE post the sealed gate sends everyone to.
   ----------------------------------------------------------------------------
   This is the launch-announcement film. It is what every visitor who claims at
   the Emberheart likes and reposts, so all of that engagement lands on a single
   post instead of being scattered.

   ⚠️ SET THIS THE MOMENT THE FILM IS POSTED. Until then it falls back to the
   manifesto, which means the gate is quietly pumping the wrong (older, weaker)
   post: every like and repost the funnel earns is spent on it. It is one line.

   Paste the id from the post's URL:  x.com/pyre_protocol/status/<THIS>
   ========================================================================== */
const ANNOUNCEMENT_TWEET_ID: string | null = null; // TODO: the film's post id

/** The post the gate's Like + Share rite acts on. */
export const DECREE_TWEET_ID = ANNOUNCEMENT_TWEET_ID ?? MANIFESTO_TWEET_ID;
export const DECREE_TWEET_URL = `https://x.com/${X_HANDLE}/status/${DECREE_TWEET_ID}`;
/** False while the gate is still pointing at the fallback, so it can say so. */
export const DECREE_IS_ANNOUNCEMENT = ANNOUNCEMENT_TWEET_ID !== null;

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

/** A visitor's shareable referral link into the app. Follows BASE_PATH so it
    stays correct whether the app is served at the root or behind a path prefix. */
export function referralLink(code: string): string {
  const path = `${BASE_PATH}/?ref=${code}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
