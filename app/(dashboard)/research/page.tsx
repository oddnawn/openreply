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
        {/* Snapshots are stored per workspace, so this is what a new account
            sees: their own empty page, never someone else's research. */}
        <div className="panel p-6">
          <p className="text-sm font-medium">No research yet</p>
          <p className="mt-2 max-w-[62ch] text-sm text-muted">
            This page fills up once a research run has been done for your own
            competitor list. Results are private to your workspace — you will
            never see another account&apos;s research here, and they will never
            see yours.
          </p>
          <p className="mt-3 max-w-[62ch] text-sm text-muted">
            Runs happen on a connected machine rather than on this website,
            because pulling the data needs tools a web server can&apos;t run.
            Once one is set up and connected, the Run research button appears
            here.
          </p>
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
