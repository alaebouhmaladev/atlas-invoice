import { requireHrPermission } from '~/server/utils/hrPermissions'
import { terminateContract } from '~/server/services/hrContract.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.contract.manage')
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID contrat requis' })
  const body = await readBody(event)

  const contract = await terminateContract(id, body, actor)
  return { success: true, data: contract }
})
