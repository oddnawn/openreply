/**
 * Competitor Research
 *
 * Renders the most recent outlier run pushed in via /api/ingest. The research
 * itself happens on the operator's machine — it shells out to Python and bills
 * Apify per result — so this page displays a snapshot and can enqueue a rerun,
 * but never runs the pipeline itself.
 */

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";
import ResearchView, {
  type ResearchPayload,
  type RunState,
} from "@/components/research-view";

/* Kept out of the component body: reading the clock during render is impure,
   and the lint rule that flags it is right to. */
function daysSince(when: Date): number {
  return Math.floor((Date.now() - when.getTime()) / 86_400_000);
}

export default async function ResearchPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspace = await ensureWorkspaceForUser(session.user.id, session.user.email);

  const snapshot = await prisma.ingestSnapshot.findUnique({
    where: { workspaceId_source: { workspaceId: workspace.id, source: "competitors" } },
  });

  const latestRun = await prisma.researchRun.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { requestedAt: "desc" },
  });

  const initialRun: RunState | null = latestRun
    ? {
        id: latestRun.id,
        status: latestRun.status,
        message: latestRun.message,
        requestedAt: latestRun.requestedAt.toISOString(),
      }
    : null;

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
        <div className="panel p-6">
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

  return (
    <ResearchView
      data={snapshot.payload as unknown as ResearchPayload}
      fetchedAt={snapshot.fetchedAt.toISOString()}
      ageDays={daysSince(snapshot.fetchedAt)}
      initialRun={initialRun}
    />
  );
}
