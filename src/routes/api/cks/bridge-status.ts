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

        // Sergio API v3 expone /health en raíz, NO bajo /bridge/v1/.
        // Cambio del path corrige el HTTP 404 que veía el panel A5.
        // Response shape: { status: "ok"|"degraded"|..., version, tables }
        const result = await cksFetch<unknown>('/health', {
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
