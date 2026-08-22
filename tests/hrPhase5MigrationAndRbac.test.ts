import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { prisma } from '../server/utils/db'
import { hasHrPermission } from '../server/utils/hrPermissions'

describe('HR Phase 5 — additive migration and RBAC acceptance', () => {
  it('contains the complete additive schema without destructive DDL', () => {
    const sql = fs.readFileSync(path.join(process.cwd(), 'prisma/migrations/20260821000000_add_hr_phase5_leave_absence_holidays/migration.sql'), 'utf8')
    for (const table of ['LeaveType', 'LeavePolicy', 'LeaveBalance', 'LeaveBalanceEntry', 'LeaveRequest', 'LeaveRequestDay', 'LeaveApprovalStep', 'LeaveRequestHistory', 'HolidayCalendar', 'Holiday', 'AbsenceRecord']) {
      expect(sql).toContain(`CREATE TABLE "${table}"`)
    }
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(sql).toContain('HolidayCalendar_one_default_per_tenant_idx')
  })

  it('adds request numbering, attachments and overlap protection through additive hardening migrations', () => {
    const hardening = fs.readFileSync(path.join(process.cwd(), 'prisma/migrations/20260822000000_hr_phase5_workflow_exports_hardening/migration.sql'), 'utf8')
    const overlap = fs.readFileSync(path.join(process.cwd(), 'prisma/migrations/20260822000001_hr_phase5_active_request_overlap/migration.sql'), 'utf8')
    expect(hardening).toContain('CREATE TABLE "LeaveRequestAttachment"')
    expect(hardening).toContain('LeaveRequest_tenantId_requestNumber_key')
    expect(hardening).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i)
    expect(overlap).toContain('LeaveRequest_no_active_overlap')
    expect(overlap).toContain('EXCLUDE USING gist')
  })

  it('can query every deployed Phase 5 table', async () => {
    const counts = await Promise.all([
      prisma.leaveType.count(), prisma.leavePolicy.count(), prisma.leaveBalance.count(), prisma.leaveBalanceEntry.count(),
      prisma.leaveRequest.count(), prisma.leaveRequestDay.count(), prisma.leaveApprovalStep.count(), prisma.leaveRequestHistory.count(),
      prisma.holidayCalendar.count(), prisma.holiday.count(), prisma.absenceRecord.count()
    ])
    expect(await prisma.leaveRequestAttachment.count()).toBeGreaterThanOrEqual(0)
    expect(counts).toHaveLength(11)
    expect(counts.every(value => Number.isInteger(value))).toBe(true)
  })

  it('grants operational control only to HR roles and read-only access to accountants', () => {
    const user = (role: 'SUPER_ADMIN' | 'HR_MANAGER' | 'ACCOUNTANT' | 'COMMERCIAL') => ({ id: role, name: role, email: `${role}@atlas.ma`, role, isActive: true, createdAt: new Date() })
    expect(hasHrPermission(user('SUPER_ADMIN'), 'hr.leave.balance.adjust')).toBe(true)
    expect(hasHrPermission(user('HR_MANAGER'), 'hr.leave.review')).toBe(true)
    expect(hasHrPermission(user('ACCOUNTANT'), 'hr.leave.balance.read')).toBe(true)
    expect(hasHrPermission(user('ACCOUNTANT'), 'hr.leave.review')).toBe(false)
    expect(hasHrPermission(user('COMMERCIAL'), 'hr.leave.read')).toBe(false)
    expect(hasHrPermission(user('COMMERCIAL'), 'hr.leave.self.request')).toBe(true)
    expect(hasHrPermission(user('COMMERCIAL'), 'hr.leave.team.read')).toBe(true)
    expect(hasHrPermission(user('COMMERCIAL'), 'hr.leave.review_manager')).toBe(true)
    expect(hasHrPermission(user('COMMERCIAL'), 'hr.leave.review_hr')).toBe(false)
    expect(hasHrPermission(user('ACCOUNTANT'), 'hr.leave.read_medical')).toBe(false)
  })
})
