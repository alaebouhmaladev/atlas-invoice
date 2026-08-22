import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { executeBulkAction } from '../../../services/documentManagement.service'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = event.context.params?.id
  const body = await readBody(event).catch(() => ({}))

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Requête invalide',
      data: { code: 'INVALID_ID', message: 'Identifiant de devis requis' }
    })
  }

  const { confirmationPhrase, reason, password } = body || {}

  const result = await executeBulkAction({
    documentType: 'QUOTE',
    actionType: 'DELETE_DRAFTS',
    selectionMode: 'EXPLICIT',
    explicitIds: [id],
    confirmationPhrase: confirmationPhrase || 'SUPPRIMER',
    reason: reason || 'Suppression définitive du brouillon de devis',
    password,
    user: { id: user.id, name: user.name, role: user.role }
  })

  return {
    success: true,
    data: result
  }
})
