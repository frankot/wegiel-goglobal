
-- CreateTable
CREATE TABLE "ArchivedReport" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "query" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "includesDrafts" BOOLEAN NOT NULL DEFAULT false,
    "totalCo2eKg" DECIMAL(18,6) NOT NULL,
    "entryCount" INTEGER NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivedReportFile" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "size" INTEGER NOT NULL,

    CONSTRAINT "ArchivedReportFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArchivedReport_createdAt_idx" ON "ArchivedReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArchivedReportFile_reportId_format_key" ON "ArchivedReportFile"("reportId", "format");

-- AddForeignKey
ALTER TABLE "ArchivedReport" ADD CONSTRAINT "ArchivedReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedReportFile" ADD CONSTRAINT "ArchivedReportFile_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ArchivedReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

