import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  safeErrorMessage,
} from '../../../server/rate-limit'
import {
  createGoal,
  getGoal,
  setSubtasks,
  updateGoal,
} from '../../../server/orchestrator-store'
import { decomposeGoal } from '../../../server/llm-decompose'
import {
  notifyGoalCreated,
  sendTelegramMessage,
} from '../../../server/telegram-notifier'

const TELEGRAM_SECRET_HEADER = 'x-telegram-bot-api-secret-token'

type TelegramMessage = {
  message_id?: number
  text?: string
  chat?: { id?: number }
}

type TelegramUpdate = {
  update_id?: number
  message?: TelegramMessage
  channel_post?: TelegramMessage
}

function pickMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? update.channel_post ?? null
}

function checkSecret(request: Request): boolean {
  const expected = process.env.CLAWSUITE_TELEGRAM_WEBHOOK_SECRET?.trim()
  if (!expected) return true
  const got = request.headers.get(TELEGRAM_SECRET_HEADER) ?? ''
  return got === expected
}

function parseCommand(text: string): {
  command: string
  args: string
} | null {
  const trimmed = text.trim()
  if (!trimmed.startsWith('/')) return null
  const space = trimmed.indexOf(' ')
  const command =
    space === -1
      ? trimmed.slice(1).toLowerCase()
      : trimmed.slice(1, space).toLowerCase()
  const args = space === -1 ? '' : trimmed.slice(space + 1).trim()
  const stripped = command.split('@')[0]
  return { command: stripped, args }
}

async function handleGoalCommand(
  chatId: number,
  text: string,
): Promise<void> {
  if (!text) {
    await sendTelegramMessage(
      chatId,
      'Usage: <code>/goal &lt;your goal here&gt;</code>',
    )
    return
  }
  const [titleLine, ...rest] = text.split('\n')
  const goal = await createGoal({
    title: titleLine.trim(),
    description: rest.join('\n').trim(),
    source: 'telegram',
    telegramChatId: chatId,
  })
  const decomposition = await decomposeGoal({
    title: goal.title,
    description: goal.description,
  })
  const updated = await setSubtasks(goal.id, decomposition.subtasks)
  if (decomposition.error) {
    await updateGoal(goal.id, {
      notes: `Fallback decomposition used: ${decomposition.error}`,
    })
  }
  if (updated) {
    await notifyGoalCreated(chatId, {
      id: updated.id,
      title: updated.title,
      subtasks: updated.subtasks,
    })
  }
}

async function handleApproveCommand(
  chatId: number,
  args: string,
): Promise<void> {
  const goalId = args.split(/\s+/)[0]?.trim()
  if (!goalId) {
    await sendTelegramMessage(
      chatId,
      'Usage: <code>/approve GOAL-ID</code>',
    )
    return
  }
  const goal = await getGoal(goalId)
  if (!goal) {
    await sendTelegramMessage(chatId, `Goal <code>${goalId}</code> not found.`)
    return
  }
  await updateGoal(goalId, { status: 'approved' })
  await sendTelegramMessage(
    chatId,
    `Goal <code>${goalId}</code> approved. Use the UI or POST /api/orchestrator/execute with a sessionKey to dispatch.`,
  )
}

async function handleStatusCommand(
  chatId: number,
  args: string,
): Promise<void> {
  const goalId = args.split(/\s+/)[0]?.trim()
  if (!goalId) {
    await sendTelegramMessage(
      chatId,
      'Usage: <code>/status GOAL-ID</code>',
    )
    return
  }
  const goal = await getGoal(goalId)
  if (!goal) {
    await sendTelegramMessage(chatId, `Goal <code>${goalId}</code> not found.`)
    return
  }
  const lines = [
    `🎯 <b>${goal.title}</b>`,
    `Status: <i>${goal.status}</i>`,
    `Sub-tasks:`,
    ...goal.subtasks.map(
      (st, i) => `${i + 1}. [${st.status}] ${st.title}`,
    ),
  ]
  await sendTelegramMessage(chatId, lines.join('\n'))
}

export const Route = createFileRoute('/api/telegram/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = getClientIp(request)
        if (!rateLimit(`telegram-webhook:${ip}`, 60, 60_000))
          return rateLimitResponse()

        if (!checkSecret(request)) {
          return json({ error: 'Forbidden' }, { status: 403 })
        }

        try {
          const update = (await request.json().catch(() => null)) as
            | TelegramUpdate
            | null
          if (!update) return json({ ok: true, ignored: 'invalid-json' })
          const message = pickMessage(update)
          if (!message) return json({ ok: true, ignored: 'no-message' })
          const chatId = message.chat?.id
          const text = message.text?.trim() ?? ''
          if (!chatId || !text) return json({ ok: true, ignored: 'empty' })

          const parsed = parseCommand(text)
          if (!parsed) {
            await sendTelegramMessage(
              chatId,
              'Send <code>/goal &lt;text&gt;</code> to create a goal, <code>/status ID</code> to inspect, or <code>/approve ID</code> to mark approved.',
            )
            return json({ ok: true, action: 'help' })
          }

          if (parsed.command === 'goal') {
            await handleGoalCommand(chatId, parsed.args)
            return json({ ok: true, action: 'goal' })
          }
          if (parsed.command === 'approve') {
            await handleApproveCommand(chatId, parsed.args)
            return json({ ok: true, action: 'approve' })
          }
          if (parsed.command === 'status') {
            await handleStatusCommand(chatId, parsed.args)
            return json({ ok: true, action: 'status' })
          }
          if (parsed.command === 'start' || parsed.command === 'help') {
            await sendTelegramMessage(
              chatId,
              [
                '<b>CKS Suite Orchestrator</b>',
                '/goal &lt;title&gt; — create a goal and auto-decompose it',
                '/status &lt;ID&gt; — show sub-tasks',
                '/approve &lt;ID&gt; — mark approved',
              ].join('\n'),
            )
            return json({ ok: true, action: 'help' })
          }
          await sendTelegramMessage(
            chatId,
            `Unknown command: <code>/${parsed.command}</code>. Send <code>/help</code>.`,
          )
          return json({ ok: true, action: 'unknown' })
        } catch (err) {
          return json({ error: safeErrorMessage(err) }, { status: 500 })
        }
      },
    },
  },
})
