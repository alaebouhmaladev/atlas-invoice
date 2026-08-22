import type { Role } from '@prisma/client'
import type { UserPublic } from '~/types/auth'

export type HrPermission =
  | 'hr.employee.list'
  | 'hr.employee.read'
  | 'hr.employee.create'
  | 'hr.employee.update'
  | 'hr.employee.archive'
  | 'hr.employee.restore'
  | 'hr.employee.view_sensitive'
  | 'hr.employee.manage_salary'
  | 'hr.employee.link_user'
  | 'hr.audit.read'
  | 'hr.organization.manage_sites'
  | 'hr.organization.manage_departments'
  | 'hr.organization.manage_positions'
  | 'hr.assignment.read'
  | 'hr.assignment.manage'
  | 'hr.contract.read'
  | 'hr.contract.manage'
  | 'hr.contract.view_salary'
  | 'hr.document.read'
  | 'hr.document.upload'
  | 'hr.document.replace'
  | 'hr.document.archive'
  | 'hr.document.read_medical'
  | 'hr.schedule.list'
  | 'hr.schedule.read'
  | 'hr.schedule.create'
  | 'hr.schedule.update'
  | 'hr.schedule.publish'
  | 'hr.schedule.lock'
  | 'hr.schedule.archive'
  | 'hr.shift.create'
  | 'hr.shift.update'
  | 'hr.shift.cancel'
  | 'hr.template.manage'
  | 'hr.coverage.manage'
  | 'hr.availability.manage'
  | 'hr.schedule.override_warning'
  | 'hr.attendance.read'
  | 'hr.attendance.clock'
  | 'hr.attendance.manage'
  | 'hr.attendance.correct_request'
  | 'hr.attendance.correct_review'
  | 'hr.attendance.validate'
  | 'hr.attendance.lock'
  | 'hr.attendance.unlock'
  | 'hr.attendance.policy.manage'
  | 'hr.attendance.terminal.manage'
  | 'hr.attendance.export'
  | 'hr.attendance.anomaly.resolve'
  | 'hr.leave.list'
  | 'hr.leave.read'
  | 'hr.leave.request'
  | 'hr.leave.create_for_employee'
  | 'hr.leave.review'
  | 'hr.leave.cancel'
  | 'hr.leave.manage_types'
  | 'hr.leave.manage_policies'
  | 'hr.leave.balance.read'
  | 'hr.leave.balance.adjust'
  | 'hr.leave.holiday.read'
  | 'hr.leave.holiday.manage'
  | 'hr.leave.absence.read'
  | 'hr.leave.absence.resolve'
  | 'hr.leave.read_medical'
  | 'hr.leave.export'
  | 'hr.leave.self.read'
  | 'hr.leave.self.request'
  | 'hr.leave.team.read'
  | 'hr.leave.review_manager'
  | 'hr.leave.review_hr'
  | 'hr.leave.override'
  | 'hr.leave.policy.read'
  | 'hr.leave.attachment.read'
  | 'hr.leave.attachment.medical'
  | 'hr.leave.audit.read'
  | 'hr.payroll.read'
  | 'hr.payroll.read_own'
  | 'hr.payroll.prepare'
  | 'hr.payroll.calculate'
  | 'hr.payroll.validate'
  | 'hr.payroll.close'
  | 'hr.payroll.reopen'
  | 'hr.payroll.variable.read'
  | 'hr.payroll.variable.manage'
  | 'hr.payroll.variable.approve'
  | 'hr.payroll.salary_component.manage'
  | 'hr.payroll.advance.manage'
  | 'hr.payroll.loan.manage'
  | 'hr.payroll.rules.read'
  | 'hr.payroll.rules.manage'
  | 'hr.payroll.payslip.read'
  | 'hr.payroll.payslip.read_own'
  | 'hr.payroll.export'
  | 'hr.payroll.bank_export'
  | 'hr.payroll.accounting_export'
  | 'hr.payroll.audit.read'

