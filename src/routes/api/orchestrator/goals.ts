import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  safeErrorMessage,
} from '../../../server/rate-limit'
import { readGoals } from '../../../server/orchestrator-store'

export const Route = createFileRoute('/api/orchestrator/goals')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const ip = getClientIp(request)
        if (!rateLimit(`orchestrator-goals-list:${ip}`, 60, 60_000))
          return rateLimitResponse()
        try {
          const goals = await readGoals()
          return json({ goals })
        } catch (err) {
          return json({ error: safeErrorMessage(err) }, { status: 500 })
        }
      },
    },
  },
})
