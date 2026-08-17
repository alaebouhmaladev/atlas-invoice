import { requireHrPermission } from '~/server/utils/hrPermissions'
import { checkHrExpirations } from '~/server/services/hrExpirationNotification.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.contract.read')
  const tenantId = actor.tenantId || 'default-tenant'

  const res = await checkHrExpirations(tenantId)
  return { success: true, ...res }
})
