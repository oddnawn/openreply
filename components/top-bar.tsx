"use client";

/**
 * Top Bar
 *
 * Page title, mobile hamburger, and connection status.
 */

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New Campaign",
  "/automations": "Campaigns",
  "/automations/new": "New Campaign",
  "/inbox": "Inbox",
  "/overview": "Overview",
  "/research": "Research",
  "/logs": "DM Logs",
  "/settings": "Settings",
  "/diagnostics": "Diagnostics",
};

interface TopBarProps {
  onMenuClick: () => void;
  instagramAccountCount: number;
}

export default function TopBar({
  onMenuClick,
  instagramAccountCount,
}: TopBarProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 h-16 px-4 lg:px-8 border-b border-border bg-background">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden shrink-0 px-2.5 py-1.5 rounded border border-border text-sm text-muted hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          Menu
        </button>
        <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>
      </div>

      {/* The connected account now lives in the sidebar card, so the only thing
          left worth putting here is the call to action when there isn't one.
          Multiple accounts still get a count, since the card shows only the
          most recent. */}
      {instagramAccountCount > 1 ? (
        <p className="shrink-0 truncate text-sm text-muted">
          {instagramAccountCount} accounts
        </p>
      ) : instagramAccountCount === 1 ? null : (
        <a
          href="/api/instagram/connect"
          className="shrink-0 whitespace-nowrap text-sm font-medium px-3 py-1.5 rounded bg-accent text-white hover:bg-accent-hover"
        >
          {/* Full label needs more room than a 360px header has to spare. */}
          <span className="sm:hidden">Connect</span>
          <span className="hidden sm:inline">Connect Instagram</span>
        </a>
      )}
    </header>
  );
}
