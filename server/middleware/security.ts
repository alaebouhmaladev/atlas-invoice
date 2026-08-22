import { defineEventHandler, getRequestHeader, getRequestHost, createError } from 'h3'
import { isSameOriginRequestUrl } from '../utils/requestSecurity'

export default defineEventHandler((event) => {
  // CSRF protection for state-changing HTTP methods
  const method = event.node.req.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = getRequestHeader(event, 'origin')
    const referer = getRequestHeader(event, 'referer')
    const host = getRequestHost(event)

    const requestSource = origin || referer
    if (requestSource && !isSameOriginRequestUrl(requestSource, host)) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Accès interdit',
        data: { code: 'CSRF_FAILED', message: 'La requête provenant d’une autre origine a été bloquée' }
      })
    }
  }
})
