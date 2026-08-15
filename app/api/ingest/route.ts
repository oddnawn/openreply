import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/client";

/**
 * Accepts a data snapshot collected somewhere this app cannot reach.
 *
 * Competitor research reads a folder of local run files; Gmail arrives through
 * an agent connector. Neither exists inside a Vercel function, so the operator's
 * machine gathers them and pushes the result here. The hosted pages then render
 * the last snapshot per source.
 *
 * Authenticated with CRON_SECRET rather than a session, because the caller is a
 * script, not a browser — same pattern as the cron routes.
 */

const KNOWN_SOURCES = ["competitors", "gmail"] as const;

// Postgres can hold far more, but a runaway payload here would be a bug
// upstream, and silently storing megabytes of transcript is worse than a 413.
const MAX_PAYLOAD_BYTES = 2_000_000;

const bodySchema = z.object({
  source: z.enum(KNOWN_SOURCES),
  fetchedAt: z.string().datetime(),
  payload: z.unknown(),
});

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Body is not valid JSON" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 }
    );
  }

  const { source, fetchedAt, payload } = parsed.data;

  const size = Buffer.byteLength(JSON.stringify(payload ?? null));
  if (size > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      { success: false, error: `Payload is ${size} bytes; the limit is ${MAX_PAYLOAD_BYTES}` },
      { status: 413 }
    );
  }

  // Self-hosted single-tenant: there is exactly one workspace. Refuse rather
  // than guess if that ever stops being true, so a push can't silently land in
  // the wrong place.
  const workspaces = await prisma.workspace.findMany({
    select: { id: true },
    take: 2,
  });

  if (workspaces.length === 0) {
    return NextResponse.json(
      { success: false, error: "No workspace exists yet — sign in to the dashboard once first" },
      { status: 409 }
    );
  }
  if (workspaces.length > 1) {
    return NextResponse.json(
      { success: false, error: "More than one workspace exists; /api/ingest cannot pick one" },
      { status: 409 }
    );
  }

  const workspaceId = workspaces[0].id;

  await prisma.ingestSnapshot.upsert({
    where: { workspaceId_source: { workspaceId, source } },
    create: {
      workspaceId,
      source,
      payload: payload as never,
      fetchedAt: new Date(fetchedAt),
    },
    update: {
      payload: payload as never,
      fetchedAt: new Date(fetchedAt),
    },
  });

  return NextResponse.json({ success: true, source, bytes: size });
}
