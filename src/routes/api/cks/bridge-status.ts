import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'

const BRIDGE_URL = process.env.CKS_BRIDGE_URL || 'https://api.carkeysystem.com'
const BRIDGE_HEALTH_PATH = process.env.CKS_BRIDGE_HEALTH_PATH || '/health'
const TIMEOUT_MS = 5_000

type BridgeStatus = 'up' | 'down' | 'degraded'

async function probeBridge(): Promise<{
  status: BridgeStatus
  latencyMs: number
  httpCode: number
}> {
  const startedAt = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${BRIDGE_URL}${BRIDGE_HEALTH_PATH}`, {
      method: 'GET',
      signal: controller.signal,
    })
    const latencyMs = Date.now() - startedAt

    if (res.status === 200) {
      return { status: 'up', latencyMs, httpCode: 200 }
    }
    return { status: 'degraded', latencyMs, httpCode: res.status }
  } catch {
    const latencyMs = Date.now() - startedAt
    return { status: 'down', latencyMs, httpCode: 0 }
  } finally {
    clearTimeout(timer)
  }
}

export const Route = createFileRoute('/api/cks/bridge-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const probe = await probeBridge()
          return json({
            ok: true,
            url: BRIDGE_URL,
            status: probe.status,
            latencyMs: probe.latencyMs,
            httpCode: probe.httpCode,
            checkedAt: new Date().toISOString(),
          })
        } catch (err) {
          return json(
            {
              ok: false,
              url: BRIDGE_URL,
              status: 'down' as BridgeStatus,
              error: err instanceof Error ? err.message : String(err),
              checkedAt: new Date().toISOString(),
            },
            { status: 503 },
          )
        }
      },
    },
  },
})
