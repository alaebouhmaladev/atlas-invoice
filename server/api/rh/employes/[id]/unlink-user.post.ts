import { defineEventHandler, getRouterParam, readBody, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { unlinkUserAccount } from '../../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.link_user')
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const body = await readBody(event).catch(() => ({}))
  if (body.confirm !== true && body.confirm !== 'UNLINK') {
    throw createError({
      statusCode: 400,
      message: 'La confirmation explicite de déliage (confirm: true ou "UNLINK") est requise.'
    })
  }

  const updated = await unlinkUserAccount(id, user)

  return {
    success: true,
    data: updated,
    message: 'Le compte utilisateur a été délié avec succès sans suppression des données.'
  }
})
