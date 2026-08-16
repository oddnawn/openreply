import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { createOAuthState } from "@/lib/meta/oauth";
import { buildAuthUrl, isGoogleConfigured, redirectUri } from "@/lib/google/oauth";

/** Starts the Gmail consent flow. */
export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.redirect(new URL("/login", redirectUri()));
  }

  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not set on this deployment.",
      },
      { status: 500 }
    );
  }

  // Signed state, same helper the Instagram flow uses — it carries the
  // workspace and expires, so a stale or forged callback cannot bind an
  // account to the wrong place.
  return NextResponse.redirect(buildAuthUrl(createOAuthState(workspaceId)));
}
