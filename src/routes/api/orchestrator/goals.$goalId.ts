import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { z } from 'zod'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  requireJsonContentType,
  safeErrorMessage,
} from '../../../server/rate-limit'
import {
  deleteGoal,
  getGoal,
  updateGoal,
} from '../../../server/orchestrator-store'

const GoalPatchSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  status: z
    .enum([
      'draft',
      'decomposed',
      'approved',
      'executing',
      'completed',
      'failed',
      'cancelled',
    ])
    .optional(),
})

function extractId(request: Request): string {
  const url = new URL(request.url)
  const segments = url.pathname.split('/').filter(Boolean)
  return decodeURIComponent(segments[segments.length - 1] ?? '').trim()
}

export const Route = createFileRoute('/api/orchestrator/goals/$goalId')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const ip = getClientIp(request)
        if (!rateLimit(`orchestrator-goal-get:${ip}`, 120, 60_000))
          return rateLimitResponse()
        try {
          const id = extractId(request)
          const goal = await getGoal(id)
          if (!goal) return json({ error: 'Goal not found' }, { status: 404 })
          return json({ goal })
        } catch (err) {
          return json({ error: safeErrorMessage(err) }, { status: 500 })
        }
      },

      PATCH: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck
        const ip = getClientIp(request)
        if (!rateLimit(`orchestrator-goal-patch:${ip}`, 30, 60_000))
          return rateLimitResponse()
        try {
          const id = extractId(request)
          const body = await request.json().catch(() => ({}))
          const parsed = GoalPatchSchema.safeParse(body)
          if (!parsed.success) {
            return json(
              {
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
              },
              { status: 400 },
            )
          }
          const updated = await updateGoal(id, parsed.data)
          if (!updated) return json({ error: 'Goal not found' }, { status: 404 })
          return json({ goal: updated })
        } catch (err) {
          return json({ error: safeErrorMessage(err) }, { status: 500 })
        }
      },

      DELETE: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const ip = getClientIp(request)
        if (!rateLimit(`orchestrator-goal-delete:${ip}`, 30, 60_000))
          return rateLimitResponse()
        try {
          const id = extractId(request)
          const ok = await deleteGoal(id)
          if (!ok) return json({ error: 'Goal not found' }, { status: 404 })
          return json({ ok: true })
        } catch (err) {
          return json({ error: safeErrorMessage(err) }, { status: 500 })
        }
      },
    },
  },
})
