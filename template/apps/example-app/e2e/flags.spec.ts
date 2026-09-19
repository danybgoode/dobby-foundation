import { test, expect } from '@playwright/test'

// The `api` project — the deterministic gate. This spec is the app-level half of D1: with no Golden
// Frijoles credentials and no SDK installed, the app BOOTS and SERVES, and the flag reads its
// call-site default. If this ever needs credentials to pass, the fail-soft property is gone.
//
// TEMPLATE FILL-IN: keep this spec when you replace the rest of the example app. Point it at your
// own first flag; the assertion that matters is the one below it.
test('flags endpoint answers with the call-site default when nothing is configured', async ({ request }) => {
  const res = await request.get('/api/flags')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body['demo.hello_enabled']).toBe(false)
  // The status seam never carries credential material — it is safe to expose on a health endpoint.
  expect(JSON.stringify(body)).not.toContain('gf_flagread')
})

test('the app serves normally while the flag provider is degraded', async ({ request }) => {
  const health = await request.get('/api/health')
  expect(health.ok()).toBeTruthy()
  expect(await health.json()).toEqual({ ok: true })
})
