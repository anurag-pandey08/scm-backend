-- CreateTable
CREATE TABLE "Company" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monogram" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "lrTagline" TEXT NOT NULL,
    "billTagline" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "officeLine" TEXT NOT NULL,
    "emailLr" TEXT NOT NULL,
    "emailBill" TEXT NOT NULL,
    "phones" TEXT[],
    "pan" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankBranch" TEXT NOT NULL,
    "bankAccountNo" TEXT NOT NULL,
    "bankIfsc" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "bookingOffices" TEXT[],
    "accentClass" TEXT NOT NULL,
    "detailsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
