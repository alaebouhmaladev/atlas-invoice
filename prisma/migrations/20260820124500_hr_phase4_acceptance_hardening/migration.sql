-- Additive DDL Migration for HR Phase 4 Acceptance Hardening
-- Enforce database-level partial unique index for open attendance sessions per tenant + employee

CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceDay_one_open_session_per_employee_idx"
ON "AttendanceDay" ("tenantId", "employeeId")
WHERE "status" = 'OPEN';
