import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getWorkspaceInstagramAccount } from "@/lib/instagram-accounts";
import {
  getConversations,
  getContactProfile,
  sendDirectMessage,
  MetaApiError,
} from "@/lib/meta/client";
import { decryptToken } from "@/lib/meta/oauth";

/**
 * Contact photos are fetched one IGSID at a time — Meta exposes no batch form
 * — so they're cached in module memory. Without this, every 12-second inbox
 * poll would fire one extra request per conversation.
 *
 * The URLs Meta returns are signed and expire, hence the short TTL. A serverless
 * instance may cold-start and lose this, which costs a refetch and nothing else.
 */
const photoCache = new Map<string, { url: string | null; at: number }>();
const PHOTO_TTL_MS = 10 * 60 * 1000;

async function contactPhoto(accessToken: string, igsid: string): Promise<string | null> {
  const hit = photoCache.get(igsid);
  if (hit && Date.now() - hit.at < PHOTO_TTL_MS) return hit.url;

  const profile = await getContactProfile(accessToken, igsid);
  const url = profile?.profile_pic ?? null;
  photoCache.set(igsid, { url, at: Date.now() });
  return url;
}

export interface ConversationListItem {
  id: string;
  contact: { id: string; username: string | null; profilePic: string | null };
  updatedTime: string | null;
  lastMessage: {
    text: string;
    fromMe: boolean;
    createdTime: string | null;
  } | null;
}

export interface ConversationsResponse {
  conversations: ConversationListItem[];
  account: { id: string; username: string; instagramId: string };
}

// List the account's DM conversations for the inbox.
export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const account = await getWorkspaceInstagramAccount(
    workspaceId,
    request.nextUrl.searchParams.get("instagramAccountId")
  );
  if (!account) {
    return NextResponse.json(
      { success: false, error: "Instagram account not connected." },
      { status: 400 }
    );
  }

  try {
    const accessToken = decryptToken(account.accessToken);
    const raw = await getConversations(accessToken, account.instagramId);

    const shaped = raw.map((c) => {
      const participants = c.participants?.data ?? [];
      const contact =
        participants.find((p) => p.id !== account.instagramId) ??
        participants[0] ??
        null;
      return { c, contact, last: c.messages?.data?.[0] ?? null };
    });

    // Resolved in parallel, but only for contacts we actually have an id for.
    // A failed lookup yields null and the UI falls back to an initial.
    const photos = await Promise.all(
      shaped.map(({ contact }) =>
        contact?.id ? contactPhoto(accessToken, contact.id) : Promise.resolve(null)
      )
    );

    const conversations: ConversationListItem[] = shaped.map(({ c, contact, last }, i) => {
      return {
        id: c.id,
        contact: {
          id: contact?.id ?? "",
          username: contact?.username ?? null,
          profilePic: photos[i],
        },
        updatedTime: c.updated_time ?? null,
        lastMessage: last
          ? {
              text: last.message ?? "",
              fromMe: last.from?.id === account.instagramId,
              createdTime: last.created_time ?? null,
            }
          : null,
      };
    });

    const data: ConversationsResponse = {
      conversations,
      account: {
        id: account.id,
        username: account.username,
        instagramId: account.instagramId,
      },
    };
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("[Conversations] Error:", err);
    const message =
      err instanceof MetaApiError
        ? err.message
        : "Failed to load conversations";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// Send a direct message reply.
export async function POST(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { instagramAccountId?: string; recipientId?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const text = body.text?.trim();
  if (!body.recipientId || !text) {
    return NextResponse.json(
      { success: false, error: "A recipient and message are required." },
      { status: 400 }
    );
  }

  const account = await getWorkspaceInstagramAccount(
    workspaceId,
    body.instagramAccountId ?? null
  );
  if (!account) {
    return NextResponse.json(
      { success: false, error: "Instagram account not connected." },
      { status: 400 }
    );
  }

  try {
    const accessToken = decryptToken(account.accessToken);
    const result = await sendDirectMessage(
      accessToken,
      account.instagramId,
      body.recipientId,
      text
    );
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("[Conversations] Send error:", err);
    // Surface Meta's own message — the common case is the 24-hour messaging
    // window having closed, which the user needs to see explicitly.
    const message =
      err instanceof MetaApiError ? err.message : "Failed to send message";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
