/**
 * Where this app lives, and why Auth.js is not told.
 *
 * Auth.js prefers AUTH_URL / NEXTAUTH_URL over the incoming request's host. That
 * is a footgun for a self-hosted deployment whose domain can change: point a
 * custom domain at the project, and the old value keeps building sign-in links
 * for a host the user is not on. The cookie lands somewhere they never visit and
 * they appear signed out — or, if the old alias has been detached, the link 404s
 * and sign-in becomes impossible.
 *
 * That is not hypothetical. It happened here: a custom domain was made primary,
 * Vercel detached the *.vercel.app alias, and every magic link pointed at a dead
 * host until this module existed.
 *
 * So the variables are read once and then removed from the environment. With
 * `trustHost: true` in the auth config, Auth.js falls back to the forwarded host
 * — which is, by definition, the domain the user is actually browsing. Sign-in
 * then follows the domain automatically and no env var can desynchronise it.
 *
 * Link building still needs an absolute URL with no request in scope (a worker
 * composing a DM has no headers), which is what getPublicBaseUrl is for.
 */

// Captured before the delete below. Every consumer imports this module, so this
// runs before anything can read the raw variables.
const configured = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

// Guarded because this module is reachable from client bundles, where `process`
// is a shim and mutating it is meaningless at best.
if (typeof window === "undefined") {
  delete process.env.AUTH_URL;
  delete process.env.NEXTAUTH_URL;
}

/**
 * Absolute base URL for links that outlive the request that made them —
 * tracked links inside DMs, share links, invitations.
 *
 * Vercel's own production-domain variable wins over the configured value,
 * because the configured one is exactly what goes stale after a domain change.
 * It resolves to the custom domain once one is primary.
 */
export function getPublicBaseUrl(): string {
  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProduction) {
    return `https://${vercelProduction.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  }
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

/** What was configured, for diagnostics that want to report drift. */
export function getConfiguredUrl(): string | undefined {
  return configured;
}
