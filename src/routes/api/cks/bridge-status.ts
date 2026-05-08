import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  cksFetch,
  getBridgeApiKey,
  getBridgeBaseUrl,
} from '../../../server/cks-bridge'

export const Route = createFileRoute('/api/cks/bridge-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const baseUrl = getBridgeBaseUrl()
        const hasApiKey = Boolean(getBridgeApiKey())

        if (!hasApiKey) {
          return json({
            ok: false,
            up: false,
            baseUrl,
            hasApiKey: false,
            error: 'SERGIO_API_KEY not configured',
            checkedAt: new Date().toISOString(),
          })
        }

        const result = await cksFetch<unknown>('/bridge/v1/health', {
          method: 'GET',
          timeoutMs: 4_000,
        })

        return json({
          ok: result.ok,
          up: result.ok,
          baseUrl,
          hasApiKey: true,
          status: result.status,
          latencyMs: result.durationMs,
          error: result.ok ? undefined : result.error,
          checkedAt: new Date().toISOString(),
        })
      },
    },
  },
})
