import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { getWorkspaceMembership } from "@/lib/workspace";

/**
 * Read and rename the current workspace.
 *
 * A workspace is named after whoever created it, so anyone who joined by
 * invitation — and especially anyone who later left that team and got their own
 * workspace — was stuck looking at a stranger's name in the sidebar with no way
 * to change it. Renaming is the fix.
 *
 * Restricted to OWNER and ADMIN: the name is shown to every member, so it isn't
 * a personal display preference.
 */

const patchSchema = z.object({
  name: z.string().trim().min(1, "Name cannot be empty").max(60, "Name is too long"),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getWorkspaceMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ success: false, error: "No workspace" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: membership.workspace.id,
      name: membership.workspace.name,
      role: membership.role,
      canRename: membership.role === "OWNER" || membership.role === "ADMIN",
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getWorkspaceMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ success: false, error: "No workspace" }, { status: 404 });
  }

  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Only an owner or admin can rename the workspace" },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid name" },
      { status: 400 }
    );
  }

  const workspace = await prisma.workspace.update({
    where: { id: membership.workspace.id },
    data: { name: parsed.data.name },
    select: { id: true, name: true },
  });

  return NextResponse.json({ success: true, data: workspace });
}
