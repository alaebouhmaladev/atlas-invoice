import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getDocumentVersionBuffer } from '~/server/services/hrDocument.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.document.read')
  const versionId = getRouterParam(event, 'versionId')
  if (!versionId) throw createError({ statusCode: 400, message: 'ID version requis' })

  const fileData = await getDocumentVersionBuffer(versionId, actor)

  setHeader(event, 'Content-Type', fileData.mimeType)
  setHeader(event, 'Content-Disposition', `inline; filename="${encodeURIComponent(fileData.fileName)}"`)
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'private, no-cache, no-store, must-revalidate')

  return fileData.buffer
})
