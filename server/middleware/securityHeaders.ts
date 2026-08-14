import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler((event) => {
  // Security headers for browser protection
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'X-Frame-Options', 'SAMEORIGIN')
  setResponseHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setResponseHeader(event, 'Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  setResponseHeader(
    event,
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; frame-ancestors 'self'; connect-src 'self';"
  )
})
