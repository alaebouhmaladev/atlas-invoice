-- CreateEnum
CREATE TYPE "ShiftSegmentType" AS ENUM ('WORK', 'PAID_BREAK', 'UNPAID_BREAK');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ScheduledShiftStatus" AS ENUM ('PLANNED', 'PUBLISHED', 'CHANGED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'UNAVAILABLE', 'PREFERRED');

-- CreateTable
CREATE TABLE "ShiftTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#f97316',
    "description" TEXT,
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftTemplateSegment" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "startLocalTime" TEXT NOT NULL,
    "endLocalTime" TEXT NOT NULL,
    "endsNextDay" BOOLEAN NOT NULL DEFAULT false,
    "segmentType" "ShiftSegmentType" NOT NULL DEFAULT 'WORK',

    CONSTRAINT "ShiftTemplateSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSchedule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "lockedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledShift" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "scheduleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "workDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "status" "ScheduledShiftStatus" NOT NULL DEFAULT 'PLANNED',
    "templateId" TEXT,
    "templateNameSnapshot" TEXT,
    "templateColorSnapshot" TEXT,
    "totalWorkMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ScheduledShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledShiftSegment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "startLocalTime" TEXT NOT NULL,
    "endLocalTime" TEXT NOT NULL,
    "endsNextDay" BOOLEAN NOT NULL DEFAULT false,
    "segmentType" "ShiftSegmentType" NOT NULL DEFAULT 'WORK',
    "startUtc" TIMESTAMP(3) NOT NULL,
    "endUtc" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledShiftSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffingRequirement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startLocalTime" TEXT NOT NULL,
    "endLocalTime" TEXT NOT NULL,
    "minEmployees" INTEGER NOT NULL DEFAULT 1,
    "preferredEmployees" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAvailability" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "employeeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "specificDate" TIMESTAMP(3),
    "startLocalTime" TEXT,
    "endLocalTime" TEXT,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "reason" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleChangeHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "shiftId" TEXT NOT NULL,
    "changeReason" TEXT NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSchedulePolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL DEFAULT 'default-tenant',
    "siteId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Casablanca',
    "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
    "defaultDailyTargetMinutes" INTEGER NOT NULL DEFAULT 480,
    "defaultWeeklyTargetMinutes" INTEGER NOT NULL DEFAULT 2640,
    "minimumRestMinutes" INTEGER NOT NULL DEFAULT 660,
    "maximumConsecutiveDays" INTEGER NOT NULL DEFAULT 6,
    "maximumDailyMinutes" INTEGER NOT NULL DEFAULT 600,
    "maximumWeeklyMinutes" INTEGER NOT NULL DEFAULT 2880,
    "maximumSplitGapMinutes" INTEGER NOT NULL DEFAULT 240,
    "allowOvernightShifts" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSchedulePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShiftTemplate_tenantId_idx" ON "ShiftTemplate"("tenantId");

-- CreateIndex
CREATE INDEX "ShiftTemplate_tenantId_siteId_idx" ON "ShiftTemplate"("tenantId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTemplate_tenantId_siteId_code_key" ON "ShiftTemplate"("tenantId", "siteId", "code");

-- CreateIndex
CREATE INDEX "ShiftTemplateSegment_templateId_idx" ON "ShiftTemplateSegment"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftTemplateSegment_templateId_order_key" ON "ShiftTemplateSegment"("templateId", "order");

-- CreateIndex
CREATE INDEX "WorkSchedule_tenantId_idx" ON "WorkSchedule"("tenantId");

-- CreateIndex
CREATE INDEX "WorkSchedule_tenantId_siteId_idx" ON "WorkSchedule"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "WorkSchedule_tenantId_siteId_status_idx" ON "WorkSchedule"("tenantId", "siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkSchedule_tenantId_siteId_periodStart_key" ON "WorkSchedule"("tenantId", "siteId", "periodStart");

-- CreateIndex
CREATE INDEX "ScheduledShift_tenantId_idx" ON "ScheduledShift"("tenantId");

-- CreateIndex
CREATE INDEX "ScheduledShift_tenantId_scheduleId_idx" ON "ScheduledShift"("tenantId", "scheduleId");

-- CreateIndex
CREATE INDEX "ScheduledShift_tenantId_employeeId_workDate_idx" ON "ScheduledShift"("tenantId", "employeeId", "workDate");

-- CreateIndex
CREATE INDEX "ScheduledShift_tenantId_siteId_workDate_idx" ON "ScheduledShift"("tenantId", "siteId", "workDate");

-- CreateIndex
CREATE INDEX "ScheduledShiftSegment_shiftId_idx" ON "ScheduledShiftSegment"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledShiftSegment_shiftId_order_key" ON "ScheduledShiftSegment"("shiftId", "order");

-- CreateIndex
CREATE INDEX "StaffingRequirement_tenantId_idx" ON "StaffingRequirement"("tenantId");

-- CreateIndex
CREATE INDEX "StaffingRequirement_tenantId_siteId_dayOfWeek_idx" ON "StaffingRequirement"("tenantId", "siteId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "EmployeeAvailability_tenantId_idx" ON "EmployeeAvailability"("tenantId");

-- CreateIndex
CREATE INDEX "EmployeeAvailability_tenantId_employeeId_idx" ON "EmployeeAvailability"("tenantId", "employeeId");

-- CreateIndex
CREATE INDEX "ScheduleChangeHistory_tenantId_idx" ON "ScheduleChangeHistory"("tenantId");

-- CreateIndex
CREATE INDEX "ScheduleChangeHistory_tenantId_shiftId_idx" ON "ScheduleChangeHistory"("tenantId", "shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSchedulePolicy_siteId_key" ON "SiteSchedulePolicy"("siteId");

-- CreateIndex
CREATE INDEX "SiteSchedulePolicy_tenantId_idx" ON "SiteSchedulePolicy"("tenantId");

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftTemplateSegment" ADD CONSTRAINT "ShiftTemplateSegment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSchedule" ADD CONSTRAINT "WorkSchedule_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "WorkSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "EmployeeAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ShiftTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShift" ADD CONSTRAINT "ScheduledShift_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledShiftSegment" ADD CONSTRAINT "ScheduledShiftSegment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ScheduledShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequirement" ADD CONSTRAINT "StaffingRequirement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequirement" ADD CONSTRAINT "StaffingRequirement_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffingRequirement" ADD CONSTRAINT "StaffingRequirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAvailability" ADD CONSTRAINT "EmployeeAvailability_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeHistory" ADD CONSTRAINT "ScheduleChangeHistory_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "ScheduledShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChangeHistory" ADD CONSTRAINT "ScheduleChangeHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSchedulePolicy" ADD CONSTRAINT "SiteSchedulePolicy_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WorkSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSchedulePolicy" ADD CONSTRAINT "SiteSchedulePolicy_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
