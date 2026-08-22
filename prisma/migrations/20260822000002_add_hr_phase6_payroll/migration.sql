-- CreateEnum
CREATE TYPE "PayrollPeriodStatus" AS ENUM ('DRAFT', 'CALCULATING', 'CALCULATED', 'VALIDATED', 'CLOSED', 'REOPENED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PayrollComponentKind" AS ENUM ('EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION', 'REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "PayrollComponentMode" AS ENUM ('FIXED', 'VARIABLE', 'PERCENTAGE', 'QUANTITY_RATE');

-- CreateEnum
CREATE TYPE "PayrollVariableStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'LOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollRecordStatus" AS ENUM ('DRAFT', 'CALCULATED', 'VALIDATED', 'CLOSED', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "PayrollDebtStatus" AS ENUM ('DRAFT', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollHistoryAction" AS ENUM ('CREATED', 'PREPARED', 'CALCULATED', 'VALIDATED', 'CLOSED', 'REOPENED', 'CANCELLED', 'RECALCULATED', 'REVERSED', 'EXPORTED');

-- CreateTable
CREATE TABLE "PayrollConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "standardMonthlyMinutes" INTEGER NOT NULL DEFAULT 11440,
    "standardWeeklyMinutes" INTEGER NOT NULL DEFAULT 2640,
    "prorationMethod" TEXT NOT NULL DEFAULT 'SCHEDULED_MINUTES',
    "roundingMode" TEXT NOT NULL DEFAULT 'HALF_UP',
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "paymentDay" INTEGER NOT NULL DEFAULT 28,
    "attendanceCutoffDay" INTEGER NOT NULL DEFAULT 25,
    "leaveCutoffDay" INTEGER NOT NULL DEFAULT 25,
    "overtimeRules" JSONB NOT NULL DEFAULT '{}',
    "accountingMappings" JSONB NOT NULL DEFAULT '{}',
    "bankExportConfiguration" JSONB NOT NULL DEFAULT '{}',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatutoryPayrollRuleSet" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT 'MA',
    "name" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "verificationStatus" "PayrollVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "officialSourceName" TEXT,
    "officialSourceUrl" TEXT,
    "sourceVerifiedAt" TIMESTAMP(3),
    "contributionRules" JSONB NOT NULL DEFAULT '{}',
    "incomeTaxBrackets" JSONB NOT NULL DEFAULT '[]',
    "professionalExpenses" JSONB NOT NULL DEFAULT '{}',
    "exemptions" JSONB NOT NULL DEFAULT '[]',
    "roundingRules" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activatedById" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatutoryPayrollRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryComponentDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "kind" "PayrollComponentKind" NOT NULL,
    "mode" "PayrollComponentMode" NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "cnssApplicable" BOOLEAN NOT NULL DEFAULT false,
    "amoApplicable" BOOLEAN NOT NULL DEFAULT false,
    "includedInGross" BOOLEAN NOT NULL DEFAULT false,
    "includedInNet" BOOLEAN NOT NULL DEFAULT true,
    "employeeSide" BOOLEAN NOT NULL DEFAULT true,
    "calculationOrder" INTEGER NOT NULL DEFAULT 100,
    "debitAccount" TEXT,
    "creditAccount" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "archiveReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryComponentDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalaryComponent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "componentDefinitionId" TEXT NOT NULL,
    "sourceContractId" TEXT,
    "fixedAmount" DECIMAL(14,2),
    "percentage" DECIMAL(9,6),
    "calculationBase" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'DRAFT',
    "statutoryRuleSetId" TEXT,
    "payrollConfigurationId" TEXT,
    "calculationVersion" INTEGER NOT NULL DEFAULT 1,
    "calculatedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopeningReason" TEXT,
    "inputHash" TEXT,
    "outputHash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollVariable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "componentDefinitionId" TEXT NOT NULL,
    "quantity" DECIMAL(14,4),
    "rate" DECIMAL(14,6),
    "amount" DECIMAL(14,2) NOT NULL,
    "source" TEXT NOT NULL,
    "sourceEntityId" TEXT,
    "description" TEXT,
    "status" "PayrollVariableStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAdvance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "originalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(14,2) NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "repaymentStart" TIMESTAMP(3) NOT NULL,
    "installmentAmount" DECIMAL(14,2) NOT NULL,
    "status" "PayrollDebtStatus" NOT NULL DEFAULT 'DRAFT',
    "supportingDocumentId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLoan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "originalAmount" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(14,2) NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "repaymentStart" TIMESTAMP(3) NOT NULL,
    "installmentAmount" DECIMAL(14,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL,
    "status" "PayrollDebtStatus" NOT NULL DEFAULT 'DRAFT',
    "supportingDocumentId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLoanInstallment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "payrollRecordId" TEXT,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "deductedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeLoanInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeNumberSnapshot" TEXT NOT NULL,
    "employeeNameSnapshot" TEXT NOT NULL,
    "siteSnapshot" TEXT,
    "departmentSnapshot" TEXT,
    "positionSnapshot" TEXT,
    "contractSnapshot" JSONB NOT NULL,
    "bankSnapshotEncrypted" TEXT,
    "bankMaskedSnapshot" TEXT,
    "baseSalarySnapshot" DECIMAL(14,2) NOT NULL,
    "workedTimeSnapshot" JSONB NOT NULL,
    "leaveSnapshot" JSONB NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "prorationMethod" TEXT NOT NULL,
    "grossSalary" DECIMAL(14,2) NOT NULL,
    "taxableGross" DECIMAL(14,2) NOT NULL,
    "contributionBase" DECIMAL(14,2) NOT NULL,
    "employeeContributions" DECIMAL(14,2) NOT NULL,
    "employerContributions" DECIMAL(14,2) NOT NULL,
    "taxableNet" DECIMAL(14,2) NOT NULL,
    "incomeTax" DECIMAL(14,2) NOT NULL,
    "totalDeductions" DECIMAL(14,2) NOT NULL,
    "netPayable" DECIMAL(14,2) NOT NULL,
    "employerCost" DECIMAL(14,2) NOT NULL,
    "status" "PayrollRecordStatus" NOT NULL DEFAULT 'DRAFT',
    "calculationHash" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "componentCodeSnapshot" TEXT NOT NULL,
    "componentNameSnapshot" TEXT NOT NULL,
    "kind" "PayrollComponentKind" NOT NULL,
    "quantity" DECIMAL(14,4),
    "rate" DECIMAL(14,6),
    "calculationBase" DECIMAL(14,2),
    "employeeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employerAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxable" BOOLEAN NOT NULL DEFAULT false,
    "cnssApplicable" BOOLEAN NOT NULL DEFAULT false,
    "amoApplicable" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL,
    "sourceEntityId" TEXT,
    "calculationOrder" INTEGER NOT NULL,
    "calculationExplanation" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollCalculationRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "runNumber" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "inputHash" TEXT,
    "outputHash" TEXT,
    "errorSummary" JSONB,

    CONSTRAINT "PayrollCalculationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "recordId" TEXT,
    "action" "PayrollHistoryAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorNameSnapshot" TEXT NOT NULL,
    "actorRoleSnapshot" TEXT NOT NULL,
    "reason" TEXT,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "requestId" TEXT NOT NULL,
    "calculationHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayslipAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payrollRecordId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "payslipNumber" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "generatedById" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersededAt" TIMESTAMP(3),

    CONSTRAINT "PayslipAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayrollConfiguration_tenantId_isActive_effectiveFrom_effect_idx" ON "PayrollConfiguration"("tenantId", "isActive", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollConfiguration_tenantId_name_effectiveFrom_key" ON "PayrollConfiguration"("tenantId", "name", "effectiveFrom");

-- CreateIndex
CREATE INDEX "StatutoryPayrollRuleSet_tenantId_isActive_verificationStatu_idx" ON "StatutoryPayrollRuleSet"("tenantId", "isActive", "verificationStatus", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "StatutoryPayrollRuleSet_tenantId_countryCode_name_effective_key" ON "StatutoryPayrollRuleSet"("tenantId", "countryCode", "name", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SalaryComponentDefinition_tenantId_archivedAt_effectiveFrom_idx" ON "SalaryComponentDefinition"("tenantId", "archivedAt", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryComponentDefinition_tenantId_code_key" ON "SalaryComponentDefinition"("tenantId", "code");

-- CreateIndex
CREATE INDEX "EmployeeSalaryComponent_tenantId_employeeId_effectiveFrom_e_idx" ON "EmployeeSalaryComponent"("tenantId", "employeeId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "EmployeeSalaryComponent_tenantId_componentDefinitionId_idx" ON "EmployeeSalaryComponent"("tenantId", "componentDefinitionId");

-- CreateIndex
CREATE INDEX "PayrollPeriod_tenantId_status_periodStart_periodEnd_idx" ON "PayrollPeriod"("tenantId", "status", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_tenantId_year_month_key" ON "PayrollPeriod"("tenantId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollPeriod_tenantId_periodNumber_key" ON "PayrollPeriod"("tenantId", "periodNumber");

-- CreateIndex
CREATE INDEX "PayrollVariable_tenantId_periodId_employeeId_status_idx" ON "PayrollVariable"("tenantId", "periodId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollVariable_tenantId_idempotencyKey_key" ON "PayrollVariable"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "EmployeeAdvance_tenantId_employeeId_status_idx" ON "EmployeeAdvance"("tenantId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAdvance_tenantId_reference_key" ON "EmployeeAdvance"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "EmployeeLoan_tenantId_employeeId_status_idx" ON "EmployeeLoan"("tenantId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLoan_tenantId_reference_key" ON "EmployeeLoan"("tenantId", "reference");

-- CreateIndex
CREATE INDEX "EmployeeLoanInstallment_tenantId_dueDate_status_idx" ON "EmployeeLoanInstallment"("tenantId", "dueDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLoanInstallment_tenantId_loanId_installmentNo_key" ON "EmployeeLoanInstallment"("tenantId", "loanId", "installmentNo");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeLoanInstallment_tenantId_payrollRecordId_loanId_key" ON "EmployeeLoanInstallment"("tenantId", "payrollRecordId", "loanId");

-- CreateIndex
CREATE INDEX "PayrollRecord_tenantId_employeeId_status_idx" ON "PayrollRecord"("tenantId", "employeeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_tenantId_periodId_employeeId_key" ON "PayrollRecord"("tenantId", "periodId", "employeeId");

-- CreateIndex
CREATE INDEX "PayrollLine_tenantId_recordId_calculationOrder_idx" ON "PayrollLine"("tenantId", "recordId", "calculationOrder");

-- CreateIndex
CREATE INDEX "PayrollCalculationRun_tenantId_status_startedAt_idx" ON "PayrollCalculationRun"("tenantId", "status", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollCalculationRun_tenantId_periodId_runNumber_key" ON "PayrollCalculationRun"("tenantId", "periodId", "runNumber");

-- CreateIndex
CREATE INDEX "PayrollHistory_tenantId_periodId_createdAt_idx" ON "PayrollHistory"("tenantId", "periodId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollHistory_tenantId_requestId_action_key" ON "PayrollHistory"("tenantId", "requestId", "action");

-- CreateIndex
CREATE INDEX "PayslipAsset_tenantId_assetId_idx" ON "PayslipAsset"("tenantId", "assetId");

-- CreateIndex
CREATE UNIQUE INDEX "PayslipAsset_tenantId_payrollRecordId_versionNumber_key" ON "PayslipAsset"("tenantId", "payrollRecordId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PayslipAsset_tenantId_payslipNumber_key" ON "PayslipAsset"("tenantId", "payslipNumber");

-- AddForeignKey
ALTER TABLE "EmployeeSalaryComponent" ADD CONSTRAINT "EmployeeSalaryComponent_componentDefinitionId_fkey" FOREIGN KEY ("componentDefinitionId") REFERENCES "SalaryComponentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_statutoryRuleSetId_fkey" FOREIGN KEY ("statutoryRuleSetId") REFERENCES "StatutoryPayrollRuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollVariable" ADD CONSTRAINT "PayrollVariable_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollVariable" ADD CONSTRAINT "PayrollVariable_componentDefinitionId_fkey" FOREIGN KEY ("componentDefinitionId") REFERENCES "SalaryComponentDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLoanInstallment" ADD CONSTRAINT "EmployeeLoanInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "EmployeeLoan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "PayrollRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollCalculationRun" ADD CONSTRAINT "PayrollCalculationRun_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollHistory" ADD CONSTRAINT "PayrollHistory_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayslipAsset" ADD CONSTRAINT "PayslipAsset_payrollRecordId_fkey" FOREIGN KEY ("payrollRecordId") REFERENCES "PayrollRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 6 domain invariants
ALTER TABLE "PayrollPeriod"
  ADD CONSTRAINT "PayrollPeriod_month_check" CHECK ("month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "PayrollPeriod_dates_check" CHECK ("periodStart" <= "periodEnd");

ALTER TABLE "PayrollVariable"
  ADD CONSTRAINT "PayrollVariable_self_approval_check"
  CHECK ("approvedById" IS NULL OR "submittedById" IS NULL OR "approvedById" <> "submittedById");

ALTER TABLE "EmployeeAdvance"
  ADD CONSTRAINT "EmployeeAdvance_amounts_check"
  CHECK ("originalAmount" > 0 AND "paidAmount" >= 0 AND "remainingAmount" >= 0 AND "remainingAmount" <= "originalAmount" AND "installmentAmount" > 0);

ALTER TABLE "EmployeeLoan"
  ADD CONSTRAINT "EmployeeLoan_amounts_check"
  CHECK ("originalAmount" > 0 AND "paidAmount" >= 0 AND "remainingAmount" >= 0 AND "remainingAmount" <= "originalAmount" AND "installmentAmount" > 0 AND "installmentCount" > 0);

ALTER TABLE "PayrollRecord"
  ADD CONSTRAINT "PayrollRecord_amounts_check"
  CHECK ("grossSalary" >= 0 AND "taxableGross" >= 0 AND "employeeContributions" >= 0 AND "employerContributions" >= 0 AND "incomeTax" >= 0 AND "totalDeductions" >= 0 AND "netPayable" >= 0 AND "employerCost" >= 0);

-- Historical decisions are append-only.
CREATE OR REPLACE FUNCTION atlas_payroll_history_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'PayrollHistory is immutable';
END;
$$;

CREATE TRIGGER "PayrollHistory_immutable"
BEFORE UPDATE OR DELETE ON "PayrollHistory"
FOR EACH ROW EXECUTE FUNCTION atlas_payroll_history_immutable();

-- Closed payroll records and their lines cannot be silently altered.
CREATE OR REPLACE FUNCTION atlas_payroll_closed_record_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE current_status "PayrollRecordStatus";
BEGIN
  IF TG_TABLE_NAME = 'PayrollRecord' THEN
    IF OLD.status = 'CLOSED' AND NEW.status = 'CLOSED' THEN
      RAISE EXCEPTION 'Closed payroll records are immutable';
    END IF;
  ELSE
    SELECT status INTO current_status FROM "PayrollRecord" WHERE id = COALESCE(OLD."recordId", NEW."recordId");
    IF current_status = 'CLOSED' THEN
      RAISE EXCEPTION 'Closed payroll lines are immutable';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER "PayrollRecord_closed_guard"
BEFORE UPDATE ON "PayrollRecord"
FOR EACH ROW EXECUTE FUNCTION atlas_payroll_closed_record_guard();

CREATE TRIGGER "PayrollLine_closed_guard"
BEFORE UPDATE OR DELETE ON "PayrollLine"
FOR EACH ROW EXECUTE FUNCTION atlas_payroll_closed_record_guard();

