/* GET /api/session, PUBLIC. Reports whether the caller is a signed-in team member
   (designer/team share one password). The auth cookie is httpOnly, so the public
   front door can't read it directly; it asks here instead, and lights up the
   "Enter Pyre Kingdom" door only when this returns team:true. This is UX only,
   the kingdom is independently gated by middleware, so a false positive can't
   grant access. Never reveals the password or the token, only a boolean. */

import { NextResponse } from "next/server";
import { authToken, AUTH_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const password = process.env.DESIGNER_PASSWORD;
  if (!password) return NextResponse.json({ team: false });

  const cookie = (await cookies()).get(AUTH_COOKIE)?.value;
  const team = cookie === (await authToken(password));
  return NextResponse.json({ team });
}
