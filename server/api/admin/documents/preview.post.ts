import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { previewBulkAction, type DocumentType, type SelectionMode } from '../../../services/documentManagement.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const { documentType, selectionMode, explicitIds, filters } = body || {}

  if (!documentType || !['INVOICE', 'QUOTE'].includes(documentType)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_DOCUMENT_TYPE', message: 'Type de document invalide.' }
    })
  }

  const mode: SelectionMode = selectionMode === 'ALL_FILTERED' ? 'ALL_FILTERED' : 'EXPLICIT'

  const preview = await previewBulkAction(documentType as DocumentType, mode, explicitIds, filters, user)

  return {
    success: true,
    data: preview
  }
})
