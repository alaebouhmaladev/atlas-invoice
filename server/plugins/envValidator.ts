export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV === 'production') {
    const requiredVars = ['DATABASE_URL', 'SESSION_SECRET']
    const missing = requiredVars.filter((v) => !process.env[v] || process.env[v]?.includes('CHANGE_THIS'))

    if (missing.length > 0) {
      console.error(`[FATAL-SECURITY] Missing or default production environment variables: ${missing.join(', ')}`)
      console.error('[FATAL-SECURITY] Application startup aborted to protect production data.')
      if (process.env.STRICT_ENV_CHECK === 'true') {
        throw new Error(`Missing production environment variables: ${missing.join(', ')}`)
      }
    } else {
      console.log('[SECURITY-ENV] Production environment variables validated successfully.')
    }
  }
})
