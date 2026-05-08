import { randomUUID } from 'node:crypto'
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
  getGoal,
  patchSubtask,
  updateGoal,
  type SubTask,
} from '../../../server/orchestrator-store'
import { gatewayRpc } from '../../../server/gateway'
import {
  notifySubtaskUpdate,
  isTelegramConfigured,
} from '../../../server/telegram-notifier'

const ExecuteSchema = z.object({
  goalId: z.string().trim().min(1),
  sessionKey: z.string().trim().min(1),
  subtaskIds: z.array(z.string().min(1)).optional(),
})

type DispatchResponse = { runId?: string }

function buildPrompt(goalTitle: string, subtask: SubTask): string {
  return [
    `[Goal] ${goalTitle}`,
    `[Sub-task] ${subtask.title}`,
    subtask.description ? `[Details]\n${subtask.description}` : '',
    `[Agent persona] ${subtask.agent}`,
    'Execute this sub-task. Report concrete output.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export const Route = createFileRoute('/api/orchestrator/execute')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        const csrfCheck = requireJsonContentType(request)
        if (csrfCheck) return csrfCheck

        const ip = getClientIp(request)
        if (!rateLimit(`orchestrator-execute:${ip}`, 6, 60_000))
          return rateLimitResponse()

        try {
          const body = await request.json().catch(() => ({}))
          const parsed = ExecuteSchema.safeParse(body)
          if (!parsed.success) {
            return json(
              {
                error: 'Validation failed',
                details: parsed.error.flatten().fieldErrors,
              },
              { status: 400 },
            )
          }
          const { goalId, sessionKey, subtaskIds } = parsed.data

          const goal = await getGoal(goalId)
          if (!goal) {
            return json({ error: 'Goal not found' }, { status: 404 })
          }
          if (goal.subtasks.length === 0) {
            return json(
              { error: 'Goal has no subtasks. Run /decompose first.' },
              { status: 400 },
            )
          }

          await updateGoal(goalId, { status: 'executing' })

          const targets = subtaskIds
            ? goal.subtasks.filter((st) => subtaskIds.includes(st.id))
            : goal.subtasks.filter((st) => st.status === 'pending')

          if (targets.length === 0) {
            return json(
              { error: 'No eligible subtasks to execute' },
              { status: 400 },
            )
          }

          const dispatched: Array<{
            subtaskId: string
            runId?: string
            error?: string
          }> = []

          for (const subtask of targets) {
            await patchSubtask(goalId, subtask.id, {
              status: 'dispatching',
              startedAt: new Date().toISOString(),
            })
            try {
              const dispatch = await gatewayRpc<DispatchResponse>(
                'sessions.send',
                {
                  sessionKey,
                  message: buildPrompt(goal.title, subtask),
                  lane: 'subagent',
                  deliver: false,
                  timeoutMs: 60_000,
                  idempotencyKey: `orch-${goalId}-${subtask.id}-${randomUUID().slice(0, 6)}`,
                },
              )
              const runId = dispatch?.runId
              await patchSubtask(goalId, subtask.id, {
                status: 'running',
                runId,
              })
              dispatched.push({ subtaskId: subtask.id, runId })
              if (isTelegramConfigured()) {
                await notifySubtaskUpdate(goal.telegramChatId, goal.title, {
                  title: subtask.title,
                  status: 'running',
                })
              }
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err)
              await patchSubtask(goalId, subtask.id, {
                status: 'failed',
                error: message,
                finishedAt: new Date().toISOString(),
              })
              dispatched.push({ subtaskId: subtask.id, error: message })
              if (isTelegramConfigured()) {
                await notifySubtaskUpdate(goal.telegramChatId, goal.title, {
                  title: subtask.title,
                  status: 'failed',
                  error: message,
                })
              }
            }
          }

          const refreshed = await getGoal(goalId)
          return json({ goal: refreshed, dispatched })
        } catch (err) {
          return json({ error: safeErrorMessage(err) }, { status: 500 })
        }
      },
    },
  },
})
