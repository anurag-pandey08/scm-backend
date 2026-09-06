-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "truckNo" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "brokerName" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "goods" TEXT NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "weight" DECIMAL(12,3) NOT NULL,
    "advance" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "toPay" DECIMAL(12,2) NOT NULL,
    "receiveDate" DATE,
    "paidDate" DATE,
    "lrNo" TEXT NOT NULL,
    "commission" DECIMAL(12,2) NOT NULL,
    "remarks" TEXT NOT NULL,
    "partyPayment" DECIMAL(14,2) NOT NULL,
    "advanceReceiveRs" DECIMAL(12,2) NOT NULL,
    "advanceDate" DATE,
    "balanceReceiveRs" DECIMAL(12,2) NOT NULL,
    "balanceDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_date_createdAt_idx" ON "Trip"("date" DESC, "createdAt" DESC);
