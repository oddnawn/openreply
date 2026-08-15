import { NextRequest, NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";

/**
 * Enqueue a competitor research run, and report the latest one's status.
 *
 * The work happens on the operator's machine — Python, yt-dlp, ffmpeg and a
 * metered Apify account are all things a Vercel function has no business
 * running. This endpoint only records the intent.
 */

export async function POST(request: NextRequest) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { platform?: string; days?: number } = {};
  try {
    body = await request.json();
  } catch {
    // An empty body is fine; the defaults below cover it.
  }

  const platform = ["both", "youtube", "instagram"].includes(body.platform ?? "")
    ? (body.platform as string)
    : "both";
  const days = [7, 30, 180].includes(Number(body.days)) ? Number(body.days) : 30;

  // Queueing a second run while one is outstanding would have the watcher do
  // the same expensive work twice, so return the existing one instead.
  const outstanding = await prisma.researchRun.findFirst({
    where: { workspaceId, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { requestedAt: "desc" },
  });
  if (outstanding) {
    return NextResponse.json({ success: true, data: outstanding, alreadyQueued: true });
  }

  const run = await prisma.researchRun.create({
    data: { workspaceId, platform, days },
  });

  return NextResponse.json({ success: true, data: run });
}

export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const run = await prisma.researchRun.findFirst({
    where: { workspaceId },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: run });
}
