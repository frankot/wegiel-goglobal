-- CreateTable
CREATE TABLE "FactorCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FactorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FactorCategory_name_key" ON "FactorCategory"("name");

-- Backfill categories
INSERT INTO "FactorCategory" ("id", "name")
SELECT 'c' || substr(md5(trimmed), 1, 24), trimmed
FROM (SELECT DISTINCT trim("category") AS trimmed FROM "EmissionFactor") AS c;

-- AddColumn
ALTER TABLE "EmissionFactor" ADD COLUMN "categoryId" TEXT;

UPDATE "EmissionFactor" AS f
SET "categoryId" = c."id"
FROM "FactorCategory" AS c
WHERE c."name" = trim(f."category");

ALTER TABLE "EmissionFactor" ALTER COLUMN "categoryId" SET NOT NULL;

-- DropColumn
ALTER TABLE "EmissionFactor" DROP COLUMN "category";

-- CreateIndex
CREATE INDEX "EmissionFactor_categoryId_idx" ON "EmissionFactor"("categoryId");

-- AddForeignKey
ALTER TABLE "EmissionFactor" ADD CONSTRAINT "EmissionFactor_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FactorCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
