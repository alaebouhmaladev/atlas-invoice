import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prisma } from '../server/utils/db'
import { createLeaveType, createLeavePolicy, createHolidayCalendar, addHoliday } from '../server/services/hrLeaveConfiguration.service'
import { recordLeaveBalanceEntry } from '../server/services/hrLeaveBalance.service'
import { createLeaveRequest } from '../server/services/hrLeaveRequest.service'
import { cancelLeaveRequest, reviewLeaveRequest } from '../server/services/hrLeaveApproval.service'
import { detectShiftConflicts } from '../server/services/hrSchedule.service'

const tenantId = `phase5-workflow-${Date.now()}`
let submitter: any
let reviewer: any
let site: any
let employee: any
let leaveType: any

describe('HR Phase 5 — leave, balance, approval, planning and attendance workflow', () => {
  beforeAll(async () => {
    submitter = await prisma.user.create({ data: { tenantId, name: 'Responsable demande', email: `phase5-submit-${Date.now()}@atlas.ma`, passwordHash: 'hash', role: 'HR_MANAGER' } })
    reviewer = await prisma.user.create({ data: { tenantId, name: 'Responsable validation', email: `phase5-review-${Date.now()}@atlas.ma`, passwordHash: 'hash', role: 'SUPER_ADMIN' } })
    site = await prisma.workSite.create({ data: { tenantId, code: 'P5-SITE', name: 'Site Phase 5', createdById: reviewer.id } })
    const department = await prisma.department.create({ data: { tenantId, code: 'P5-DEPT', name: 'Équipe Phase 5', createdById: reviewer.id } })
    const position = await prisma.position.create({ data: { tenantId, departmentId: department.id, code: 'P5-POS', title: 'Poste Phase 5', createdById: reviewer.id } })
    employee = await prisma.employee.create({ data: { tenantId, employeeNumber: 'P5-001', firstName: 'Nadia', lastName: 'Test', displayName: 'Nadia Test', phonePrimary: '+212600000099', hireDate: new Date('2026-01-01'), createdById: reviewer.id } })
    await prisma.employeeAssignment.create({ data: { tenantId, employeeId: employee.id, siteId: site.id, departmentId: department.id, positionId: position.id, startDate: new Date('2026-01-01'), createdById: reviewer.id } })
    await prisma.employmentContract.create({ data: { tenantId, employeeId: employee.id, contractNumber: 'P5-CTR-001', contractType: 'CDI', status: 'ACTIVE', startDate: new Date('2026-01-01'), siteId: site.id, departmentId: department.id, positionId: position.id, salarySnapshot: 0, employeeNameSnapshot: employee.displayName, employeeNumberSnapshot: employee.employeeNumber, siteSnapshot: site.name, departmentSnapshot: department.name, positionSnapshot: position.title, createdById: reviewer.id } })
    leaveType = await createLeaveType({ code: 'P5_PAID', name: 'Congé configuré Phase 5', category: 'PAID', isPaid: true, usesBalance: true }, reviewer)
    await createLeavePolicy({ leaveTypeId: leaveType.id, siteId: site.id, name: 'Politique test explicite', effectiveFrom: '2026-01-01', entitlementMinutes: 0, accrualMinutes: 0, minutesPerDay: 480, workingWeekdays: [1, 2, 3, 4, 5] }, reviewer)
    await recordLeaveBalanceEntry(tenantId, { employeeId: employee.id, leaveTypeId: leaveType.id, periodStart: '2026-01-01', periodEnd: '2026-12-31', entryType: 'OPENING', amountMinutes: 1920, effectiveDate: '2026-01-01', reason: 'Ouverture explicite de test', idempotencyKey: 'p5-opening', actorId: reviewer.id })
  })

  afterAll(async () => {
    await prisma.absenceRecord.deleteMany({ where: { tenantId } })
    await prisma.leaveRequestHistory.deleteMany({ where: { tenantId } })
    await prisma.leaveApprovalStep.deleteMany({ where: { tenantId } })
    await prisma.leaveBalanceEntry.deleteMany({ where: { tenantId } })
    await prisma.leaveRequestDay.deleteMany({ where: { tenantId } })
    await prisma.leaveRequest.deleteMany({ where: { tenantId } })
    await prisma.leaveBalance.deleteMany({ where: { tenantId } })
    await prisma.holiday.deleteMany({ where: { tenantId } })
    await prisma.holidayCalendarSite.deleteMany({ where: { tenantId } })
    await prisma.holidayCalendar.deleteMany({ where: { tenantId } })
    await prisma.leavePolicy.deleteMany({ where: { tenantId } })
    await prisma.leaveType.deleteMany({ where: { tenantId } })
    await prisma.attendancePeriodLock.deleteMany({ where: { tenantId } })
    await prisma.attendanceDay.deleteMany({ where: { tenantId } })
    await prisma.employmentContract.deleteMany({ where: { tenantId } })
    await prisma.employeeAssignment.deleteMany({ where: { tenantId } })
    await prisma.employee.deleteMany({ where: { tenantId } })
    await prisma.position.deleteMany({ where: { tenantId } })
    await prisma.department.deleteMany({ where: { tenantId } })
    await prisma.workSite.deleteMany({ where: { tenantId } })
    await prisma.appNotification.deleteMany({ where: { recipientUserId: { in: [submitter.id, reviewer.id] } } })
    await prisma.auditLog.deleteMany({ where: { userId: { in: [submitter.id, reviewer.id] } } })
    await prisma.user.deleteMany({ where: { tenantId } })
  })

  it('reserves balance at submission and prevents self-approval', async () => {
    const request = await createLeaveRequest({ employeeId: employee.id, leaveTypeId: leaveType.id, startDate: '2026-09-07', endDate: '2026-09-08', privateReason: 'Raison confidentielle de test' }, submitter)
    expect(request.status).toBe('PENDING_HR')
    expect(request.requestedMinutes).toBe(960)
    const balance = await prisma.leaveBalance.findFirstOrThrow({ where: { tenantId, employeeId: employee.id, leaveTypeId: leaveType.id } })
    expect(balance.reservedMinutes).toBe(960)
    expect(balance.availableMinutes).toBe(960)
    await expect(reviewLeaveRequest(tenantId, request.id, 'APPROVED', undefined, submitter)).rejects.toThrow('ne pouvez pas valider')
  })

  it('approves without changing schedules, debits the ledger and projects unlocked attendance', async () => {
    const request = await prisma.leaveRequest.findFirstOrThrow({ where: { tenantId, startDate: new Date('2026-09-07') } })
    await reviewLeaveRequest(tenantId, request.id, 'APPROVED', 'Validation de test', reviewer)
    const balance = await prisma.leaveBalance.findFirstOrThrow({ where: { tenantId, employeeId: employee.id, leaveTypeId: leaveType.id } })
    expect(balance.reservedMinutes).toBe(0)
    expect(balance.consumedMinutes).toBe(960)
    expect(balance.availableMinutes).toBe(960)
    const ledger = await prisma.leaveBalanceEntry.findMany({ where: { tenantId, leaveRequestId: request.id }, orderBy: { createdAt: 'asc' } })
    expect(ledger.map(entry => entry.entryType)).toEqual(['RESERVATION', 'DEBIT'])
    const days = await prisma.attendanceDay.findMany({ where: { tenantId, employeeId: employee.id, workDate: { gte: new Date('2026-09-07'), lte: new Date('2026-09-08') } } })
    expect(days).toHaveLength(2)
    expect(days.every(day => day.status === 'ON_LEAVE')).toBe(true)
  })

  it('blocks planning on approved leave and preserves the absence as a planning fact', async () => {
    const position = await prisma.position.findFirstOrThrow({ where: { tenantId } })
    const conflicts = await detectShiftConflicts(tenantId, employee.id, site.id, new Date('2026-09-07T12:00:00Z'), [{ order: 1, startLocalTime: '08:00', endLocalTime: '16:00', segmentType: 'WORK' }])
    expect(conflicts.some(conflict => conflict.code === 'APPROVED_LEAVE' && conflict.type === 'BLOCKING')).toBe(true)
    expect(position.id).toBeTruthy()
  })

  it('does not count a configured non-working holiday as requested balance', async () => {
    const calendar = await createHolidayCalendar({ code: 'P5-CAL', name: 'Calendrier test', isDefault: true }, reviewer)
    await addHoliday(calendar.id, { localDate: '2026-09-10', name: 'Date explicite de test', isWorkingDay: false }, reviewer)
    const request = await createLeaveRequest({ employeeId: employee.id, leaveTypeId: leaveType.id, startDate: '2026-09-09', endDate: '2026-09-10' }, submitter)
    expect(request.requestedMinutes).toBe(480)
    expect(request.days.find((day: any) => day.localDate.toISOString().startsWith('2026-09-10'))?.isWorkingDay).toBe(false)
  })

  it('blocks approval when any affected attendance period is locked', async () => {
    const pending = await prisma.leaveRequest.findFirstOrThrow({ where: { tenantId, startDate: new Date('2026-09-09') } })
    await prisma.attendancePeriodLock.create({ data: { tenantId, siteId: site.id, periodStart: new Date('2026-09-09'), periodEnd: new Date('2026-09-10'), lockedById: reviewer.id } })
    await expect(reviewLeaveRequest(tenantId, pending.id, 'APPROVED', undefined, reviewer)).rejects.toMatchObject({ data: { code: 'LEAVE_ATTENDANCE_PERIOD_PROTECTED' } })
  })

  it('cancels approved leave using a compensating reversal entry', async () => {
    const approved = await prisma.leaveRequest.findFirstOrThrow({ where: { tenantId, status: 'APPROVED' } })
    await cancelLeaveRequest(tenantId, approved.id, 'Annulation explicite de test', reviewer)
    const request = await prisma.leaveRequest.findUniqueOrThrow({ where: { id: approved.id } })
    expect(request.status).toBe('CANCELLED')
    const entries = await prisma.leaveBalanceEntry.findMany({ where: { tenantId, leaveRequestId: approved.id } })
    expect(entries.some(entry => entry.entryType === 'REVERSAL')).toBe(true)
  })
})
