import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createDocumentRecord } from '~/server/services/hrDocument.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.document.upload')
  const body = await readBody(event)

  const doc = await createDocumentRecord(body, actor)
  return { success: true, data: doc }
})
