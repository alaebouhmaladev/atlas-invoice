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
      statusMessage: 'Bad Request',
      data: { code: 'INVALID_ID', message: 'Identifiant de devis requis' }
    })
  }

  const reason = body?.reason || 'Restauration individuelle du devis'

  const result = await executeBulkAction({
    documentType: 'QUOTE',
    actionType: 'RESTORE',
    selectionMode: 'EXPLICIT',
    explicitIds: [id],
    confirmationPhrase: 'RESTAURER',
    reason,
    user: { id: user.id, name: user.name, role: user.role }
  })

  return {
    success: true,
    data: result
  }
})
