-- DropIndex
DROP INDEX IF EXISTS "Employee_archivedAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Employee_cinFingerprint_key";

-- DropIndex
DROP INDEX IF EXISTS "Employee_employeeNumber_key";

-- DropIndex
DROP INDEX IF EXISTS "Employee_employmentStatus_idx";

-- DropIndex
DROP INDEX IF EXISTS "Employee_hireDate_idx";

-- DropIndex
DROP INDEX IF EXISTS "Employee_lastName_firstName_idx";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'default-tenant';

-- CreateIndex
CREATE INDEX "Employee_tenantId_idx" ON "Employee"("tenantId");

-- CreateIndex
CREATE INDEX "Employee_tenantId_employmentStatus_idx" ON "Employee"("tenantId", "employmentStatus");

-- CreateIndex
CREATE INDEX "Employee_tenantId_archivedAt_idx" ON "Employee"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "Employee_tenantId_lastName_firstName_idx" ON "Employee"("tenantId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Employee_tenantId_hireDate_idx" ON "Employee"("tenantId", "hireDate");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_employeeNumber_key" ON "Employee"("tenantId", "employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_cinFingerprint_key" ON "Employee"("tenantId", "cinFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tenantId_linkedUserId_key" ON "Employee"("tenantId", "linkedUserId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
