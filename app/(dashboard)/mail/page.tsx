"use client";

/**
 * Mail
 *
 * Gmail, triaged into the same buckets as the Instagram inbox, with a one-line
 * summary per message so the list can be read without opening anything.
 *
 * Archive and mark-read are optimistic — the row updates immediately and only
 * reverts if Gmail rejects it. Waiting a round trip to acknowledge a click on
 * a list you are clearing makes it feel broken.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { TriagedMail } from "@/app/api/gmail/threads/route";
import type { Category } from "@/lib/mail/triage";

/**
 * The ?error= the OAuth callback redirects back with.
 *
 * Read through useSearchParams rather than an effect: reading location and
 * setting state on mount is a cascading render, and this is exactly what the
 * hook exists for. Needs a Suspense boundary or the production build fails.
 */
function CallbackError() {
  const failed = useSearchParams().get("error");
  if (!failed) return null;
  return <div className="panel border-error/40 p-4 text-sm text-error">{failed}</div>;
}

interface CategoryMeta {
  label: string;
  blurb: string;
  accent: string;
  priority: number;
}

interface Payload {
  connected: boolean;
  email?: string;
  items?: TriagedMail[];
  counts?: Record<Category, number>;
  categories: Record<Category, CategoryMeta>;
  redirectUri?: string;
}

const FILTERS = [
  { id: "inbox", label: "Inbox" },
  { id: "unread", label: "Unread" },
  { id: "starred", label: "Starred" },
];

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / 1440)}d`;
}

export default function MailPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("inbox");
  const [category, setCategory] = useState<Category | "all">("all");
  const [busy, setBusy] = useState<string | null>(null);

  // Deliberately no synchronous setState in here — the effect below calls it,
  // and setting state in an effect body triggers a cascading render. The
  // spinner is turned on by whatever initiates the change instead.
  const load = useCallback((next: string) => {
    fetch(`/api/gmail/threads?filter=${next}`)
      .then((r) => r.json())
      .then((body) => {
        if (body.success) {
          setData(body.data);
          setError(null);
        } else {
          setError(body.error ?? "Could not load mail");
        }
      })
      .catch(() => setError("Could not reach the server"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  async function act(id: string, action: "archive" | "read") {
    setBusy(id);
    // Drop the row (archive) or clear the dot (read) before the request lands.
    const before = data;
    setData((d) =>
      d?.items
        ? {
            ...d,
            items:
              action === "archive"
                ? d.items.filter((i) => i.id !== id)
                : d.items.map((i) => (i.id === id ? { ...i, unread: false } : i)),
          }
        : d
    );

    try {
      const res = await fetch("/api/gmail/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const body = await res.json();
      if (!body.success) {
        setData(before ?? null);
        setError(body.error ?? "Gmail rejected that");
      }
    } catch {
      setData(before ?? null);
      setError("Could not reach Gmail");
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    await fetch("/api/gmail/disconnect", { method: "POST" });
    load(filter);
  }

  if (loading && !data) {
    return <div className="panel h-64 rounded p-8" />;
  }

  if (data && !data.connected) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Mail</h1>
          <p className="mt-1 text-sm text-muted">
            Your Gmail, sorted into the same buckets as your DMs.
          </p>
        </div>

        <Suspense fallback={null}>
          <CallbackError />
        </Suspense>
        {error && <div className="panel border-error/40 p-4 text-sm text-error">{error}</div>}

        <div className="panel p-6">
          <p className="text-sm font-medium">Gmail isn&apos;t connected</p>
          <p className="mt-2 text-sm text-muted">
            Read-only plus archive and mark-read. It cannot send mail and cannot
            delete anything.
          </p>
          <a
            href="/api/gmail/connect"
            className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
          >
            Connect Gmail
          </a>

          {data.redirectUri && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs text-muted">
                If Google says <code>redirect_uri_mismatch</code>, add this exact
                string to Authorized redirect URIs in the Google Cloud console:
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-surface-hover p-3 text-xs">
                {data.redirectUri}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  const cats = data?.categories ?? ({} as Record<Category, CategoryMeta>);
  const items = (data?.items ?? []).filter((i) => category === "all" || i.category === category);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Mail</h1>
          <p className="mt-1 text-sm text-muted">
            {data?.email}
            {" · "}sorted into the same buckets as your DMs
          </p>
        </div>
        <button
          onClick={disconnect}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-border-hover hover:text-foreground"
        >
          Disconnect
        </button>
      </div>

      {error && <div className="panel border-error/40 p-4 text-sm text-error">{error}</div>}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setLoading(true);
              setFilter(f.id);
            }}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              filter === f.id ? "bg-accent text-white" : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("all")}
          aria-pressed={category === "all"}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            category === "all" ? "border-accent text-accent" : "border-border text-muted"
          }`}
        >
          All <span className="opacity-60">{data?.items?.length ?? 0}</span>
        </button>
        {(Object.entries(cats) as [Category, CategoryMeta][])
          .sort((a, b) => a[1].priority - b[1].priority)
          .map(([key, meta]) => {
            const n = data?.counts?.[key] ?? 0;
            if (!n) return null;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                aria-pressed={category === key}
                title={meta.blurb}
                style={{ color: meta.accent }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  category === key ? "border-current" : "border-border"
                }`}
              >
                {meta.label} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
      </div>

      <div className="flex flex-col gap-2">
        {items.map((m) => {
          const meta = cats[m.category];
          return (
            <article
              key={m.id}
              className={`panel flex gap-3 p-4 ${busy === m.id ? "opacity-50" : ""}`}
            >
              <span
                className="w-1 shrink-0 rounded-full"
                style={{ background: meta?.accent ?? "var(--color-border)" }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold">{m.fromName || m.from}</span>
                  {m.unread && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ color: meta?.accent, background: `${meta?.accent}1a` }}
                  >
                    {meta?.label}
                  </span>
                  <span className="ml-auto text-xs text-muted">{ago(m.date)}</span>
                </div>

                <p className="mt-1 truncate text-sm font-medium">{m.subject}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{m.summary}</p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-accent hover:underline"
                  >
                    Open in Gmail
                  </a>
                  {m.unread && (
                    <button onClick={() => act(m.id, "read")} className="text-muted hover:text-foreground">
                      Mark read
                    </button>
                  )}
                  <button onClick={() => act(m.id, "archive")} className="text-muted hover:text-foreground">
                    Archive
                  </button>
                  {m.confidence > 0 && m.confidence < 0.5 && (
                    <span className="text-muted" title={m.signals.join(", ")}>
                      low confidence
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!items.length && (
          <div className="panel p-6 text-sm text-muted">
            {loading ? "Loading…" : "Nothing here."}
          </div>
        )}
      </div>
    </div>
  );
}
