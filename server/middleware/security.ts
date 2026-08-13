import { defineEventHandler, getRequestHeader, getRequestHost, createError } from 'h3'

export default defineEventHandler((event) => {
  const isProduction = process.env.NODE_ENV === 'production'

  // Set Security Headers
  event.node.res.setHeader('X-Content-Type-Options', 'nosniff')
  event.node.res.setHeader('X-Frame-Options', 'DENY')
  event.node.res.setHeader('X-XSS-Protection', '1; mode=block')
  event.node.res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (isProduction) {
    event.node.res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // CSRF protection for state-changing HTTP methods
  const method = event.node.req.method?.toUpperCase()
  if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const origin = getRequestHeader(event, 'origin')
    const referer = getRequestHeader(event, 'referer')
    const host = getRequestHost(event)

    if (origin) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden',
            data: { code: 'CSRF_FAILED', message: 'Cross-origin request blocked' }
          })
        }
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'statusCode' in err && (err as { statusCode: number }).statusCode === 403) throw err
      }
    } else if (referer) {
      try {
        const refererHost = new URL(referer).host
        if (refererHost !== host) {
          throw createError({
            statusCode: 403,
            statusMessage: 'Forbidden',
            data: { code: 'CSRF_FAILED', message: 'Cross-origin request blocked' }
          })
        }
      } catch (err: unknown) {
        if (typeof err === 'object' && err !== null && 'statusCode' in err && (err as { statusCode: number }).statusCode === 403) throw err
      }
    }
  }
})
