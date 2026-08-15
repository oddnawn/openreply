import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * The worker side of the research queue, for the watcher running on the
 * operator's machine.
 *
 * GET claims the oldest queued run and marks it RUNNING.
 * POST reports the outcome.
 *
 * Authenticated with CRON_SECRET rather than a session, because the caller is
 * a script — same pattern as the cron routes and /api/ingest.
 */

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

// A run that has been RUNNING for longer than this was almost certainly
// abandoned — the laptop slept, or the watcher was killed mid-job. Reclaiming
// it is better than leaving the queue jammed forever.
const STALE_RUNNING_MS = 30 * 60 * 1000;

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const stale = new Date(Date.now() - STALE_RUNNING_MS);
  await prisma.researchRun.updateMany({
    where: { status: "RUNNING", startedAt: { lt: stale } },
    data: { status: "FAILED", message: "Abandoned — watcher stopped mid-run", finishedAt: new Date() },
  });

  const next = await prisma.researchRun.findFirst({
    where: { status: "QUEUED" },
    orderBy: { requestedAt: "asc" },
  });

  if (!next) {
    return NextResponse.json({ success: true, data: null });
  }

  const claimed = await prisma.researchRun.update({
    where: { id: next.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  return NextResponse.json({ success: true, data: claimed });
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; status?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  if (!body.id || !["DONE", "FAILED"].includes(body.status ?? "")) {
    return NextResponse.json(
      { success: false, error: "id and status (DONE or FAILED) are required" },
      { status: 400 }
    );
  }

  const run = await prisma.researchRun.update({
    where: { id: body.id },
    data: {
      status: body.status as "DONE" | "FAILED",
      message: body.message?.slice(0, 500) ?? null,
      finishedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, data: run });
}
