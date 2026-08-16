import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { encryptToken, verifyOAuthState } from "@/lib/meta/oauth";
import { exchangeCode, redirectUri } from "@/lib/google/oauth";
import { getPublicBaseUrl } from "@/lib/public-url";

/**
 * Google sends the user back here after consent.
 *
 * Errors redirect to /mail with a readable message rather than rendering a
 * dead-end JSON page — the person hitting this is in a browser mid-flow, not
 * calling an API.
 */
export async function GET(request: NextRequest) {
  const base = getPublicBaseUrl();
  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/mail?error=${encodeURIComponent(message)}`, base));

  const params = request.nextUrl.searchParams;

  // Google reports user-side refusal here, not as an HTTP error.
  const denied = params.get("error");
  if (denied) {
    return fail(denied === "access_denied" ? "Access was declined." : denied);
  }

  const code = params.get("code");
  if (!code) return fail("Google did not return an authorization code.");

  const state = verifyOAuthState(params.get("state"));
  if (!state) return fail("This sign-in link expired. Try connecting again.");

  try {
    const tokens = await exchangeCode(code);

    // Which mailbox was actually granted — the operator may have picked a
    // different Google account at the consent screen than the one they log in
    // with, and the inbox has to say which one it is reading.
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    const info = (await infoRes.json()) as { email?: string };
    const email = info.email;
    if (!email) return fail("Could not read which Google account was connected.");

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.googleConnection.upsert({
      where: { workspaceId_email: { workspaceId: state.workspaceId, email } },
      create: {
        workspaceId: state.workspaceId,
        email,
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
        expiresAt,
        scope: tokens.scope,
      },
      update: {
        accessToken: encryptToken(tokens.access_token),
        expiresAt,
        scope: tokens.scope,
        // Only overwrite when Google actually issued a new one. On a repeat
        // consent it often omits it, and clobbering the stored value would
        // leave a connection that cannot refresh.
        ...(tokens.refresh_token ? { refreshToken: encryptToken(tokens.refresh_token) } : {}),
      },
    });

    return NextResponse.redirect(new URL("/mail?connected=1", base));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not connect Gmail.";
    console.error("[Gmail callback]", message, "redirect_uri:", redirectUri());
    return fail(message);
  }
}
