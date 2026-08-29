-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PAID', 'TO_PAY', 'TBB');

-- CreateEnum
CREATE TYPE "BiltyStatus" AS ENUM ('BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('OWNERS_RISK', 'CARRIERS_RISK');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "lrFloor" INTEGER NOT NULL DEFAULT 1000;

-- CreateTable
CREATE TABLE "Bilty" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "lrNo" TEXT NOT NULL,
    "lrDate" DATE NOT NULL,
    "lorryNo" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "deliveryAt" TEXT NOT NULL,
    "bookingOffice" TEXT NOT NULL,
    "consignorName" TEXT NOT NULL,
    "consignorAddress" TEXT NOT NULL,
    "consignorGstNo" TEXT NOT NULL,
    "consigneeName" TEXT NOT NULL,
    "consigneeAddress" TEXT NOT NULL,
    "consigneeGstNo" TEXT NOT NULL,
    "packages" INTEGER NOT NULL,
    "contents" TEXT NOT NULL,
    "actualWeight" DECIMAL(12,3) NOT NULL,
    "chargedWeight" DECIMAL(12,3) NOT NULL,
    "declaredValue" DECIMAL(14,2) NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "freight" DECIMAL(12,2) NOT NULL,
    "aoc" DECIMAL(12,2) NOT NULL,
    "hamali" DECIMAL(12,2) NOT NULL,
    "stCharges" DECIMAL(12,2) NOT NULL,
    "otherCharges" DECIMAL(12,2) NOT NULL,
    "advance" DECIMAL(12,2) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "status" "BiltyStatus" NOT NULL,
    "risk" "RiskType" NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "eWayBillNo" TEXT NOT NULL,
    "insuranceCompany" TEXT NOT NULL,
    "insurancePolicyNo" TEXT NOT NULL,
    "insuranceDate" DATE,
    "insuranceAmount" DECIMAL(14,2) NOT NULL,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bilty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bilty_companyId_lrDate_idx" ON "Bilty"("companyId", "lrDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Bilty_companyId_lrNo_key" ON "Bilty"("companyId", "lrNo");

-- AddForeignKey
ALTER TABLE "Bilty" ADD CONSTRAINT "Bilty_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
