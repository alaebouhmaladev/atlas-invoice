-- CreateEnum
CREATE TYPE "AttendanceEventType" AS ENUM ('CLOCK_IN', 'BREAK_START', 'BREAK_END', 'CLOCK_OUT');

-- CreateEnum
CREATE TYPE "AttendanceEventSource" AS ENUM ('EMPLOYEE_WEB', 'SITE_TERMINAL', 'MANUAL', 'ADMIN_CORRECTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttendanceDayStatus" AS ENUM ('OPEN', 'COMPLETE', 'INCOMPLETE', 'ABSENT', 'REST_DAY', 'HOLIDAY', 'ON_LEAVE', 'VALIDATED', 'LOCKED');

-- CreateEnum
CREATE TYPE "AttendanceAnomalyType" AS ENUM ('LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSING_CLOCK_IN', 'MISSING_CLOCK_OUT', 'MISSING_BREAK_END', 'UNSCHEDULED_ATTENDANCE', 'OUTSIDE_ALLOWED_SITE', 'OVERLAPPING_ATTENDANCE', 'EXCESSIVE_BREAK', 'INSUFFICIENT_REST', 'OVERTIME', 'MANUAL_CORRECTION');

-- CreateEnum
CREATE TYPE "AttendanceAnomalySeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AttendanceValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "attendancePinHash" TEXT;

-- CreateTable
CREATE TABLE "AttendancePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Politique de Pointage Par Défaut',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "earlyClockInToleranceMinutes" INTEGER NOT NULL DEFAULT 15,
    "lateArrivalToleranceMinutes" INTEGER NOT NULL DEFAULT 10,
    "earlyDepartureToleranceMinutes" INTEGER NOT NULL DEFAULT 10,
    "maxAllowedBreakMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxDailyWorkMinutes" INTEGER NOT NULL DEFAULT 600,
    "overtimeThresholdMinutes" INTEGER NOT NULL DEFAULT 480,
    "minRestMinutes" INTEGER NOT NULL DEFAULT 660,
    "allowUnscheduledClockIn" BOOLEAN NOT NULL DEFAULT true,
    "requireTerminal" BOOLEAN NOT NULL DEFAULT false,
    "requireManagerApproval" BOOLEAN NOT NULL DEFAULT true,
    "enableLocationVerification" BOOLEAN NOT NULL DEFAULT false,
    "autoClockOutPolicy" TEXT NOT NULL DEFAULT 'NEVER',
    "gracePeriodMinutes" INTEGER NOT NULL DEFAULT 5,
    "paidBreakCountsAsCoverage" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceTerminal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "pinHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "revokedAt" TIMESTAMP(3),
    "revokedById" TEXT,
    "lastPingAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AttendanceTerminal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "terminalId" TEXT,
    "eventType" "AttendanceEventType" NOT NULL,
    "eventSource" "AttendanceEventSource" NOT NULL DEFAULT 'EMPLOYEE_WEB',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "localDate" TEXT NOT NULL,
    "localTime" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceDay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceDayStatus" NOT NULL DEFAULT 'OPEN',
    "scheduledShiftId" TEXT,
    "plannedMinutes" INTEGER NOT NULL DEFAULT 0,
    "actualPresenceMinutes" INTEGER NOT NULL DEFAULT 0,
    "paidBreakMinutes" INTEGER NOT NULL DEFAULT 0,
    "unpaidBreakMinutes" INTEGER NOT NULL DEFAULT 0,
    "netWorkedMinutes" INTEGER NOT NULL DEFAULT 0,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "earlyDepartureMinutes" INTEGER NOT NULL DEFAULT 0,
    "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "missingMinutes" INTEGER NOT NULL DEFAULT 0,
    "differenceMinutes" INTEGER NOT NULL DEFAULT 0,
    "firstClockIn" TIMESTAMP(3),
    "lastClockOut" TIMESTAMP(3),
    "policySnapshot" JSONB,
    "scheduleSnapshot" JSONB,
    "validationStatus" "AttendanceValidationStatus" NOT NULL DEFAULT 'PENDING',
    "validationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AttendanceDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAnomaly" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "attendanceDayId" TEXT,
    "anomalyType" "AttendanceAnomalyType" NOT NULL,
    "severity" "AttendanceAnomalySeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrectionRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "attendanceDayId" TEXT,
    "workDate" TIMESTAMP(3) NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'TIME_CORRECTION',
    "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "documentId" TEXT,
    "requestedClockIn" TIMESTAMP(3),
    "requestedClockOut" TIMESTAMP(3),
    "requestedBreakStart" TIMESTAMP(3),
    "requestedBreakEnd" TIMESTAMP(3),
    "requestedChanges" JSONB NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "proposedAfterSnapshot" JSONB NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceCorrectionHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "correctionRequestId" TEXT NOT NULL,
    "attendanceDayId" TEXT,
    "action" TEXT NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrectionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceValidation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceValidationStatus" NOT NULL DEFAULT 'APPROVED',
    "validatorUserId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summarySnapshot" JSONB NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AttendanceValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePeriodLock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedById" TEXT NOT NULL,
    "lockConfirmationString" TEXT NOT NULL DEFAULT 'VERROUILLER POINTAGE',
    "unlockedAt" TIMESTAMP(3),
    "unlockedById" TEXT,
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePeriodLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendancePolicy_tenantId_idx" ON "AttendancePolicy"("tenantId");

-- CreateIndex
CREATE INDEX "AttendancePolicy_tenantId_siteId_idx" ON "AttendancePolicy"("tenantId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePolicy_tenantId_siteId_key" ON "AttendancePolicy"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "AttendanceTerminal_tenantId_idx" ON "AttendanceTerminal"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceTerminal_tenantId_siteId_idx" ON "AttendanceTerminal"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "AttendanceTerminal_tenantId_isActive_idx" ON "AttendanceTerminal"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceTerminal_tenantId_code_key" ON "AttendanceTerminal"("tenantId", "code");

-- CreateIndex
CREATE INDEX "AttendanceEvent_tenantId_idx" ON "AttendanceEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceEvent_tenantId_employeeId_timestamp_idx" ON "AttendanceEvent"("tenantId", "employeeId", "timestamp");

-- CreateIndex
CREATE INDEX "AttendanceEvent_tenantId_siteId_localDate_idx" ON "AttendanceEvent"("tenantId", "siteId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEvent_tenantId_idempotencyKey_key" ON "AttendanceEvent"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AttendanceDay_tenantId_idx" ON "AttendanceDay"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceDay_tenantId_employeeId_idx" ON "AttendanceDay"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "AttendanceDay_tenantId_siteId_workDate_idx" ON "AttendanceDay"("tenantId", "siteId", "workDate");

-- CreateIndex
CREATE INDEX "AttendanceDay_tenantId_status_idx" ON "AttendanceDay"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AttendanceDay_tenantId_validationStatus_idx" ON "AttendanceDay"("tenantId", "validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceDay_tenantId_employeeId_workDate_key" ON "AttendanceDay"("tenantId", "employeeId", "workDate");

-- CreateIndex
CREATE INDEX "AttendanceAnomaly_tenantId_idx" ON "AttendanceAnomaly"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceAnomaly_tenantId_employeeId_idx" ON "AttendanceAnomaly"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "AttendanceAnomaly_tenantId_siteId_idx" ON "AttendanceAnomaly"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "AttendanceAnomaly_tenantId_isResolved_idx" ON "AttendanceAnomaly"("tenantId", "isResolved");

-- CreateIndex
CREATE INDEX "AttendanceAnomaly_tenantId_severity_idx" ON "AttendanceAnomaly"("tenantId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceAnomaly_tenantId_deduplicationKey_key" ON "AttendanceAnomaly"("tenantId", "deduplicationKey");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_tenantId_idx" ON "AttendanceCorrectionRequest"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_tenantId_employeeId_idx" ON "AttendanceCorrectionRequest"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_tenantId_siteId_idx" ON "AttendanceCorrectionRequest"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionRequest_tenantId_status_idx" ON "AttendanceCorrectionRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionHistory_tenantId_idx" ON "AttendanceCorrectionHistory"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceCorrectionHistory_tenantId_correctionRequestId_idx" ON "AttendanceCorrectionHistory"("tenantId", "correctionRequestId");

-- CreateIndex
CREATE INDEX "AttendanceValidation_tenantId_idx" ON "AttendanceValidation"("tenantId");

-- CreateIndex
CREATE INDEX "AttendanceValidation_tenantId_siteId_idx" ON "AttendanceValidation"("tenantId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceValidation_tenantId_siteId_periodStart_periodEnd_key" ON "AttendanceValidation"("tenantId", "siteId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AttendancePeriodLock_tenantId_idx" ON "AttendancePeriodLock"("tenantId");

-- CreateIndex
CREATE INDEX "AttendancePeriodLock_tenantId_siteId_idx" ON "AttendancePeriodLock"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "AttendancePeriodLock_tenantId_isLocked_idx" ON "AttendancePeriodLock"("tenantId", "isLocked");

-- CreateIndex
CREATE UNIQUE INDEX "AttendancePeriodLock_tenantId_siteId_periodStart_key" ON "AttendancePeriodLock"("tenantId", "siteId", "periodStart");

-- AddForeignKey
ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceTerminal" ADD CONSTRAINT "AttendanceTerminal_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceTerminal" ADD CONSTRAINT "AttendanceTerminal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceTerminal" ADD CONSTRAINT "AttendanceTerminal_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceTerminal" ADD CONSTRAINT "AttendanceTerminal_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_terminalId_fkey" FOREIGN KEY ("terminalId") REFERENCES "AttendanceTerminal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_scheduledShiftId_fkey" FOREIGN KEY ("scheduledShiftId") REFERENCES "ScheduledShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceDay" ADD CONSTRAINT "AttendanceDay_validationId_fkey" FOREIGN KEY ("validationId") REFERENCES "AttendanceValidation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAnomaly" ADD CONSTRAINT "AttendanceAnomaly_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAnomaly" ADD CONSTRAINT "AttendanceAnomaly_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAnomaly" ADD CONSTRAINT "AttendanceAnomaly_attendanceDayId_fkey" FOREIGN KEY ("attendanceDayId") REFERENCES "AttendanceDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAnomaly" ADD CONSTRAINT "AttendanceAnomaly_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_attendanceDayId_fkey" FOREIGN KEY ("attendanceDayId") REFERENCES "AttendanceDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmployeeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionHistory" ADD CONSTRAINT "AttendanceCorrectionHistory_correctionRequestId_fkey" FOREIGN KEY ("correctionRequestId") REFERENCES "AttendanceCorrectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionHistory" ADD CONSTRAINT "AttendanceCorrectionHistory_attendanceDayId_fkey" FOREIGN KEY ("attendanceDayId") REFERENCES "AttendanceDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrectionHistory" ADD CONSTRAINT "AttendanceCorrectionHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceValidation" ADD CONSTRAINT "AttendanceValidation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceValidation" ADD CONSTRAINT "AttendanceValidation_validatorUserId_fkey" FOREIGN KEY ("validatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePeriodLock" ADD CONSTRAINT "AttendancePeriodLock_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePeriodLock" ADD CONSTRAINT "AttendancePeriodLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePeriodLock" ADD CONSTRAINT "AttendancePeriodLock_unlockedById_fkey" FOREIGN KEY ("unlockedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

