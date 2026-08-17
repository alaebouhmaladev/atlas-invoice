import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getDocumentById } from '~/server/services/hrDocument.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.document.read')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID document requis' })

  const doc = await getDocumentById(id, actor)
  return { success: true, data: doc }
})
