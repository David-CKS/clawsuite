import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '@/server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  requireJsonContentType,
} from '@/server/rate-limit'
import { probeSource } from '@/server/multi-source-router'
import type { AdditionalSource } from '@/types/sources'

type ProbeRequestBody = {
  source?: Partial<AdditionalSource>
  timeoutMs?: number
}

function isPlainSource(value: unknown): value is AdditionalSource {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.url === 'string' &&
    typeof v.enabled === 'boolean' &&
    (v.type === 'gateway' || v.type === 'mcp' || v.type === 'dashboard')
  )
}

export const Route = createFileRoute('/api/sources/probe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        const ip = getClientIp(request)
        if (!rateLimit(`sources-probe:${ip}`, 60, 60_000)) {
          return rateLimitResponse()
        }

        let body: ProbeRequestBody
        try {
          body = (await request.json()) as ProbeRequestBody
        } catch {
          return json(
            { ok: false, error: 'Invalid JSON body' },
            { status: 400 },
          )
        }

        if (!isPlainSource(body.source)) {
          return json(
            { ok: false, error: 'Missing or invalid `source` payload' },
            { status: 400 },
          )
        }

        const timeoutMs =
          typeof body.timeoutMs === 'number' &&
          body.timeoutMs > 0 &&
          body.timeoutMs <= 30_000
            ? body.timeoutMs
            : undefined

        const result = await probeSource(body.source, timeoutMs)
        return json({ ok: true, ...result })
      },
    },
  },
})
