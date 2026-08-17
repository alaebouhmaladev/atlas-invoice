import { requireHrPermission } from '~/server/utils/hrPermissions'
import { createContract } from '~/server/services/hrContract.service'

export default defineEventHandler(async (event) => {
  const actor = await requireHrPermission(event, 'hr.contract.manage')
  const body = await readBody(event)

  const contract = await createContract(body, actor)
  return { success: true, data: contract }
})
