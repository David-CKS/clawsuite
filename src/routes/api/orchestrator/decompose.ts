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
  createGoal,
  getGoal,
  setSubtasks,
  updateGoal,
} from '../../../server/orchestrator-store'
import { decomposeGoal } from '../../../server/llm-decompose'

const DecomposeSchema = z.object({
  goalId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  source: z.enum(['ui', 'telegram', 'api']).optional(),
  telegramChatId: z.number().int().optional(),
  sessionKey: z.string().trim().min(1).optional(),
})

export const Route = createFileRoute('/api/orchestrator/decompose')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck

        const ip = getClientIp(request)
        if (!rateLimit(`orchestrator-decompose:${ip}`, 12, 60_000))
          return rateLimitResponse()

        try {
          const body = await request.json().catch(() => ({}))
          const parsed = DecomposeSchema.safeParse(body)
          if (!parsed.success) {
            return json(
              {
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
              },
              { status: 400 },
            )
          }
          const { goalId, title, description, source, telegramChatId, sessionKey } =
            parsed.data

          let goal = goalId ? await getGoal(goalId) : null
          if (!goal) {
            if (!title) {
              return json(
                { error: 'title is required when goalId is not provided' },
                { status: 400 },
              )
            }
            goal = await createGoal({
              title,
              description,
              source,
              telegramChatId,
            })
          }

          const decomposition = await decomposeGoal({
            title: goal.title,
            description: goal.description,
            sessionKey,
          })

          const updated = await setSubtasks(goal.id, decomposition.subtasks)
          if (!updated) {
            return json({ error: 'Goal disappeared mid-update' }, { status: 500 })
          }

          if (decomposition.error) {
            await updateGoal(goal.id, {
              notes: `Fallback decomposition used: ${decomposition.error}`,
            })
          }

          return json({
            goal: { ...updated, notes: updated.notes },
            decompositionSource: decomposition.source,
            decompositionError: decomposition.error,
          })
        } catch (err) {
          return json({ error: safeErrorMessage(err) }, { status: 500 })
        }
      },
    },
  },
})
