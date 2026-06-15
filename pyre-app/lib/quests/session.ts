/* ============================================================================
   PYRE — Quest session identity
   ----------------------------------------------------------------------------
   The funnel is intentionally wallet-free ("just submit your address when you're
   done"), so we identify a visitor by an anonymous, httpOnly session cookie.
   First call mints one and sets it; later calls reuse it. The submitted wallet
   is associated with this session id at the end of the funnel.

   Anonymous + httpOnly + no PII == consistent with the project's opsec stance:
   nothing here links the protocol to a person.
   ========================================================================== */

import { cookies } from "next/headers";

export const SESSION_COOKIE = "pyre_quest_sid";
const MAX_AGE = 60 * 60 * 24 * 120; // 120 days

/** Read the session id, minting + persisting one if absent. */
export async function getOrCreateSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const sid = crypto.randomUUID();
  jar.set(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return sid;
}
