import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import { cksFetch, getBridgeApiKey } from '../../../server/cks-bridge'

type StatsRecord = Record<string, unknown>

function readNumber(record: StatsRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const v = record[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string') {
      const parsed = Number(v.replace(/[,\s]/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

export const Route = createFileRoute('/api/cks/bridge-stats')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        if (!getBridgeApiKey()) {
          return json(
            {
              ok: false,
              error: 'SERGIO_API_KEY not configured',
              checkedAt: new Date().toISOString(),
            },
            { status: 503 },
          )
        }

        const result = await cksFetch<StatsRecord>('/bridge/v1/stats', {
          method: 'GET',
          timeoutMs: 6_000,
        })

        if (!result.ok) {
          return json(
            {
              ok: false,
              error: result.error,
              status: result.status,
              latencyMs: result.durationMs,
              checkedAt: new Date().toISOString(),
            },
            { status: 502 },
          )
        }

        const raw = (result.data ?? {}) as StatsRecord
        const procedures = readNumber(raw, 'procedures', 'procedures_total', 'total_procedures')
        const verified = readNumber(raw, 'verified', 'procedures_verified', 'verified_procedures')
        const vehicles = readNumber(raw, 'vehicles', 'vehicles_total', 'total_vehicles')
        const brands = readNumber(raw, 'brands', 'brands_total', 'total_brands')
        const linksFromRaw = readNumber(raw, 'links', 'vehicle_procedure_links', 'mappings')

        let coveragePercent = readNumber(raw, 'coverage', 'coverage_percent', 'verified_percent')
        if (coveragePercent === null && verified !== null && procedures !== null && procedures > 0) {
          coveragePercent = (verified / procedures) * 100
        }

        return json({
          ok: true,
          procedures,
          verified,
          vehicles,
          brands,
          links: linksFromRaw,
          coveragePercent,
          latencyMs: result.durationMs,
          checkedAt: new Date().toISOString(),
          raw,
        })
      },
    },
  },
})
