import { defineEventHandler } from 'h3'
import { getUserFromEvent } from '../utils/auth'

export default defineEventHandler(async (event) => {
  // Populate event.context.user for downstream handlers and server middleware
  await getUserFromEvent(event)
})
