import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'

const OPENROUTER_API = 'https://openrouter.ai/api/v1/credits'
const TIMEOUT_MS = 5_000
const LOW_BALANCE_THRESHOLD = 5
const HIGH_BURN_THRESHOLD = 100

type AlertKind = 'low_balance' | 'high_burn' | null

type OpenRouterCreditsResponse = {
  data?: {
    total_credits?: number
    total_usage?: number
  }
}

export const Route = createFileRoute('/api/cks/openrouter-balance')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey || apiKey.length === 0) {
          return json(
            {
              ok: false,
              error:
                'OPENROUTER_API_KEY missing — add to container .env and recreate',
            },
            { status: 503 },
          )
        }

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

        try {
          const res = await fetch(OPENROUTER_API, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          })

          if (!res.ok) {
            return json(
              { ok: false, error: `OpenRouter API returned HTTP ${res.status}` },
              { status: 503 },
            )
          }

          const body = (await res.json()) as OpenRouterCreditsResponse
          const totalCredits = body.data?.total_credits ?? 0
          const totalUsage = body.data?.total_usage ?? 0
          const balance = Math.max(0, totalCredits - totalUsage)

          let alert: AlertKind = null
          if (balance < LOW_BALANCE_THRESHOLD) alert = 'low_balance'
          else if (totalUsage > HIGH_BURN_THRESHOLD) alert = 'high_burn'

          return json({
            ok: true,
            balance_usd: Number(balance.toFixed(2)),
            spent_30d_usd: Number(totalUsage.toFixed(2)),
            total_credits_usd: Number(totalCredits.toFixed(2)),
            alert,
            checkedAt: new Date().toISOString(),
          })
        } catch (err) {
          const aborted = (err as Error)?.name === 'AbortError'
          return json(
            {
              ok: false,
              error: aborted
                ? 'OpenRouter API timeout'
                : err instanceof Error
                  ? err.message
                  : String(err),
            },
            { status: 503 },
          )
        } finally {
          clearTimeout(timer)
        }
      },
    },
  },
})
