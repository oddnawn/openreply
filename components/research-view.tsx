"use client";

/**
 * Research View
 *
 * Follows the layout of the report the competitor-outliers skill generates:
 * masthead and chips, a sticky leaderboard rail, platform tabs, one hero pick
 * spanning the grid, then cards. Ported to this app's light/blue tokens rather
 * than the report's own palette, so it sits with the rest of the dashboard.
 *
 * Scores are relative to each account's own median. A pick's bar is drawn
 * against the strongest score in its platform, not against a fixed ceiling —
 * a 275x week and a 4x week should both fill the rail.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

export interface Pick {
  id: string;
  title: string;
  url: string | null;
  thumbnail: string | null;
  platform: string;
  account: string;
  account_url: string | null;
  metric: number | null;
  metric_name: string;
  baseline_median: number | null;
  outlier_score: number | null;
  age_days: number | null;
  pick_label: string | null;
  analysis: {
    hook: string | null;
    format: string | null;
    why: string | null;
    move: string | null;
    thumbnail_read: string | null;
  } | null;
}

export interface ResearchPayload {
  runDate?: string;
  totalPicks?: number;
  accounts?: number;
  byPlatform?: Record<string, number>;
  pattern?: Record<string, string> | null;
  top?: Pick[];
}

export interface RunState {
  id: string;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  message: string | null;
  requestedAt: string;
}

function compact(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "accent" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        tone === "accent"
          ? "border-transparent bg-accent/10 text-accent"
          : "border-border bg-surface text-muted"
      }`}
    >
      {children}
    </span>
  );
}

function Pill({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
        strong
          ? "bg-accent/10 text-accent"
          : "border border-border bg-surface-hover text-muted"
      }`}
    >
      {strong && <span className="block h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

function Block({
  title,
  body,
  go,
}: {
  title: string;
  body: string;
  go?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        go ? "border-accent/30 bg-accent/[0.06]" : "border-border bg-surface-hover"
      }`}
    >
      <h3 className="mb-1 text-[13px] font-bold tracking-tight text-foreground">{title}</h3>
      <p className="text-[13.5px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Card({ pick, rank, hero }: { pick: Pick; rank: number; hero?: boolean }) {
  const a = pick.analysis;
  const hook = a?.hook || pick.title || "Untitled";

  const media = pick.thumbnail ? (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface-hover">
      {hero && (
        // Fixed black rather than a theme token: this sits on a thumbnail, so
        // it needs to stay legible whatever the page theme is doing.
        <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
          Top pick
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pick.thumbnail}
        alt=""
        loading="lazy"
        className={`block w-full object-cover ${
          pick.platform === "instagram" ? "aspect-[4/5]" : "aspect-video"
        }`}
      />
    </div>
  ) : null;

  const head = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-accent/10 px-2 py-1 text-xs font-bold tabular-nums text-accent">
          {String(rank).padStart(2, "0")}
        </span>
        <span className="text-[13px] font-semibold text-muted">@{pick.account}</span>
        {a?.format && (
          <span className="ml-auto rounded-md bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
            {a.format}
          </span>
        )}
      </div>

      <p
        className={`font-semibold leading-tight tracking-tight text-balance ${
          hero ? "text-2xl" : "text-lg"
        }`}
      >
        {hook}
      </p>

      <div className="flex flex-wrap gap-1.5">
        <Pill strong>{pick.outlier_score ?? "?"}x normal</Pill>
        {pick.metric != null && (
          <Pill>
            {compact(pick.metric)} {pick.metric_name}
          </Pill>
        )}
        {pick.baseline_median != null && <Pill>usually {compact(pick.baseline_median)}</Pill>}
        {pick.age_days != null && <Pill>{pick.age_days}d ago</Pill>}
        {pick.pick_label && <Pill>{pick.pick_label}</Pill>}
      </div>
    </>
  );

  const blocks = (
    <div className="mt-auto flex flex-col gap-2 pt-1">
      {a?.why && <Block title="Why it worked" body={a.why} />}
      {a?.move && <Block title="Your move" body={a.move} go />}
      {!a?.why && !a?.move && (
        <p className="text-[13px] text-muted">
          No written analysis for this pick yet.
        </p>
      )}
    </div>
  );

  const watch = pick.url ? (
    <a
      href={pick.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-border bg-surface-hover py-2.5 text-center text-[13px] font-semibold text-muted hover:border-border-hover hover:text-foreground"
    >
      Watch on {pick.platform === "instagram" ? "Instagram" : "YouTube"}
    </a>
  ) : null;

  if (hero) {
    return (
      <article
        id={`c-${pick.id}`}
        className="panel col-span-full grid gap-5 p-5 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-3">
          {media}
          {watch}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          {head}
          {blocks}
        </div>
      </article>
    );
  }

  return (
    <article id={`c-${pick.id}`} className="panel flex flex-col gap-3 p-4">
      {media}
      {head}
      {blocks}
      {watch}
    </article>
  );
}

export default function ResearchView({
  data,
  fetchedAt,
  ageDays,
  initialRun,
}: {
  data: ResearchPayload;
  fetchedAt: string | null;
  ageDays: number | null;
  initialRun: RunState | null;
}) {
  const picks = useMemo(() => data.top ?? [], [data.top]);

  const platforms = useMemo(() => {
    const set = [...new Set(picks.map((p) => p.platform))];
    // Put the platform with the strongest pick first — that's the one worth
    // opening on.
    return set.sort((a, b) => {
      const best = (pl: string) =>
        Math.max(...picks.filter((p) => p.platform === pl).map((p) => p.outlier_score ?? 0), 0);
      return best(b) - best(a);
    });
  }, [picks]);

  const [platform, setPlatform] = useState<string>(platforms[0] ?? "youtube");
  const visible = picks.filter((p) => p.platform === platform);
  const maxScore = Math.max(...visible.map((p) => p.outlier_score ?? 0), 1);

  // Seeded from the server render rather than fetched on mount: an effect that
  // immediately setStates causes a cascading render, and the page already has
  // this data available at request time.
  const [run, setRun] = useState<RunState | null>(initialRun);
  const [starting, setStarting] = useState(false);

  const loadRun = useCallback(async () => {
    try {
      const res = await fetch("/api/research/run");
      const body = await res.json();
      if (body.success) setRun(body.data);
    } catch {
      // Status is a nicety; failing to read it shouldn't disturb the page.
    }
  }, []);

  // Only poll while something is outstanding. setState here happens in a timer
  // callback, not synchronously in the effect body.
  const pending = run?.status === "QUEUED" || run?.status === "RUNNING";
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(loadRun, 8000);
    return () => clearInterval(t);
  }, [pending, loadRun]);

  async function startRun() {
    setStarting(true);
    try {
      const res = await fetch("/api/research/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: "both", days: 30 }),
      });
      const body = await res.json();
      if (body.success) setRun(body.data);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* masthead */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm font-bold text-white">
              C
            </span>
            <h1 className="text-lg font-semibold tracking-tight">Competitor Outliers</h1>
          </div>
          <p className="mt-1.5 max-w-[68ch] text-sm text-muted">
            Every post scored against its own account&apos;s median, so a big
            channel&apos;s ordinary week can&apos;t outrank a small
            channel&apos;s breakout.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <button
            onClick={startRun}
            disabled={starting || pending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Run in progress…" : starting ? "Starting…" : "Run research"}
          </button>
          {pending && (
            <p className="max-w-[34ch] text-right text-xs text-muted">
              Queued. This runs on your own machine — it only starts once the
              watcher is running there.
            </p>
          )}
          {run?.status === "FAILED" && run.message && (
            <p className="max-w-[34ch] text-right text-xs text-error">{run.message}</p>
          )}
        </div>
      </div>

      {/* chips */}
      <div className="flex flex-wrap gap-2">
        {ageDays != null && (
          <Chip tone="accent">{ageDays === 0 ? "run today" : `run ${ageDays}d ago`}</Chip>
        )}
        <Chip>{data.accounts ?? "—"} creators</Chip>
        <Chip>{data.totalPicks ?? picks.length} picks</Chip>
        {Object.entries(data.byPlatform ?? {}).map(([p, n]) => (
          <Chip key={p}>
            {n} on {p}
          </Chip>
        ))}
        {fetchedAt && <Chip>{new Date(fetchedAt).toDateString()}</Chip>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* leaderboard rail */}
        <aside className="panel sticky top-6 hidden p-4 lg:block">
          <h2 className="mb-3 px-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">
            Leaderboard
          </h2>
          <div className="space-y-1">
            {visible.map((p) => (
              <a
                key={p.id}
                href={`#c-${p.id}`}
                className="block rounded-lg px-2 py-2 hover:bg-surface-hover"
              >
                <span className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold">{p.account}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-accent">
                    {p.outlier_score ?? "?"}x
                  </span>
                </span>
                <span className="block h-1.5 overflow-hidden rounded-full bg-surface-hover">
                  <i
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(4, ((p.outlier_score ?? 0) / maxScore) * 100)}%` }}
                  />
                </span>
              </a>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          {platforms.length > 1 && (
            <div className="mb-4 inline-flex gap-1 rounded-full bg-surface p-1">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  aria-pressed={platform === p}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
                    platform === p
                      ? "bg-accent text-white"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {p}
                  <span className="ml-1.5 opacity-60">
                    {picks.filter((x) => x.platform === p).length}
                  </span>
                </button>
              ))}
            </div>
          )}

          {data.pattern?.[platform] && (
            // Tinted surface rather than an inverted panel: an inverted block
            // assumes the page is light, and breaks outright on the dark theme.
            <div className="mb-4 rounded-xl border-l-2 border-accent bg-surface-hover p-5">
              <h2 className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.13em] text-accent">
                The pattern
              </h2>
              <p className="max-w-[74ch] text-[15px] leading-relaxed text-foreground">
                {data.pattern[platform]}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p, i) => (
              <Card key={p.id} pick={p} rank={i + 1} hero={i === 0} />
            ))}
          </div>

          {visible.length === 0 && (
            <div className="panel p-6 text-sm text-muted">
              No picks for this platform in the last run.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
