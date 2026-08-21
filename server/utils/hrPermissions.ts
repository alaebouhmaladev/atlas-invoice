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
]

const ROLE_HR_PERMISSIONS: Record<Role, HrPermission[]> = {
  SUPER_ADMIN: ALL_PHASE_4_PERMISSIONS,
  HR_MANAGER: ALL_PHASE_4_PERMISSIONS,
  ACCOUNTANT: [
    'hr.employee.list',
    'hr.employee.read',
    'hr.assignment.read',
    'hr.contract.read',
    'hr.document.read',
    'hr.schedule.list',
    'hr.schedule.read',
    'hr.attendance.read',
    'hr.attendance.export'
  ],
  COMMERCIAL: []
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
    const err: any = new Error('Authentication is required to access this resource')
    err.statusCode = 401
    err.data = { code: 'UNAUTHORIZED', message: 'Authentication is required to access this resource' }
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
        actionUrl: '/admin/audit'
      })
    } catch {
      // Ignore logging failures to prevent swallowing original 403 error
    }

    const err: any = new Error(`Vous n'avez pas la permission requise (${permission}) pour accéder aux Ressources Humaines.`)
    err.statusCode = 403
    err.data = {
      code: 'FORBIDDEN',
      message: `Vous n'avez pas la permission requise (${permission}) pour accéder aux Ressources Humaines.`
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
