const TELEGRAM_API_BASE = 'https://api.telegram.org/bot'

function getBotToken(): string | null {
  const token = process.env.CLAWSUITE_TELEGRAM_BOT_TOKEN?.trim()
  return token && token.length > 0 ? token : null
}

function getDefaultChatId(): number | null {
  const raw = process.env.CLAWSUITE_TELEGRAM_DEFAULT_CHAT_ID?.trim()
  if (!raw) return null
  const num = Number(raw)
  return Number.isFinite(num) ? num : null
}

export type TelegramSendResult =
  | { ok: true; messageId?: number }
  | { ok: false; error: string }

export async function sendTelegramMessage(
  chatId: number | null | undefined,
  text: string,
): Promise<TelegramSendResult> {
  const token = getBotToken()
  if (!token) {
    return { ok: false, error: 'CLAWSUITE_TELEGRAM_BOT_TOKEN is not configured' }
  }
  const targetChat = chatId ?? getDefaultChatId()
  if (!targetChat) {
    return { ok: false, error: 'No chat_id provided and no default configured' }
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE}${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChat,
          text: text.slice(0, 4096),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      },
    )
    if (!response.ok) {
      const body = await response.text().catch(() => '')
      return { ok: false, error: `Telegram API ${response.status}: ${body}` }
    }
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean
      result?: { message_id?: number }
      description?: string
    } | null
    if (!json?.ok) {
      return { ok: false, error: json?.description ?? 'unknown Telegram error' }
    }
    return { ok: true, messageId: json.result?.message_id }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export function isTelegramConfigured(): boolean {
  return getBotToken() !== null
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function notifyGoalCreated(
  chatId: number | null | undefined,
  goal: { id: string; title: string; subtasks: { title: string }[] },
): Promise<TelegramSendResult> {
  const lines = [
    `🎯 <b>Goal created:</b> ${escapeHtml(goal.title)}`,
    `<code>${escapeHtml(goal.id)}</code>`,
    '',
    `<b>Sub-tasks (${goal.subtasks.length}):</b>`,
    ...goal.subtasks.map(
      (st, idx) => `${idx + 1}. ${escapeHtml(st.title)}`,
    ),
    '',
    'Reply with <code>/approve ' +
      escapeHtml(goal.id) +
      '</code> to start execution.',
  ]
  return sendTelegramMessage(chatId, lines.join('\n'))
}

export function notifySubtaskUpdate(
  chatId: number | null | undefined,
  goalTitle: string,
  subtask: { title: string; status: string; error?: string },
): Promise<TelegramSendResult> {
  const icon =
    subtask.status === 'done'
      ? '✅'
      : subtask.status === 'failed'
        ? '❌'
        : subtask.status === 'running'
          ? '▶️'
          : '•'
  const lines = [
    `${icon} <b>${escapeHtml(goalTitle)}</b>`,
    `${escapeHtml(subtask.title)} → <i>${escapeHtml(subtask.status)}</i>`,
  ]
  if (subtask.error) lines.push(`<code>${escapeHtml(subtask.error)}</code>`)
  return sendTelegramMessage(chatId, lines.join('\n'))
}
