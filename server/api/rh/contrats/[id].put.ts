import { requireHrPermission } from '~/server/utils/hrPermissions'
import { updateContract } from '~/server/services/hrContract.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.contract.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID contrat requis' })
  const body = await readBody(event)

  const contract = await updateContract(id, body, actor)
  return { success: true, data: contract }
})
