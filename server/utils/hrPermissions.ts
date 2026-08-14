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

const ROLE_HR_PERMISSIONS: Record<Role, HrPermission[]> = {
  SUPER_ADMIN: [
    'hr.employee.list',
    'hr.employee.read',
    'hr.employee.create',
    'hr.employee.update',
    'hr.employee.archive',
    'hr.employee.restore',
    'hr.employee.view_sensitive',
    'hr.employee.manage_salary',
    'hr.employee.link_user',
    'hr.audit.read'
  ],
  HR_MANAGER: [
    'hr.employee.list',
    'hr.employee.read',
    'hr.employee.create',
    'hr.employee.update',
    'hr.employee.archive',
    'hr.employee.restore',
    'hr.employee.view_sensitive',
    'hr.employee.manage_salary',
    'hr.employee.link_user',
    'hr.audit.read'
  ],
  ACCOUNTANT: [
    'hr.employee.list',
    'hr.employee.read'
  ],
  COMMERCIAL: []
}

export function hasHrPermission(user: UserPublic | null | undefined, permission: HrPermission): boolean {
  if (!user || !user.role) return false
  const permissions = ROLE_HR_PERMISSIONS[user.role] || []
  return permissions.includes(permission)
}

export async function requireHrPermission(event: any, permission: HrPermission): Promise<UserPublic> {
  const { getUserFromEvent } = await import('./auth')
  const user = await getUserFromEvent(event)
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
