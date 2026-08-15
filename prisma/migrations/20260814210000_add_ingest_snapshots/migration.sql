-- CreateTable
CREATE TABLE "IngestSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IngestSnapshot_workspaceId_idx" ON "IngestSnapshot"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "IngestSnapshot_workspaceId_source_key" ON "IngestSnapshot"("workspaceId", "source");

-- AddForeignKey
ALTER TABLE "IngestSnapshot" ADD CONSTRAINT "IngestSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
