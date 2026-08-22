-- Kept separate because PostgreSQL requires newly added enum values to be committed
-- before they can participate in an exclusion-constraint predicate.
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_no_active_overlap"
  EXCLUDE USING gist (
    "tenantId" WITH =,
    "employeeId" WITH =,
    tsrange("startDate", "endDate", '[]') WITH &&
  ) WHERE ("status" IN ('SUBMITTED', 'PENDING_APPROVAL', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'CANCEL_REQUESTED'));
