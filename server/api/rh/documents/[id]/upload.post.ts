import { requireHrPermission } from '~/server/utils/hrPermissions'
import { uploadDocumentVersion } from '~/server/services/hrDocument.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.document.upload')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID document requis' })

  let originalFileName = 'document'
  let mimeType = 'application/pdf'
  let fileBuffer: Buffer | null = null
  let replacementReason: string | undefined

  if (event.node.req.headers['content-type']?.includes('multipart/form-data')) {
    const parts = await readMultipartFormData(event)
    if (parts) {
      for (const part of parts) {
        if (part.name === 'file' && part.data) {
          fileBuffer = part.data
          if (part.filename) originalFileName = part.filename
          if (part.type) mimeType = part.type
        } else if (part.name === 'replacementReason') {
          replacementReason = part.data.toString('utf-8')
        }
      }
    }
  } else {
    const body = await readBody(event)
    if (body.fileBase64) {
      fileBuffer = Buffer.from(body.fileBase64, 'base64')
    }
    if (body.originalFileName) originalFileName = body.originalFileName
    if (body.mimeType) mimeType = body.mimeType
    if (body.replacementReason) replacementReason = body.replacementReason
  }

  if (!fileBuffer) {
    throw createError({ statusCode: 400, message: 'Fichier requis pour le téléversement.' })
  }

  const versionRecord = await uploadDocumentVersion({
    documentId: id,
    originalFileName,
    mimeType,
    buffer: fileBuffer,
    replacementReason
  }, actor)

  return { success: true, data: versionRecord }
})
