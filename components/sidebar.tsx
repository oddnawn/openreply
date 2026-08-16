"use client";

/**
 * Sidebar Navigation
 *
 * Connected-account card at the top, then icon nav grouped by dashed rules.
 * Grouping is by how often a thing is opened, not by feature area: the daily
 * surfaces sit above the first rule, the things you configure once sit below
 * the last one.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/actions/session";

/* Icons are inline rather than a package: eight 20px glyphs is not worth a
   dependency, and inlining keeps them on the same stroke and grid. */
const icon = "h-[18px] w-[18px] shrink-0";

function IconGrid() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M3 17V9M8 17V4M13 17v-5M18 17v-9" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 10.5V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v5.5M2.5 10.5h4l1 2h5l1-2h4M2.5 10.5V15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4.5" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
      <path d="m3 6 7 4.5L17 6" />
    </svg>
  );
}

function IconResearch() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.5 13.5 3.5 3.5M7 9.5l1.5 1.5L11.5 7" />
    </svg>
  );
}

function IconMegaphone() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M3 8v4a1.5 1.5 0 0 0 1.5 1.5H6l8 3.5V4L6 7.5H4.5A1.5 1.5 0 0 0 3 9ZM6 13.5V7.5M16.5 8.5v3" />
    </svg>
  );
}

function IconList() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M7 5.5h10M7 10h10M7 14.5h10M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7" strokeLinecap="round" />
    </svg>
  );
}

function IconPulse() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 10h3l2-5 3.5 10 2-5h4.5" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg className={icon} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3H9v14H4.5A1.5 1.5 0 0 1 3 15.5ZM17 4.5A1.5 1.5 0 0 0 15.5 3H11v14h4.5a1.5 1.5 0 0 0 1.5-1.5Z" />
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  Icon: () => React.ReactElement;
}

// Each inner array is one group; a dashed rule is drawn between groups.
const navGroups: NavItem[][] = [
  [
    { label: "Dashboard", href: "/dashboard", Icon: IconGrid },
    { label: "Overview", href: "/overview", Icon: IconChart },
    { label: "Inbox", href: "/inbox", Icon: IconInbox },
    { label: "Mail", href: "/mail", Icon: IconMail },
    { label: "Research", href: "/research", Icon: IconResearch },
  ],
  [
    { label: "Campaigns", href: "/campaigns", Icon: IconMegaphone },
    { label: "DM Logs", href: "/logs", Icon: IconList },
  ],
  [
    { label: "Settings", href: "/settings", Icon: IconGear },
    { label: "Diagnostics", href: "/diagnostics", Icon: IconPulse },
    { label: "Tutorial", href: "/tutorial", Icon: IconBook },
  ],
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
  instagramUsername: string | null;
  profilePictureUrl: string | null;
  userEmail: string | null;
}

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
  instagramUsername,
  profilePictureUrl,
  userEmail,
}: SidebarProps) {
  const pathname = usePathname();
  const displayName = instagramUsername ? `@${instagramUsername}` : workspaceName;
  const initial = (instagramUsername ?? workspaceName ?? "?").charAt(0).toUpperCase();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape — a menu that can only be dismissed by
  // reopening it feels broken.
  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-dvh w-64 max-w-[85vw] shrink-0 bg-surface border-r border-border flex flex-col
          transition-transform duration-200 ease-out
          lg:h-full lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Connected account. This is the first thing on the page because it
            answers "whose data am I looking at" before anything else. */}
        <div className="relative p-3" ref={menuRef} data-tour="account">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left hover:border-border-hover"
          >
            {profilePictureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profilePictureUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                {initial}
              </span>
            )}

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              <span className="block truncate text-xs text-muted">
                {userEmail ?? "Not connected"}
              </span>
            </span>

            <svg
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${menuOpen ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="m4 6 4 4 4-4" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="panel absolute left-3 right-3 top-[calc(100%-0.25rem)] z-50 overflow-hidden p-1"
            >
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onClose();
                }}
                className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
              >
                Settings
              </Link>
              <Link
                href="/tutorial"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onClose();
                }}
                className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-hover hover:text-foreground"
              >
                How to use this
              </Link>

              <div className="nav-divider" />

              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-error hover:bg-surface-hover"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {navGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {groupIndex > 0 && <div className="nav-divider" />}

              <div className="space-y-1">
                {group.map(({ label, href, Icon }) => {
                  const isActive =
                    pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      aria-current={isActive ? "page" : undefined}
                      // The onboarding tour finds its targets by this rather
                      // than by class, so restyling the nav can't break it.
                      data-tour={href.replace("/", "")}
                      className={`
                        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
                        ${
                          isActive
                            ? "bg-surface-hover font-medium text-foreground"
                            : "text-muted hover:bg-surface-hover hover:text-foreground"
                        }
                      `}
                    >
                      <Icon />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-border px-5 py-4">
          <p className="truncate text-sm text-foreground">{workspaceName}</p>
          <p className="text-xs text-muted">Self-hosted</p>
        </div>
      </aside>
    </>
  );
}
