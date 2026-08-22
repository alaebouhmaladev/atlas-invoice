-- CreateEnum
CREATE TYPE "LeaveCategory" AS ENUM ('PAID', 'UNPAID', 'SICK', 'AUTHORIZED_OTHER');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveDayPortion" AS ENUM ('FULL_DAY', 'MORNING', 'AFTERNOON', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LeaveBalanceEntryType" AS ENUM ('OPENING', 'ACCRUAL', 'ADJUSTMENT', 'RESERVATION', 'RELEASE', 'DEBIT', 'REVERSAL', 'CARRY_OVER', 'EXPIRY');

-- CreateEnum
CREATE TYPE "AbsenceStatus" AS ENUM ('UNJUSTIFIED', 'PENDING_JUSTIFICATION', 'JUSTIFIED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AbsenceSource" AS ENUM ('ATTENDANCE_JOB', 'MANUAL', 'LEAVE_REQUEST');

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#b49c80',
    "category" "LeaveCategory" NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "usesBalance" BOOLEAN NOT NULL DEFAULT false,
    "requiresDocument" BOOLEAN NOT NULL DEFAULT false,
    "allowPartialDay" BOOLEAN NOT NULL DEFAULT true,
    "minimumNoticeDays" INTEGER,
    "maximumConsecutiveDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeavePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "leaveTypeId" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "entitlementMinutes" INTEGER NOT NULL DEFAULT 0,
    "accrualMinutes" INTEGER NOT NULL DEFAULT 0,
    "accrualFrequency" TEXT NOT NULL DEFAULT 'MANUAL',
    "minutesPerDay" INTEGER NOT NULL DEFAULT 480,
    "workingWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "excludeHolidays" BOOLEAN NOT NULL DEFAULT true,
    "carryOverLimitMinutes" INTEGER,
    "carryOverExpiryMonth" INTEGER,
    "allowNegativeBalance" BOOLEAN NOT NULL DEFAULT false,
    "allowDuringProbation" BOOLEAN NOT NULL DEFAULT true,
    "allowRetroactiveRequests" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LeavePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "openingMinutes" INTEGER NOT NULL DEFAULT 0,
    "accruedMinutes" INTEGER NOT NULL DEFAULT 0,
    "adjustedMinutes" INTEGER NOT NULL DEFAULT 0,
    "reservedMinutes" INTEGER NOT NULL DEFAULT 0,
    "consumedMinutes" INTEGER NOT NULL DEFAULT 0,
    "expiredMinutes" INTEGER NOT NULL DEFAULT 0,
    "availableMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalanceEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "balanceId" TEXT NOT NULL,
    "leaveRequestId" TEXT,
    "entryType" "LeaveBalanceEntryType" NOT NULL,
    "amountMinutes" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "balanceBeforeSnapshot" JSONB NOT NULL,
    "balanceAfterSnapshot" JSONB NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBalanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startPortion" "LeaveDayPortion" NOT NULL DEFAULT 'FULL_DAY',
    "endPortion" "LeaveDayPortion" NOT NULL DEFAULT 'FULL_DAY',
    "requestedMinutes" INTEGER NOT NULL DEFAULT 0,
    "approvedMinutes" INTEGER,
    "privateReason" TEXT,
    "documentId" TEXT,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "currentApprovalSequence" INTEGER NOT NULL DEFAULT 1,
    "policySnapshot" JSONB,
    "assignmentSnapshot" JSONB,
    "balanceSnapshot" JSONB,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "privateDecisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequestDay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "leaveRequestId" TEXT NOT NULL,
    "localDate" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,
    "scheduledShiftId" TEXT,
    "holidayId" TEXT,
    "attendanceDayId" TEXT,
    "portion" "LeaveDayPortion" NOT NULL DEFAULT 'FULL_DAY',
    "plannedMinutes" INTEGER NOT NULL DEFAULT 0,
    "requestedMinutes" INTEGER NOT NULL DEFAULT 0,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequestDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApprovalStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "leaveRequestId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "approverRole" "Role",
    "approverUserId" TEXT,
    "status" "LeaveApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "decisionById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "privateNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequestHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "leaveRequestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayCalendar" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "HolidayCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HolidayCalendarSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "calendarId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HolidayCalendarSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "calendarId" TEXT NOT NULL,
    "localDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPaid" BOOLEAN NOT NULL DEFAULT true,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "localDate" TIMESTAMP(3) NOT NULL,
    "attendanceDayId" TEXT,
    "leaveRequestId" TEXT,
    "documentId" TEXT,
    "source" "AbsenceSource" NOT NULL DEFAULT 'ATTENDANCE_JOB',
    "status" "AbsenceStatus" NOT NULL DEFAULT 'UNJUSTIFIED',
    "privateReason" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "privateResolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AbsenceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaveType_tenantId_isActive_idx" ON "LeaveType"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "LeaveType_tenantId_category_idx" ON "LeaveType"("tenantId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_tenantId_code_key" ON "LeaveType"("tenantId", "code");

-- CreateIndex
CREATE INDEX "LeavePolicy_tenantId_leaveTypeId_effectiveFrom_idx" ON "LeavePolicy"("tenantId", "leaveTypeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "LeavePolicy_tenantId_siteId_isActive_idx" ON "LeavePolicy"("tenantId", "siteId", "isActive");

-- CreateIndex
CREATE INDEX "LeaveBalance_tenantId_employeeId_idx" ON "LeaveBalance"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "LeaveBalance_tenantId_leaveTypeId_periodEnd_idx" ON "LeaveBalance"("tenantId", "leaveTypeId", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_tenantId_employeeId_leaveTypeId_periodStart_key" ON "LeaveBalance"("tenantId", "employeeId", "leaveTypeId", "periodStart");

-- CreateIndex
CREATE INDEX "LeaveBalanceEntry_tenantId_balanceId_effectiveDate_idx" ON "LeaveBalanceEntry"("tenantId", "balanceId", "effectiveDate");

-- CreateIndex
CREATE INDEX "LeaveBalanceEntry_tenantId_leaveRequestId_idx" ON "LeaveBalanceEntry"("tenantId", "leaveRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalanceEntry_tenantId_idempotencyKey_key" ON "LeaveBalanceEntry"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_employeeId_startDate_endDate_idx" ON "LeaveRequest"("tenantId", "employeeId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_status_submittedAt_idx" ON "LeaveRequest"("tenantId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "LeaveRequest_tenantId_leaveTypeId_idx" ON "LeaveRequest"("tenantId", "leaveTypeId");

-- CreateIndex
CREATE INDEX "LeaveRequestDay_tenantId_localDate_idx" ON "LeaveRequestDay"("tenantId", "localDate");

-- CreateIndex
CREATE INDEX "LeaveRequestDay_tenantId_siteId_localDate_idx" ON "LeaveRequestDay"("tenantId", "siteId", "localDate");

-- CreateIndex
CREATE INDEX "LeaveRequestDay_tenantId_scheduledShiftId_idx" ON "LeaveRequestDay"("tenantId", "scheduledShiftId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRequestDay_leaveRequestId_localDate_key" ON "LeaveRequestDay"("leaveRequestId", "localDate");

-- CreateIndex
CREATE INDEX "LeaveApprovalStep_tenantId_status_approverRole_idx" ON "LeaveApprovalStep"("tenantId", "status", "approverRole");

-- CreateIndex
CREATE INDEX "LeaveApprovalStep_tenantId_approverUserId_status_idx" ON "LeaveApprovalStep"("tenantId", "approverUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveApprovalStep_leaveRequestId_sequence_key" ON "LeaveApprovalStep"("leaveRequestId", "sequence");

-- CreateIndex
CREATE INDEX "LeaveRequestHistory_tenantId_leaveRequestId_createdAt_idx" ON "LeaveRequestHistory"("tenantId", "leaveRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "HolidayCalendar_tenantId_isDefault_isActive_idx" ON "HolidayCalendar"("tenantId", "isDefault", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayCalendar_tenantId_code_key" ON "HolidayCalendar"("tenantId", "code");

-- CreateIndex
CREATE INDEX "HolidayCalendarSite_tenantId_calendarId_idx" ON "HolidayCalendarSite"("tenantId", "calendarId");

-- CreateIndex
CREATE UNIQUE INDEX "HolidayCalendarSite_tenantId_siteId_key" ON "HolidayCalendarSite"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "Holiday_tenantId_localDate_idx" ON "Holiday"("tenantId", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_calendarId_localDate_key" ON "Holiday"("calendarId", "localDate");

-- CreateIndex
CREATE INDEX "AbsenceRecord_tenantId_siteId_localDate_idx" ON "AbsenceRecord"("tenantId", "siteId", "localDate");

-- CreateIndex
CREATE INDEX "AbsenceRecord_tenantId_status_localDate_idx" ON "AbsenceRecord"("tenantId", "status", "localDate");

-- CreateIndex
CREATE UNIQUE INDEX "AbsenceRecord_tenantId_employeeId_localDate_key" ON "AbsenceRecord"("tenantId", "employeeId", "localDate");

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalanceEntry" ADD CONSTRAINT "LeaveBalanceEntry_balanceId_fkey" FOREIGN KEY ("balanceId") REFERENCES "LeaveBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalanceEntry" ADD CONSTRAINT "LeaveBalanceEntry_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalanceEntry" ADD CONSTRAINT "LeaveBalanceEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmployeeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestDay" ADD CONSTRAINT "LeaveRequestDay_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestDay" ADD CONSTRAINT "LeaveRequestDay_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestDay" ADD CONSTRAINT "LeaveRequestDay_scheduledShiftId_fkey" FOREIGN KEY ("scheduledShiftId") REFERENCES "ScheduledShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestDay" ADD CONSTRAINT "LeaveRequestDay_holidayId_fkey" FOREIGN KEY ("holidayId") REFERENCES "Holiday"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestDay" ADD CONSTRAINT "LeaveRequestDay_attendanceDayId_fkey" FOREIGN KEY ("attendanceDayId") REFERENCES "AttendanceDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalStep" ADD CONSTRAINT "LeaveApprovalStep_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalStep" ADD CONSTRAINT "LeaveApprovalStep_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalStep" ADD CONSTRAINT "LeaveApprovalStep_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestHistory" ADD CONSTRAINT "LeaveRequestHistory_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestHistory" ADD CONSTRAINT "LeaveRequestHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendar" ADD CONSTRAINT "HolidayCalendar_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendar" ADD CONSTRAINT "HolidayCalendar_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendarSite" ADD CONSTRAINT "HolidayCalendarSite_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "HolidayCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendarSite" ADD CONSTRAINT "HolidayCalendarSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "HolidayCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRecord" ADD CONSTRAINT "AbsenceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRecord" ADD CONSTRAINT "AbsenceRecord_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRecord" ADD CONSTRAINT "AbsenceRecord_attendanceDayId_fkey" FOREIGN KEY ("attendanceDayId") REFERENCES "AttendanceDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRecord" ADD CONSTRAINT "AbsenceRecord_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRecord" ADD CONSTRAINT "AbsenceRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EmployeeDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceRecord" ADD CONSTRAINT "AbsenceRecord_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Phase 5 integrity constraints (all additive; no historical rows are rewritten)
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_notice_nonnegative_check" CHECK ("minimumNoticeDays" IS NULL OR "minimumNoticeDays" >= 0);
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_max_days_positive_check" CHECK ("maximumConsecutiveDays" IS NULL OR "maximumConsecutiveDays" > 0);
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_date_range_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" >= "effectiveFrom");
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_minutes_check" CHECK ("entitlementMinutes" >= 0 AND "accrualMinutes" >= 0 AND "minutesPerDay" > 0);
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_working_weekdays_check" CHECK ("workingWeekdays" <@ ARRAY[0,1,2,3,4,5,6]);
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_carry_over_check" CHECK ("carryOverLimitMinutes" IS NULL OR "carryOverLimitMinutes" >= 0);
ALTER TABLE "LeavePolicy" ADD CONSTRAINT "LeavePolicy_expiry_month_check" CHECK ("carryOverExpiryMonth" IS NULL OR "carryOverExpiryMonth" BETWEEN 1 AND 12);
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_period_check" CHECK ("periodEnd" >= "periodStart");
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_totals_check" CHECK ("openingMinutes" >= 0 AND "accruedMinutes" >= 0 AND "reservedMinutes" >= 0 AND "consumedMinutes" >= 0 AND "expiredMinutes" >= 0);
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_date_range_check" CHECK ("endDate" >= "startDate");
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_minutes_check" CHECK ("requestedMinutes" >= 0 AND ("approvedMinutes" IS NULL OR "approvedMinutes" >= 0));
ALTER TABLE "LeaveRequestDay" ADD CONSTRAINT "LeaveRequestDay_minutes_check" CHECK ("plannedMinutes" >= 0 AND "requestedMinutes" >= 0);
ALTER TABLE "LeaveApprovalStep" ADD CONSTRAINT "LeaveApprovalStep_sequence_check" CHECK ("sequence" > 0);
CREATE UNIQUE INDEX "HolidayCalendar_one_default_per_tenant_idx" ON "HolidayCalendar"("tenantId") WHERE "isDefault" = true AND "isActive" = true;
