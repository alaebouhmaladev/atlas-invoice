-- CreateEnum
CREATE TYPE "CompanyAssetType" AS ENUM ('LOGO', 'SIGNATURE', 'STAMP');

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "companySnapshot" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedById" TEXT,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "singletonKey" TEXT NOT NULL DEFAULT 'DEFAULT',
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "legalForm" TEXT,
    "address" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Maroc',
    "ice" TEXT,
    "taxId" TEXT,
    "rc" TEXT,
    "cnss" TEXT,
    "patent" TEXT,
    "phone" TEXT,
    "secondaryPhone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bankName" TEXT,
    "accountHolder" TEXT,
    "rib" TEXT,
    "iban" TEXT,
    "swiftBic" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "defaultQuoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "defaultInvoiceDueDays" INTEGER NOT NULL DEFAULT 30,
    "defaultPaymentTerms" TEXT,
    "defaultQuoteNotes" TEXT,
    "defaultInvoiceNotes" TEXT,
    "quotePrefix" TEXT NOT NULL DEFAULT 'DEV',
    "invoicePrefix" TEXT NOT NULL DEFAULT 'FAC',
    "showSignatureOnPaidInvoice" BOOLEAN NOT NULL DEFAULT true,
    "showStampOnPaidInvoice" BOOLEAN NOT NULL DEFAULT true,
    "showLogoOnDocuments" BOOLEAN NOT NULL DEFAULT true,
    "activeLogoAssetId" TEXT,
    "activeSignatureAssetId" TEXT,
    "activeStampAssetId" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAsset" (
    "id" TEXT NOT NULL,
    "type" "CompanyAssetType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sha256" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_singletonKey_key" ON "CompanySettings"("singletonKey");

-- CreateIndex
CREATE INDEX "CompanyAsset_type_idx" ON "CompanyAsset"("type");

-- CreateIndex
CREATE INDEX "CompanyAsset_sha256_idx" ON "CompanyAsset"("sha256");

-- CreateIndex
CREATE INDEX "CompanyAsset_createdAt_idx" ON "CompanyAsset"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deactivatedById_fkey" FOREIGN KEY ("deactivatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAsset" ADD CONSTRAINT "CompanyAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
