-- AlterTable
ALTER TABLE "EmissionEntry" ADD COLUMN     "originalQuantity" DECIMAL(14,4),
ADD COLUMN     "originalUnit" TEXT,
ALTER COLUMN "co2eTon" SET DATA TYPE DECIMAL(16,6);

-- AlterTable
ALTER TABLE "EmissionSource" ADD COLUMN     "meterNumber" TEXT,
ADD COLUMN     "ppeNumber" TEXT,
ADD COLUMN     "supplierNip" TEXT;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "source",
DROP COLUMN "sourceFileUrl",
ADD COLUMN     "buyerNip" TEXT,
ADD COLUMN     "ksefNumber" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "rawPayload" JSONB,
ADD COLUMN     "sourceFormat" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "supplierName" TEXT,
ADD COLUMN     "supplierNip" TEXT,
ADD COLUMN     "uploadedById" TEXT;

-- CreateTable
CREATE TABLE "InvoiceAttachment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "blobUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceAttachment_invoiceId_idx" ON "InvoiceAttachment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmissionSource_ppeNumber_key" ON "EmissionSource"("ppeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_ksefNumber_key" ON "Invoice"("ksefNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_supplierNip_invoiceNumber_key" ON "Invoice"("supplierNip", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

