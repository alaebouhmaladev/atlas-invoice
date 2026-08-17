-- CreateEnum
CREATE TYPE "SiteType" AS ENUM ('HEAD_OFFICE', 'RESTAURANT', 'CENTRAL_KITCHEN', 'CATERING_SITE', 'CLIENT_SITE', 'WAREHOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('PERMANENT', 'TEMPORARY', 'SECONDARY', 'TRANSFER', 'ACTING');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDI', 'CDD', 'TEMPORARY', 'INTERNSHIP', 'PART_TIME', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'RENEWED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('CIN', 'CONTRACT', 'CNSS', 'RIB', 'MEDICAL', 'DIPLOMA', 'WARNING', 'RESIGNATION', 'TERMINATION', 'WORK_PERMIT', 'OTHER');

-- CreateTable
CREATE TABLE "WorkSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SiteType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Maroc',
    "phone" TEXT,
    "email" TEXT,
    "managerEmployeeId" TEXT,
    "openingDate" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WorkSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerEmployeeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsibilities" TEXT,
    "isManagerial" BOOLEAN NOT NULL DEFAULT false,
    "standardWeeklyMinutes" INTEGER DEFAULT 2640,
    "salaryReferenceMin" DECIMAL(12,2),
    "salaryReferenceMax" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "managerEmployeeId" TEXT,
    "assignmentType" "AssignmentType" NOT NULL DEFAULT 'PERMANENT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "reason" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "endedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EmployeeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "contractType" "ContractType" NOT NULL DEFAULT 'CDI',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "trialStartDate" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "terminationReason" TEXT,
    "renewedFromContractId" TEXT,
    "siteId" TEXT,
    "departmentId" TEXT,
    "positionId" TEXT,
    "managerEmployeeId" TEXT,
    "salarySnapshot" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "standardWeeklyMinutes" INTEGER DEFAULT 2640,
    "employeeNameSnapshot" TEXT NOT NULL,
    "employeeNumberSnapshot" TEXT NOT NULL,
    "siteSnapshot" TEXT,
    "departmentSnapshot" TEXT,
    "positionSnapshot" TEXT,
    "companySnapshot" JSONB,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "contractId" TEXT,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documentNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isConfidential" BOOLEAN NOT NULL DEFAULT true,
    "currentVersionId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocumentVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "assetId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "safeDisplayName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "replacementReason" TEXT,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkSite_tenantId_idx" ON "WorkSite"("tenantId");
CREATE INDEX "WorkSite_tenantId_isActive_idx" ON "WorkSite"("tenantId", "isActive");
CREATE INDEX "WorkSite_tenantId_type_idx" ON "WorkSite"("tenantId", "type");
CREATE INDEX "WorkSite_tenantId_archivedAt_idx" ON "WorkSite"("tenantId", "archivedAt");
CREATE UNIQUE INDEX "WorkSite_tenantId_code_key" ON "WorkSite"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");
CREATE INDEX "Department_tenantId_isActive_idx" ON "Department"("tenantId", "isActive");
CREATE INDEX "Department_tenantId_archivedAt_idx" ON "Department"("tenantId", "archivedAt");
CREATE UNIQUE INDEX "Department_tenantId_code_key" ON "Department"("tenantId", "code");

-- CreateIndex
CREATE INDEX "Position_tenantId_idx" ON "Position"("tenantId");
CREATE INDEX "Position_tenantId_departmentId_idx" ON "Position"("tenantId", "departmentId");
CREATE INDEX "Position_tenantId_isActive_idx" ON "Position"("tenantId", "isActive");
CREATE INDEX "Position_tenantId_archivedAt_idx" ON "Position"("tenantId", "archivedAt");
CREATE UNIQUE INDEX "Position_tenantId_code_key" ON "Position"("tenantId", "code");

-- CreateIndex
CREATE INDEX "EmployeeAssignment_tenantId_idx" ON "EmployeeAssignment"("tenantId");
CREATE INDEX "EmployeeAssignment_tenantId_employeeId_isPrimary_idx" ON "EmployeeAssignment"("tenantId", "employeeId", "isPrimary");
CREATE INDEX "EmployeeAssignment_tenantId_siteId_idx" ON "EmployeeAssignment"("tenantId", "siteId");
CREATE INDEX "EmployeeAssignment_tenantId_departmentId_idx" ON "EmployeeAssignment"("tenantId", "departmentId");
CREATE INDEX "EmployeeAssignment_tenantId_positionId_idx" ON "EmployeeAssignment"("tenantId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentContract_renewedFromContractId_key" ON "EmploymentContract"("renewedFromContractId");
CREATE INDEX "EmploymentContract_tenantId_idx" ON "EmploymentContract"("tenantId");
CREATE INDEX "EmploymentContract_tenantId_employeeId_idx" ON "EmploymentContract"("tenantId", "employeeId");
CREATE INDEX "EmploymentContract_tenantId_status_idx" ON "EmploymentContract"("tenantId", "status");
CREATE INDEX "EmploymentContract_tenantId_endDate_idx" ON "EmploymentContract"("tenantId", "endDate");
CREATE UNIQUE INDEX "EmploymentContract_tenantId_contractNumber_key" ON "EmploymentContract"("tenantId", "contractNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDocument_currentVersionId_key" ON "EmployeeDocument"("currentVersionId");
CREATE INDEX "EmployeeDocument_tenantId_idx" ON "EmployeeDocument"("tenantId");
CREATE INDEX "EmployeeDocument_tenantId_employeeId_idx" ON "EmployeeDocument"("tenantId", "employeeId");
CREATE INDEX "EmployeeDocument_tenantId_category_idx" ON "EmployeeDocument"("tenantId", "category");
CREATE INDEX "EmployeeDocument_tenantId_expirationDate_idx" ON "EmployeeDocument"("tenantId", "expirationDate");
CREATE INDEX "EmployeeDocument_tenantId_archivedAt_idx" ON "EmployeeDocument"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "EmployeeDocumentVersion_tenantId_idx" ON "EmployeeDocumentVersion"("tenantId");
CREATE INDEX "EmployeeDocumentVersion_tenantId_documentId_idx" ON "EmployeeDocumentVersion"("tenantId", "documentId");
CREATE INDEX "EmployeeDocumentVersion_tenantId_sha256_idx" ON "EmployeeDocumentVersion"("tenantId", "sha256");
CREATE UNIQUE INDEX "EmployeeDocumentVersion_documentId_versionNumber_key" ON "EmployeeDocumentVersion"("documentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "WorkSite" ADD CONSTRAINT "WorkSite_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkSite" ADD CONSTRAINT "WorkSite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkSite" ADD CONSTRAINT "WorkSite_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkSite" ADD CONSTRAINT "WorkSite_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Department" ADD CONSTRAINT "Department_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeAssignment" ADD CONSTRAINT "EmployeeAssignment_endedById_fkey" FOREIGN KEY ("endedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_managerEmployeeId_fkey" FOREIGN KEY ("managerEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_renewedFromContractId_fkey" FOREIGN KEY ("renewedFromContractId") REFERENCES "EmploymentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "EmploymentContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "EmployeeDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocumentVersion" ADD CONSTRAINT "EmployeeDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmployeeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocumentVersion" ADD CONSTRAINT "EmployeeDocumentVersion_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "CompanyAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EmployeeDocumentVersion" ADD CONSTRAINT "EmployeeDocumentVersion_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