const ALL_PHASE_4_PERMISSIONS: HrPermission[] = [
  'hr.employee.list',
  'hr.employee.read',
  'hr.employee.create',
  'hr.employee.update',
  'hr.employee.archive',
  'hr.employee.restore',
  'hr.employee.view_sensitive',
  'hr.employee.manage_salary',
  'hr.employee.link_user',
  'hr.audit.read',
  'hr.organization.manage_sites',
  'hr.organization.manage_departments',
  'hr.organization.manage_positions',
  'hr.assignment.read',
  'hr.assignment.manage',
  'hr.contract.read',
  'hr.contract.manage',
  'hr.contract.view_salary',
  'hr.document.read',
  'hr.document.upload',
  'hr.document.replace',
  'hr.document.archive',
  'hr.document.read_medical',
  'hr.schedule.list',
  'hr.schedule.read',
  'hr.schedule.create',
  'hr.schedule.update',
  'hr.schedule.publish',
  'hr.schedule.lock',
  'hr.schedule.archive',
  'hr.shift.create',
  'hr.shift.update',
  'hr.shift.cancel',
  'hr.template.manage',
  'hr.coverage.manage',
  'hr.availability.manage',
  'hr.schedule.override_warning',
  'hr.attendance.read',
  'hr.attendance.clock',
  'hr.attendance.manage',
  'hr.attendance.correct_request',
  'hr.attendance.correct_review',
  'hr.attendance.validate',
  'hr.attendance.lock',
  'hr.attendance.unlock',
  'hr.attendance.policy.manage',
  'hr.attendance.terminal.manage',
  'hr.attendance.export',
  'hr.attendance.anomaly.resolve'
  , 'hr.leave.list'
  , 'hr.leave.read'
  , 'hr.leave.request'
  , 'hr.leave.create_for_employee'
  , 'hr.leave.review'
  , 'hr.leave.cancel'
  , 'hr.leave.manage_types'
  , 'hr.leave.manage_policies'
  , 'hr.leave.balance.read'
  , 'hr.leave.balance.adjust'
  , 'hr.leave.holiday.read'
  , 'hr.leave.holiday.manage'
  , 'hr.leave.absence.read'
  , 'hr.leave.absence.resolve'
  , 'hr.leave.read_medical'
  , 'hr.leave.export'
  , 'hr.leave.self.read'
  , 'hr.leave.self.request'
  , 'hr.leave.team.read'
  , 'hr.leave.review_manager'
  , 'hr.leave.review_hr'
  , 'hr.leave.override'
  , 'hr.leave.policy.read'
  , 'hr.leave.attachment.read'
  , 'hr.leave.attachment.medical'
  , 'hr.leave.audit.read'
  , 'hr.payroll.read'
  , 'hr.payroll.read_own'
  , 'hr.payroll.prepare'
  , 'hr.payroll.calculate'
  , 'hr.payroll.validate'
  , 'hr.payroll.close'
  , 'hr.payroll.reopen'
  , 'hr.payroll.variable.read'
  , 'hr.payroll.variable.manage'
  , 'hr.payroll.variable.approve'
  , 'hr.payroll.salary_component.manage'
  , 'hr.payroll.advance.manage'
  , 'hr.payroll.loan.manage'
  , 'hr.payroll.rules.read'
  , 'hr.payroll.rules.manage'
  , 'hr.payroll.payslip.read'
  , 'hr.payroll.payslip.read_own'
  , 'hr.payroll.export'
  , 'hr.payroll.bank_export'
  , 'hr.payroll.accounting_export'
  , 'hr.payroll.audit.read'
]

const ROLE_HR_PERMISSIONS: Record<Role, HrPermission[]> = {
  SUPER_ADMIN: ALL_PHASE_4_PERMISSIONS,
  HR_MANAGER: ALL_PHASE_4_PERMISSIONS.filter(permission => ![
    'hr.payroll.close',
    'hr.payroll.reopen',
    'hr.payroll.rules.manage',
    'hr.payroll.bank_export'
  ].includes(permission)),
  ACCOUNTANT: [
    'hr.employee.list',
    'hr.employee.read',
    'hr.assignment.read',
    'hr.contract.read',
    'hr.document.read',
    'hr.schedule.list',
    'hr.schedule.read',
    'hr.attendance.read',
    'hr.attendance.export',
    'hr.leave.list',
    'hr.leave.read',
    'hr.leave.balance.read',
    'hr.leave.holiday.read',
    'hr.leave.absence.read',
    'hr.leave.export',
    'hr.leave.policy.read'
    , 'hr.leave.self.read'
    , 'hr.payroll.read'
    , 'hr.payroll.variable.read'
    , 'hr.payroll.rules.read'
    , 'hr.payroll.payslip.read'
    , 'hr.payroll.export'
    , 'hr.payroll.accounting_export'
  ],
  COMMERCIAL: [
    'hr.leave.self.read',
    'hr.leave.self.request',
    'hr.leave.team.read',
    'hr.leave.review_manager',
    'hr.payroll.read_own',
    'hr.payroll.payslip.read_own'
  ]
}

