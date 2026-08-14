import { defineEventHandler, getRouterParam, readMultipartFormData, createError } from 'h3'
import { requireHrPermission } from '../../../../utils/hrPermissions'
import { updateEmployeePhoto } from '../../../../services/hrEmployee.service'

export default defineEventHandler(async (event) => {
  const user = await requireHrPermission(event, 'hr.employee.update')
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID d’employé manquant' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, message: 'Aucun fichier d’image fourni' })
  }

  const fileItem = formData.find(item => item.name === 'photo' || item.name === 'file') || formData[0]
  if (!fileItem || !fileItem.data) {
    throw createError({ statusCode: 400, message: 'Fichier d’image invalide' })
  }

  const updated = await updateEmployeePhoto(
    id,
    {
      originalName: fileItem.filename || 'photo.png',
      mimeType: fileItem.type || 'image/png',
      size: fileItem.data.length,
      buffer: fileItem.data
    },
    user
  )

  return {
    success: true,
    data: updated
  }
})
