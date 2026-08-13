-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('COMPANY', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "type" "ClientType" NOT NULL DEFAULT 'COMPANY',
    "companyName" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT NOT NULL,
    "ice" TEXT,
    "taxId" TEXT,
    "rc" TEXT,
    "cnss" TEXT,
    "patent" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "secondaryPhone" TEXT,
    "address" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Maroc',
    "contactName" TEXT,
    "contactPosition" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Client_displayName_idx" ON "Client"("displayName");

-- CreateIndex
CREATE INDEX "Client_companyName_idx" ON "Client"("companyName");

-- CreateIndex
CREATE INDEX "Client_firstName_idx" ON "Client"("firstName");

-- CreateIndex
CREATE INDEX "Client_lastName_idx" ON "Client"("lastName");

-- CreateIndex
CREATE INDEX "Client_ice_idx" ON "Client"("ice");

-- CreateIndex
CREATE INDEX "Client_taxId_idx" ON "Client"("taxId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE INDEX "Client_city_idx" ON "Client"("city");

-- CreateIndex
CREATE INDEX "Client_isArchived_idx" ON "Client"("isArchived");

-- CreateIndex
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
