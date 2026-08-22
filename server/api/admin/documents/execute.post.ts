import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { executeBulkAction, type BulkExecutionInput } from '../../../services/documentManagement.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const {
    documentType,
    actionType,
    selectionMode,
    explicitIds,
    filters,
    confirmationPhrase,
    reason,
    password,
    idempotencyKey
  } = body || {}

  if (!documentType || !['INVOICE', 'QUOTE'].includes(documentType)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_DOCUMENT_TYPE', message: 'Type de document invalide.' }
    })
  }

  if (!actionType || !['ARCHIVE', 'DELETE_DRAFTS', 'MIXED_CLEANUP', 'RESTORE'].includes(actionType)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ACTION_TYPE', message: 'Action invalide.' }
    })
  }

  const requestId = event.node.req.headers['x-request-id'] as string | undefined

  const input: BulkExecutionInput = {
    documentType,
    actionType,
    selectionMode: selectionMode === 'ALL_FILTERED' ? 'ALL_FILTERED' : 'EXPLICIT',
    explicitIds,
    filters,
    confirmationPhrase: confirmationPhrase || '',
    reason: reason || '',
    password,
    idempotencyKey,
    requestId,
    user: {
      id: user.id,
      name: user.name,
      role: user.role
    }
  }

  const result = await executeBulkAction(input)

  return {
    success: true,
    data: result
  }
})