export function hasHrPermission(user: UserPublic | null | undefined, permission: HrPermission): boolean {
  if (!user || !user.role) return false
  const permissions = ROLE_HR_PERMISSIONS[user.role] || []
  return permissions.includes(permission)
}

export async function requireHrPermission(event: any, permission: HrPermission): Promise<UserPublic> {
  const user = event?.context?.user || (await (async () => {
    const { getUserFromEvent } = await import('./auth')
    return getUserFromEvent(event)
  })())

  if (!user) {
    const err: any = new Error('Vous devez être authentifié pour accéder à cette ressource')
    err.statusCode = 401
    err.data = { code: 'UNAUTHORIZED', message: 'Vous devez être authentifié pour accéder à cette ressource' }
    throw err
  }
  if (!hasHrPermission(user, permission)) {
    // Log audit entry and persistent security notification for unauthorized HR access attempt
    try {
      const { createAuditEntry } = await import('../services/audit.service')
      const { createNotification } = await import('../services/notification.service')

      await createAuditEntry({
        userId: user.id,
        action: 'HR_UNAUTHORIZED_ACCESS_ATTEMPT',
        category: 'SECURITY',
        result: 'FAILURE',
        entityType: 'HR_RESOURCE',
        entityReference: permission,
        metadata: {
          attemptedPermission: permission,
          role: user.role
        }
      })

      await createNotification({
        recipientRole: 'SUPER_ADMIN',
        type: 'SECURITY_ALERT',
        severity: 'WARNING',
        title: 'Tentative d’accès RH non autorisée',
        message: `L’utilisateur ${user.name} (${user.role}) a tenté d’accéder sans la permission (${permission}).`,
        actionUrl: '/activites'
      })
    } catch {
      // Ignore logging failures to prevent swallowing original 403 error
    }

    const err: any = new Error('Vous ne disposez pas des droits nécessaires pour accéder à cette ressource RH.')
    err.statusCode = 403
    err.data = {
      code: 'FORBIDDEN',
      message: 'Vous ne disposez pas des droits nécessaires pour accéder à cette ressource RH.'
    }
    throw err
  }
  return user
}

export async function requireSiteManagerPermission(event: any, siteId: string, permission: HrPermission): Promise<UserPublic> {
  const user = await requireHrPermission(event, permission)

  if (user.role === 'SUPER_ADMIN' || user.role === 'HR_MANAGER') {
    return user
  }

  // Verify if user is linked to an Employee who is assigned as manager of target siteId
  const { prisma } = await import('./db')
  const emp = await prisma.employee.findFirst({
    where: {
      tenantId: user.tenantId || 'default-tenant',
      linkedUserId: user.id,
      archivedAt: null,
      managedSites: { some: { id: siteId } }
    }
  })

  if (!emp) {
    try {
      const { createAuditEntry } = await import('../services/audit.service')
      await createAuditEntry({
        userId: user.id,
        action: 'HR_PHASE3_UNAUTHORIZED_ACCESS_ATTEMPT',
        category: 'SECURITY',
        result: 'FAILURE',
        entityType: 'WorkSite',
        entityId: siteId,
        entityReference: permission,
        metadata: { attemptedPermission: permission, targetSiteId: siteId }
      })
    } catch {
      // Ignore audit failures
    }

    const err: any = new Error(`Accès non autorisé au site de travail (${siteId}).`)
    err.statusCode = 403
    err.data = { code: 'FORBIDDEN_SITE_SCOPE', message: `Accès non autorisé au site de travail.` }
    throw err
  }

  return user
}
