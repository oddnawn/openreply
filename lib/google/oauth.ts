import { getPublicBaseUrl } from "@/lib/public-url";

/**
 * Google OAuth for Gmail.
 *
 * Reuses the app's existing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET — the same
 * OAuth client already used for sign-in — so there is one Google app to manage
 * rather than two. The Gmail callback is a separate redirect URI on that same
 * client.
 *
 * `redirectUri()` is exported and surfaced in error messages on purpose.
 * "Invalid redirect_uri" is an exact-string allowlist failure, and the only
 * reliable fix is pasting the string the app actually sends. Guessing it is
 * how people lose an afternoon.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

// gmail.modify covers read, label, archive and mark-read. Deliberately not
// gmail.send and not any delete scope: nothing here should be able to email
// someone on the operator's behalf or destroy a message.
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** The exact string that must be registered in the Google Cloud console. */
export function redirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || `${getPublicBaseUrl()}/api/gmail/callback`;
}

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function buildAuthUrl(state: string): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES.join(" "));
  url.searchParams.set("state", state);
  // offline + consent is what makes Google issue a refresh token. Without both,
  // a returning user gets an access token that dies in an hour and no way to
  // renew it, and the connection silently stops working the next day.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  return url.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    const detail = json?.error_description || json?.error || `HTTP ${res.status}`;
    // Spell out the URI on the one error that is always caused by it.
    if (String(detail).includes("redirect_uri")) {
      throw new Error(
        `${detail}. The app sent: ${redirectUri()} — add that exact string to Authorized redirect URIs.`
      );
    }
    throw new Error(String(detail));
  }
  return json as TokenResponse;
}

export function exchangeCode(code: string): Promise<TokenResponse> {
  return tokenRequest({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
}

export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    grant_type: "refresh_token",
  });
}

/** Best-effort revoke. Google is the source of truth; local deletion follows. */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token)}`, {
    method: "POST",
  }).catch(() => {});
}
