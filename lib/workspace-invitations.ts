import { randomBytes } from "node:crypto";
import { getPublicBaseUrl } from "@/lib/public-url";

const INVITE_TTL_DAYS = 14;

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateInvitationToken() {
  return randomBytes(18).toString("base64url");
}

export function getInvitationExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
  return expiresAt;
}

export function buildInvitationUrl(token: string, baseUrl?: string) {
  const resolvedBaseUrl =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : getPublicBaseUrl());

  return `${resolvedBaseUrl.replace(/\/$/, "")}/invite/${token}`;
}

