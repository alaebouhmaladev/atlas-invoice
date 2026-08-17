-- Create Partial Unique Index for EmployeeAssignment to guarantee at most 1 active primary assignment per employee within a tenant
CREATE UNIQUE INDEX IF NOT EXISTS "EmployeeAssignment_active_primary_idx"
ON "EmployeeAssignment" ("tenantId", "employeeId")
WHERE "isPrimary" = true AND "endDate" IS NULL;
