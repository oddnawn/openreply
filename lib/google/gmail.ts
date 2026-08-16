import { prisma } from "@/lib/db/client";
import { encryptToken, decryptToken } from "@/lib/meta/oauth";
import { refreshAccessToken } from "@/lib/google/oauth";

/**
 * Gmail reads, plus the token bookkeeping they depend on.
 *
 * Tokens are stored encrypted with the same AES-256-GCM helper as the Instagram
 * token, so ENCRYPTION_KEY is the single secret protecting both.
 */

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

// Refresh a minute early rather than on expiry — a token that dies mid-request
// surfaces as a confusing 401 instead of a refresh.
const EXPIRY_SKEW_MS = 60_000;

export interface MailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  unread: boolean;
  url: string;
}

/**
 * A usable access token for the workspace, refreshing and re-persisting when
 * the stored one has expired. Returns null when no account is connected.
 */
export async function getAccessToken(
  workspaceId: string
): Promise<{ token: string; email: string } | null> {
  const conn = await prisma.googleConnection.findFirst({
    where: { workspaceId },
    orderBy: { connectedAt: "desc" },
  });
  if (!conn) return null;

  if (conn.expiresAt.getTime() - EXPIRY_SKEW_MS > Date.now()) {
    return { token: decryptToken(conn.accessToken), email: conn.email };
  }

  if (!conn.refreshToken) {
    throw new Error(
      "Gmail access expired and no refresh token is stored. Disconnect and reconnect to grant offline access."
    );
  }

  const refreshed = await refreshAccessToken(decryptToken(conn.refreshToken));

  await prisma.googleConnection.update({
    where: { id: conn.id },
    data: {
      accessToken: encryptToken(refreshed.access_token),
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
      // Google omits refresh_token on refresh. Never overwrite the stored one
      // with undefined — that is how a working connection quietly dies.
      ...(refreshed.refresh_token
        ? { refreshToken: encryptToken(refreshed.refresh_token) }
        : {}),
    },
  });

  return { token: refreshed.access_token, email: conn.email };
}

function header(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Gmail encodes bodies as base64url and hides text/plain at arbitrary depth. */
function decodeBody(data?: string): string {
  if (!data) return "";
  try {
    return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  } catch {
    return "";
  }
}

interface Part {
  mimeType?: string;
  body?: { data?: string };
  parts?: Part[];
}

function extractBody(payload: Part): string {
  // Prefer text/plain anywhere in the tree; fall back to stripped HTML.
  const walk = (part: Part, wanted: string): string => {
    if (part.mimeType === wanted && part.body?.data) return decodeBody(part.body.data);
    for (const child of part.parts ?? []) {
      const found = walk(child, wanted);
      if (found) return found;
    }
    return "";
  };

  const plain = walk(payload, "text/plain");
  if (plain) return plain;

  const html = walk(payload, "text/html");
  if (!html) return decodeBody(payload.body?.data);

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

async function gmail<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Gmail API returned ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listMessages(
  token: string,
  { query = "in:inbox", max = 25 }: { query?: string; max?: number } = {}
): Promise<MailMessage[]> {
  const list = await gmail<{ messages?: { id: string }[] }>(
    token,
    `/messages?q=${encodeURIComponent(query)}&maxResults=${max}`
  );

  const ids = (list.messages ?? []).map((m) => m.id);
  if (!ids.length) return [];

  // Sequential would take 25 round trips; Gmail tolerates this fan-out fine at
  // inbox-page scale, and a failed message is dropped rather than failing all.
  const settled = await Promise.allSettled(
    ids.map((id) =>
      gmail<{
        id: string;
        threadId: string;
        snippet: string;
        labelIds?: string[];
        internalDate?: string;
        payload: Part & { headers: { name: string; value: string }[] };
      }>(token, `/messages/${id}?format=full`)
    )
  );

  const messages: MailMessage[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    const m = result.value;
    const headers = m.payload.headers ?? [];
    const rawFrom = header(headers, "From");
    const match = rawFrom.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);

    messages.push({
      id: m.id,
      threadId: m.threadId,
      from: (match?.[2] ?? rawFrom).trim(),
      fromName: (match?.[1] ?? rawFrom.split("@")[0] ?? "").trim(),
      subject: header(headers, "Subject") || "(no subject)",
      snippet: m.snippet ?? "",
      body: extractBody(m.payload),
      date: m.internalDate
        ? new Date(Number(m.internalDate)).toISOString()
        : header(headers, "Date"),
      unread: (m.labelIds ?? []).includes("UNREAD"),
      url: `https://mail.google.com/mail/u/0/#inbox/${m.threadId}`,
    });
  }

  messages.sort((a, b) => (b.date > a.date ? 1 : -1));
  return messages;
}

/** Archive (remove INBOX) or mark read (remove UNREAD). Never deletes. */
export async function modifyMessage(
  token: string,
  id: string,
  removeLabelIds: string[]
): Promise<void> {
  const res = await fetch(`${API}/messages/${id}/modify`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ removeLabelIds }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Gmail API returned ${res.status}`);
  }
}
