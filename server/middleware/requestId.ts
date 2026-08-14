import { defineEventHandler, setResponseHeader } from 'h3'
import { randomBytes } from 'crypto'

export default defineEventHandler((event) => {
  const existingHeader = event.node.req.headers['x-request-id']
  const requestId = (typeof existingHeader === 'string' && existingHeader.trim())
    ? existingHeader.trim()
    : `req_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`

  event.context.requestId = requestId
  setResponseHeader(event, 'X-Request-Id', requestId)
})
