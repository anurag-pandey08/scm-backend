-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'RAISED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LineKind" AS ENUM ('FREIGHT', 'CHARGE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "billFloor" INTEGER NOT NULL DEFAULT 500;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "billNo" TEXT NOT NULL,
    "billDate" DATE NOT NULL,
    "partyName" TEXT NOT NULL,
    "partyAddress" TEXT NOT NULL,
    "partyGstNo" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "partyInvoiceNo" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "paidOn" DATE,
    "remarks" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "LineKind" NOT NULL,
    "challanNo" TEXT NOT NULL,
    "date" DATE,
    "particulars" TEXT NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "weight" DECIMAL(12,3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invoice_companyId_billDate_idx" ON "Invoice"("companyId", "billDate" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_billNo_key" ON "Invoice"("companyId", "billNo");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_position_idx" ON "InvoiceLine"("invoiceId", "position");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
