import http from 'node:http'

export async function runSmokeTests(targetUrl: string = 'http://localhost:3000') {
  console.log(`[SMOKE-TEST] Starting Production Smoke Tests against: ${targetUrl}...`)

  const endpoints = [
    { path: '/api/health/live', expectedStatus: 200, name: 'Process Liveness Check' },
    { path: '/api/health/ready', expectedStatus: 200, name: 'Application Readiness Check' },
    { path: '/login', expectedStatus: 200, name: 'Login Page Access' },
    { path: '/api/invoices/fake-id/pdf', expectedStatus: 401, name: 'Protected PDF Unauthorized Rejection' },
    { path: '/api/dashboard/stats', expectedStatus: 401, name: 'Protected Dashboard API Authorization' }
  ]

  let passed = 0
  let failed = 0

  for (const ep of endpoints) {
    try {
      const res = await new Promise<{ statusCode: number }>((resolve, reject) => {
        const req = http.get(`${targetUrl}${ep.path}`, (r) => {
          resolve({ statusCode: r.statusCode || 500 })
        })
        req.on('error', reject)
        req.setTimeout(5000, () => {
          req.destroy()
          reject(new Error('Request timeout'))
        })
      })

      if (res.statusCode === ep.expectedStatus) {
        console.log(`  ✓ PASSED: ${ep.name} (${ep.path} -> ${res.statusCode})`)
        passed++
      } else {
        console.error(`  ✗ FAILED: ${ep.name} (${ep.path} -> Expected ${ep.expectedStatus}, got ${res.statusCode})`)
        failed++
      }
    } catch (err: any) {
      console.error(`  ✗ ERROR: ${ep.name} (${ep.path} -> ${err?.message || err})`)
      failed++
    }
  }

  console.log(`[SMOKE-TEST] Finished: ${passed} Passed, ${failed} Failed.`)
  if (failed > 0) {
    throw new Error(`Smoke tests failed: ${failed} endpoint(s) returned unexpected responses`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2] || 'http://localhost:3000'
  runSmokeTests(target).catch((err) => {
    console.error('[SMOKE-TEST-FATAL]', err)
    process.exit(1)
  })
}
