import { requireHrPermission } from '~/server/utils/hrPermissions'
import { getContractById } from '~/server/services/hrContract.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.contract.read')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID contrat requis' })

  const contract = await getContractById(id, actor)
  return { success: true, data: contract }
})
