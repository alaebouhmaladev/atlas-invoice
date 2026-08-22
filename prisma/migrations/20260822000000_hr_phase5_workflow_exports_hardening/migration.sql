-- HR Phase 5 hardening: workflow states, scoped policies, request numbering and secure attachments.
-- This migration is additive and preserves all existing leave and attendance data.

ALTER TYPE "LeaveRequestStatus" ADD VALUE IF NOT EXISTS 'PENDING_MANAGER';
ALTER TYPE "LeaveRequestStatus" ADD VALUE IF NOT EXISTS 'PENDING_HR';
ALTER TYPE "LeaveRequestStatus" ADD VALUE IF NOT EXISTS 'CANCEL_REQUESTED';

CREATE TYPE "LeaveApprovalWorkflow" AS ENUM ('MANAGER_ONLY', 'HR_ONLY', 'MANAGER_THEN_HR', 'AUTOMATIC');
CREATE TYPE "LeaveAttachmentStatus" AS ENUM ('MISSING', 'PROVIDED', 'VERIFIED', 'REJECTED');

ALTER TABLE "LeaveType"
  ADD COLUMN "allowHourly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "archivedById" TEXT;

ALTER TABLE "LeavePolicy"
  ADD COLUMN "departmentId" TEXT,
  ADD COLUMN "positionId" TEXT,
  ADD COLUMN "employeeId" TEXT,
  ADD COLUMN "contractType" "ContractType",
  ADD COLUMN "scopeKey" TEXT NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN "maximumNegativeMinutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "attachmentThresholdMinutes" INTEGER,
  ADD COLUMN "approvalWorkflow" "LeaveApprovalWorkflow" NOT NULL DEFAULT 'HR_ONLY',
  ADD COLUMN "blockOnCoverageWarning" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LeaveRequest"
  ADD COLUMN "requestNumber" TEXT,
  ADD COLUMN "sequenceYear" INTEGER,
  ADD COLUMN "sequenceNumber" INTEGER,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "customStartMinute" INTEGER,
  ADD COLUMN "customEndMinute" INTEGER,
  ADD COLUMN "attachmentStatus" "LeaveAttachmentStatus" NOT NULL DEFAULT 'MISSING',
  ADD COLUMN "emergencyContact" TEXT,
  ADD COLUMN "planningImpactSnapshot" JSONB,
  ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;

WITH numbered AS (
  SELECT "id", "tenantId", EXTRACT(YEAR FROM "startDate")::INTEGER AS year,
         ROW_NUMBER() OVER (PARTITION BY "tenantId", EXTRACT(YEAR FROM "startDate") ORDER BY "createdAt", "id")::INTEGER AS seq
  FROM "LeaveRequest"
)
UPDATE "LeaveRequest" request
SET "sequenceYear" = numbered.year,
    "sequenceNumber" = numbered.seq,
    "requestNumber" = 'CON-' || numbered.year::TEXT || '-' || LPAD(numbered.seq::TEXT, 5, '0')
FROM numbered
WHERE request."id" = numbered."id";

ALTER TABLE "LeaveRequest"
  ALTER COLUMN "requestNumber" SET NOT NULL,
  ALTER COLUMN "sequenceYear" SET NOT NULL,
  ALTER COLUMN "sequenceNumber" SET NOT NULL;

ALTER TABLE "LeaveApprovalStep"
  ADD COLUMN "decisionIdempotencyKey" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "HolidayCalendar" ADD COLUMN "countryCode" TEXT NOT NULL DEFAULT 'MA';
ALTER TABLE "Holiday"
  ADD COLUMN "nameAr" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "LeaveRequestAttachment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
  "leaveRequestId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "isMedical" BOOLEAN NOT NULL DEFAULT false,
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeaveRequestAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaveRequest_tenantId_requestNumber_key" ON "LeaveRequest"("tenantId", "requestNumber");
CREATE UNIQUE INDEX "LeaveRequest_tenantId_sequenceYear_sequenceNumber_key" ON "LeaveRequest"("tenantId", "sequenceYear", "sequenceNumber");
CREATE UNIQUE INDEX "LeaveRequest_tenantId_idempotencyKey_key" ON "LeaveRequest"("tenantId", "idempotencyKey");
CREATE UNIQUE INDEX "LeaveApprovalStep_tenantId_decisionIdempotencyKey_key" ON "LeaveApprovalStep"("tenantId", "decisionIdempotencyKey");
CREATE UNIQUE INDEX "LeaveRequestAttachment_tenantId_leaveRequestId_documentId_key" ON "LeaveRequestAttachment"("tenantId", "leaveRequestId", "documentId");
CREATE INDEX "LeaveRequestAttachment_tenantId_leaveRequestId_idx" ON "LeaveRequestAttachment"("tenantId", "leaveRequestId");
CREATE INDEX "LeaveRequestAttachment_tenantId_documentId_idx" ON "LeaveRequestAttachment"("tenantId", "documentId");
CREATE INDEX "LeavePolicy_tenantId_employeeId_isActive_idx" ON "LeavePolicy"("tenantId", "employeeId", "isActive");
CREATE INDEX "LeavePolicy_tenantId_departmentId_positionId_priority_idx" ON "LeavePolicy"("tenantId", "departmentId", "positionId", "priority");
CREATE INDEX "LeavePolicy_tenantId_leaveTypeId_scopeKey_priority_idx" ON "LeavePolicy"("tenantId", "leaveTypeId", "scopeKey", "priority");

ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LeaveRequestAttachment" ADD CONSTRAINT "LeaveRequestAttachment_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeaveRequestAttachment" ADD CONSTRAINT "LeaveRequestAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmployeeDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaveRequestAttachment" ADD CONSTRAINT "LeaveRequestAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_effective_range_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_negative_limit_check" CHECK ("maximumNegativeMinutes" >= 0);
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_custom_minutes_check" CHECK (
  ("customStartMinute" IS NULL OR "customStartMinute" BETWEEN 0 AND 1439) AND
  ("customEndMinute" IS NULL OR "customEndMinute" BETWEEN 1 AND 1440) AND
  ("customStartMinute" IS NULL OR "customEndMinute" IS NULL OR "customEndMinute" > "customStartMinute")
);

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX "LeavePolicy_active_scope_start_key"
  ON "LeavePolicy"("tenantId", "leaveTypeId", "scopeKey", "priority", "effectiveFrom")
  WHERE "isActive" = true;
