/**
 * Competitor Research
 *
 * Renders the most recent outlier run pushed in via /api/ingest. The research
 * itself happens on the operator's machine — it reads local run folders and
 * costs Apify credits — so this page only ever displays a snapshot. It never
 * triggers a run.
 *
 * Scores are relative to each account's own median, not raw views: 50K views on
 * a channel that always does 50K is not a signal. Anything past ~3x is.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";

interface Pick {
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

interface ResearchPayload {
  runDate?: string;
  ageDays?: number;
  stale?: boolean;
  totalPicks?: number;
  accounts?: number;
  byPlatform?: Record<string, number>;
  top?: Pick[];
}

/* Kept out of the component body: reading the clock during render is impure,
   and the lint rule that flags it is right to. */
function daysSince(when: Date): number {
  return Math.floor((Date.now() - when.getTime()) / 86_400_000);
}

function Stat({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="panel rounded p-4">
      <div className="text-xs font-semibold text-muted uppercase tracking-wider">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${dim ? "text-muted" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

export default async function ResearchPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await ensureWorkspaceForUser(session.user.id, session.user.email);

  const snapshot = await prisma.ingestSnapshot.findUnique({
    where: { workspaceId_source: { workspaceId: workspace.id, source: "competitors" } },
  });

  if (!snapshot) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Competitor research</h1>
          <p className="mt-1 text-sm text-muted">
            Breakout posts across your competitor list, scored against each
            account&apos;s own median.
          </p>
        </div>
        <div className="panel rounded p-6">
          <p className="text-sm font-medium">Nothing pushed yet</p>
          <p className="mt-2 text-sm text-muted">
            Research runs on your machine and is pushed here. From the
            command-center project, run:
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-surface-hover p-3 text-xs">
            npm run collect &amp;&amp; npm run push
          </pre>
        </div>
      </div>
    );
  }

  const data = snapshot.payload as unknown as ResearchPayload;
  const picks = data.top ?? [];

  // Judge staleness against when the research was gathered, not when it was
  // uploaded — re-pushing an old run must not make it look fresh.
  const ageDays = daysSince(new Date(snapshot.fetchedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Competitor research</h1>
        <p className="mt-1 text-sm text-muted">
          Breakout posts across your competitor list, scored against each
          account&apos;s own median.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat
          label="Last run"
          value={ageDays === 0 ? "today" : `${ageDays}d ago`}
          dim={ageDays > 9}
        />
        <Stat label="Picks" value={String(data.totalPicks ?? picks.length)} />
        <Stat label="Accounts" value={String(data.accounts ?? "—")} />
        <Stat
          label="Best outlier"
          value={picks[0]?.outlier_score ? `${Math.round(picks[0].outlier_score)}x` : "—"}
        />
      </div>

      {ageDays > 9 && (
        <div className="panel rounded p-4 text-sm text-warning">
          This run is {ageDays} days old. Re-run the research for a current read.
        </div>
      )}

      <div className="space-y-3">
        {picks.map((pick) => (
          <article key={pick.id} className="panel rounded p-4">
            <div className="flex gap-4">
              {pick.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pick.thumbnail}
                  alt=""
                  loading="lazy"
                  className="hidden sm:block h-[68px] w-[120px] flex-none rounded object-cover bg-surface-hover"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-lg font-semibold text-accent tabular-nums">
                    {pick.outlier_score ? `${pick.outlier_score}x` : "—"}
                  </span>
                  <span className="text-xs text-muted uppercase tracking-wider">
                    {pick.platform}
                  </span>
                  {pick.pick_label && (
                    <span className="text-xs text-muted">· {pick.pick_label}</span>
                  )}
                </div>

                <h2 className="mt-1 font-medium leading-snug">
                  {pick.url ? (
                    <a
                      href={pick.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-accent"
                    >
                      {pick.title}
                    </a>
                  ) : (
                    pick.title
                  )}
                </h2>

                <p className="mt-1 text-sm text-muted">
                  {pick.account}
                  {pick.metric != null && (
                    <>
                      {" · "}
                      {pick.metric.toLocaleString()} {pick.metric_name}
                    </>
                  )}
                  {pick.baseline_median != null && (
                    <> · baseline {pick.baseline_median.toLocaleString()}</>
                  )}
                  {pick.age_days != null && <> · {pick.age_days}d old</>}
                </p>

                {pick.analysis?.why && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted">Why it worked. </span>
                    {pick.analysis.why}
                  </p>
                )}
                {pick.analysis?.move && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted">Your move. </span>
                    {pick.analysis.move}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
