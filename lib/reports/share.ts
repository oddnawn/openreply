import { randomBytes } from "node:crypto";
import { getPublicBaseUrl } from "@/lib/public-url";

export function generateReportShareSlug() {
  return randomBytes(9).toString("base64url");
}

export function buildReportUrl(slug: string, baseUrl?: string) {
  const resolvedBaseUrl =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : getPublicBaseUrl());

  return `${resolvedBaseUrl.replace(/\/$/, "")}/reports/${slug}`;
}

// Self-hosted build: reports are never branded.
export function isReportBranded() {
  return false;
}
