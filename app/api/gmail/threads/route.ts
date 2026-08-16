import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { getAccessToken, listMessages, modifyMessage } from "@/lib/google/gmail";
import { classify, CATEGORIES, type Category } from "@/lib/mail/triage";
import { summarize } from "@/lib/mail/summarize";
import { redirectUri } from "@/lib/google/oauth";

export interface TriagedMail {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  summary: string;
  date: string;
  unread: boolean;
  url: string;
  category: Category;
  confidence: number;
  signals: string[];
}

const QUERIES: Record<string, string> = {
  inbox: "in:inbox",
  unread: "in:inbox is:unread",
  starred: "is:starred",
};

export async function GET(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const filter = request.nextUrl.searchParams.get("filter") ?? "inbox";
  const query = QUERIES[filter] ?? QUERIES.inbox;

  let access;
  try {
    access = await getAccessToken(workspaceId);
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Token error" },
      { status: 502 }
    );
  }

  if (!access) {
    return NextResponse.json({
      success: true,
      data: { connected: false, redirectUri: redirectUri(), categories: CATEGORIES },
    });
  }

  try {
    const messages = await listMessages(access.token, { query, max: 25 });

    const items: TriagedMail[] = messages.map((m) => {
      const { category, confidence, signals } = classify({
        subject: m.subject,
        snippet: m.snippet,
        body: m.body,
        from: m.from,
      });
      return {
        id: m.id,
        threadId: m.threadId,
        from: m.from,
        fromName: m.fromName,
        subject: m.subject,
        // Falls back to Gmail's own snippet when the body is empty or is a
        // single image — better a short preview than a blank row.
        summary: summarize(m.body) || m.snippet,
        date: m.date,
        unread: m.unread,
        url: m.url,
        category,
        confidence,
        signals,
      };
    });

    const counts = Object.fromEntries(
      Object.keys(CATEGORIES).map((k) => [k, 0])
    ) as Record<Category, number>;
    for (const item of items) counts[item.category]++;

    items.sort((a, b) => {
      const pa = CATEGORIES[a.category].priority;
      const pb = CATEGORIES[b.category].priority;
      if (pa !== pb) return pa - pb;
      return b.date > a.date ? 1 : -1;
    });

    return NextResponse.json({
      success: true,
      data: { connected: true, email: access.email, items, counts, categories: CATEGORIES },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Could not read Gmail" },
      { status: 502 }
    );
  }
}

/**
 * Archive or mark read. Both are label removals — the message stays in the
 * mailbox and stays searchable. There is deliberately no delete path.
 */
export async function POST(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  const remove =
    body.action === "archive" ? ["INBOX"] : body.action === "read" ? ["UNREAD"] : null;

  if (!body.id || !remove) {
    return NextResponse.json(
      { success: false, error: "id and action ('archive' or 'read') are required" },
      { status: 400 }
    );
  }

  const access = await getAccessToken(workspaceId);
  if (!access) {
    return NextResponse.json({ success: false, error: "Gmail not connected" }, { status: 400 });
  }

  try {
    await modifyMessage(access.token, body.id, remove);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Gmail rejected the change" },
      { status: 502 }
    );
  }
}
