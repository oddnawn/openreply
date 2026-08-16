import { NextResponse } from "next/server";
import { getCurrentWorkspaceId } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { decryptToken } from "@/lib/meta/oauth";
import { revokeToken } from "@/lib/google/oauth";

/**
 * Disconnect Gmail: revoke at Google, then delete locally.
 *
 * Revoke first so a failure to delete does not leave a live token, and delete
 * regardless of whether revoke succeeded — a stored token the operator has
 * asked us to forget should not survive Google being unreachable.
 */
export async function POST() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.googleConnection.findMany({ where: { workspaceId } });

  for (const conn of connections) {
    // The refresh token is the durable grant; revoking it invalidates the
    // access token too. Fall back to the access token if none was issued.
    const token = conn.refreshToken ?? conn.accessToken;
    try {
      await revokeToken(decryptToken(token));
    } catch {
      // Already revoked, or Google is down. Local deletion still proceeds.
    }
  }

  await prisma.googleConnection.deleteMany({ where: { workspaceId } });

  return NextResponse.json({ success: true, removed: connections.length });
}
