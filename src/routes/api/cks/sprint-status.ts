import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { isAuthenticated } from '../../../server/auth-middleware'

const STATE_DIR = process.env.CKS_OPENCLAW_STATE_DIR || '/openclaw-state'
const STATE_FILE = join(STATE_DIR, 'sprint-status.json')
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000

type SprintStatus = {
  ok: true
  sprint: string
  deadline: string
  daysToDeadline: number
  lastCommit: string | null
  vercelStatus: string
  tunnelStatus: string
  openTodos: number
  mvpStatus: string
  generatedAt: string
  stale: boolean
}

function safeNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function safeString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

export const Route = createFileRoute('/api/cks/sprint-status')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const [raw, fileStat] = await Promise.all([
            readFile(STATE_FILE, 'utf-8'),
            stat(STATE_FILE),
          ])
          const data = JSON.parse(raw) as Record<string, unknown>
          const ageMs = Date.now() - fileStat.mtimeMs

          const payload: SprintStatus = {
            ok: true,
            sprint: safeString(data.sprint, 'MVP'),
            deadline: safeString(data.deadline, '2026-05-01'),
            daysToDeadline: safeNumber(data.days_to_deadline ?? data.daysToDeadline),
            lastCommit:
              typeof data.last_commit === 'string'
                ? data.last_commit
                : typeof data.lastCommit === 'string'
                  ? data.lastCommit
                  : null,
            vercelStatus: safeString(data.vercel_status ?? data.vercelStatus, 'unknown'),
            tunnelStatus: safeString(data.tunnel_status ?? data.tunnelStatus, 'unknown'),
            openTodos: safeNumber(data.open_todos ?? data.openTodos),
            mvpStatus: safeString(data.mvp_status ?? data.mvpStatus, 'unknown'),
            generatedAt: safeString(
              data.generated_at ?? data.generatedAt,
              new Date(fileStat.mtimeMs).toISOString(),
            ),
            stale: ageMs > STALE_THRESHOLD_MS,
          }

          return json(payload)
        } catch (err) {
          const code = (err as NodeJS.ErrnoException)?.code
          if (code === 'ENOENT') {
            return json(
              {
                ok: false,
                error: 'sprint-status.json not found — verify bind mount',
                path: STATE_FILE,
              },
              { status: 503 },
            )
          }
          return json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 500 },
          )
        }
      },
    },
  },
})
