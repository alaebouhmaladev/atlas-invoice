-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'ONBOARDING', 'SUSPENDED', 'DEPARTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'HR_MANAGER';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorDisplayNameSnapshot" TEXT,
ADD COLUMN     "actorRoleSnapshot" "Role",
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "changedFields" JSONB,
ADD COLUMN     "entityReference" TEXT,
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "result" TEXT NOT NULL DEFAULT 'SUCCESS';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedById" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedById" TEXT;

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "recipientRole" "Role",
    "type" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "deduplicationKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "photoAssetId" TEXT,
    "gender" "Gender",
    "birthDate" TIMESTAMP(3),
    "birthPlace" TEXT,
    "nationality" TEXT DEFAULT 'Marocaine',
    "cinEncrypted" TEXT,
    "cinFingerprint" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Maroc',
    "phonePrimary" TEXT NOT NULL,
    "phoneSecondary" TEXT,
    "personalEmail" TEXT,
    "professionalEmail" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactRelationship" TEXT,
    "emergencyContactPhone" TEXT,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "departureDate" TIMESTAMP(3),
    "departureReason" TEXT,
    "baseSalary" DECIMAL(12,2) DEFAULT 0,
    "salaryCurrency" TEXT NOT NULL DEFAULT 'MAD',
    "paymentMethod" "PaymentMethod",
    "bankName" TEXT,
    "ribEncrypted" TEXT,
    "cnssNumberEncrypted" TEXT,
    "internalNotes" TEXT,
    "linkedUserId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppNotification_recipientUserId_isRead_createdAt_idx" ON "AppNotification"("recipientUserId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AppNotification_recipientRole_isRead_createdAt_idx" ON "AppNotification"("recipientRole", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AppNotification_deduplicationKey_idx" ON "AppNotification"("deduplicationKey");

-- CreateIndex
CREATE INDEX "AppNotification_severity_createdAt_idx" ON "AppNotification"("severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cinFingerprint_key" ON "Employee"("cinFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_linkedUserId_key" ON "Employee"("linkedUserId");

-- CreateIndex
CREATE INDEX "Employee_employmentStatus_idx" ON "Employee"("employmentStatus");

-- CreateIndex
CREATE INDEX "Employee_archivedAt_idx" ON "Employee"("archivedAt");

-- CreateIndex
CREATE INDEX "Employee_lastName_firstName_idx" ON "Employee"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Employee_hireDate_idx" ON "Employee"("hireDate");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_result_idx" ON "AuditLog"("result");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

