import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  countQueriesSince,
  getDailyHistogram,
  getRecentQueries,
} from '../../../server/cks-bridge'

export const Route = createFileRoute('/api/cks/bridge-recent-queries')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const url = new URL(request.url)
        const limit = Math.max(
          1,
          Math.min(100, Number(url.searchParams.get('limit') ?? 25) || 25),
        )
        const days = Math.max(
          1,
          Math.min(30, Number(url.searchParams.get('days') ?? 7) || 7),
        )

        const since24h = Date.now() - 24 * 60 * 60 * 1000

        return json({
          ok: true,
          recent: getRecentQueries(limit),
          daily: getDailyHistogram(days),
          last24h: countQueriesSince(since24h),
          checkedAt: new Date().toISOString(),
        })
      },
    },
  },
})
