
-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'NONE');

-- AlterTable
ALTER TABLE "EmissionSource" ADD COLUMN     "billingFrequency" "BillingFrequency" NOT NULL DEFAULT 'MONTHLY';

