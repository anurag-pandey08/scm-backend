-- CreateEnum
CREATE TYPE "LoadingSlipStatus" AS ENUM ('DRAFT', 'ISSUED', 'LOADED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "slipFloor" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "LoadingSlip" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "slipNo" TEXT NOT NULL,
    "slipDate" DATE NOT NULL,
    "party" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "weight" DECIMAL(12,3) NOT NULL,
    "totalFreight" DECIMAL(14,2) NOT NULL,
    "advance" DECIMAL(12,2) NOT NULL,
    "detention" DECIMAL(12,2) NOT NULL,
    "bedLength" DECIMAL(8,2) NOT NULL,
    "bedWidth" DECIMAL(8,2) NOT NULL,
    "bedHeight" DECIMAL(8,2) NOT NULL,
    "status" "LoadingSlipStatus" NOT NULL,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadingSlip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoadingSlip_companyId_slipDate_idx" ON "LoadingSlip"("companyId", "slipDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "LoadingSlip_companyId_slipNo_key" ON "LoadingSlip"("companyId", "slipNo");

-- AddForeignKey
ALTER TABLE "LoadingSlip" ADD CONSTRAINT "LoadingSlip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
