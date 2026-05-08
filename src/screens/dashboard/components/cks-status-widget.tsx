import { useQuery } from '@tanstack/react-query'
import { Activity01Icon } from '@hugeicons/core-free-icons'
import { WidgetShell } from './widget-shell'
import { cn } from '@/lib/utils'

type BridgeStatusResponse = {
  ok: boolean
  status?: 'up' | 'down' | 'degraded'
  latencyMs?: number
  url?: string
  error?: string
}

type SprintStatusResponse = {
  ok: boolean
  daysToDeadline?: number
  mvpStatus?: string
  vercelStatus?: string
  openTodos?: number
  stale?: boolean
  error?: string
}

type OpenRouterBalanceResponse = {
  ok: boolean
  balance_usd?: number
  spent_30d_usd?: number
  alert?: 'low_balance' | 'high_burn' | null
  error?: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'GET' })
  return (await res.json()) as T
}

function MiniCard({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string
  value: string
  subtitle?: string
  tone: 'ok' | 'warn' | 'err' | 'unknown'
}) {
  const toneClass = {
    ok: 'border-emerald-900 bg-emerald-950/40 text-emerald-300',
    warn: 'border-amber-900 bg-amber-950/40 text-amber-300',
    err: 'border-red-900 bg-red-950/40 text-red-300',
    unknown: 'border-neutral-800 bg-neutral-950/40 text-neutral-400',
  }[tone]

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-lg border px-3 py-2',
        toneClass,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="font-mono text-sm tabular-nums">{value}</p>
      {subtitle ? <p className="text-[10px] opacity-60">{subtitle}</p> : null}
    </div>
  )
}

export function CksStatusWidget({ onRemove }: { onRemove?: () => void }) {
  const bridge = useQuery({
    queryKey: ['cks', 'bridge-status'],
    queryFn: () => fetchJson<BridgeStatusResponse>('/api/cks/bridge-status'),
    refetchInterval: 60_000,
    retry: false,
  })

  const sprint = useQuery({
    queryKey: ['cks', 'sprint-status'],
    queryFn: () => fetchJson<SprintStatusResponse>('/api/cks/sprint-status'),
    refetchInterval: 60_000,
    retry: false,
  })

  const balance = useQuery({
    queryKey: ['cks', 'openrouter-balance'],
    queryFn: () =>
      fetchJson<OpenRouterBalanceResponse>('/api/cks/openrouter-balance'),
    refetchInterval: 5 * 60_000,
    retry: false,
  })

  const bridgeTone = !bridge.data?.ok
    ? 'unknown'
    : bridge.data.status === 'up'
      ? 'ok'
      : bridge.data.status === 'degraded'
        ? 'warn'
        : 'err'

  const sprintDays = sprint.data?.daysToDeadline ?? null
  const sprintTone =
    !sprint.data?.ok || sprint.data.stale
      ? 'unknown'
      : sprint.data.mvpStatus === 'on_track'
        ? 'ok'
        : sprint.data.mvpStatus === 'at_risk'
          ? 'warn'
          : 'err'

  const balanceTone = !balance.data?.ok
    ? 'unknown'
    : balance.data.alert === 'low_balance'
      ? 'err'
      : balance.data.alert === 'high_burn'
        ? 'warn'
        : 'ok'

  return (
    <WidgetShell
      size="medium"
      title="CKS Status"
      icon={Activity01Icon}
      onRemove={onRemove}
      className="h-full rounded-xl border border-neutral-200 dark:border-neutral-700 border-l-4 border-l-cyan-500 bg-white dark:bg-neutral-900 p-4 sm:p-5 shadow-[0_6px_20px_rgba(0,0,0,0.25)] [&_svg]:text-cyan-500"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <MiniCard
          label="Bridge Sergio"
          value={
            bridge.isLoading
              ? '…'
              : bridge.data?.ok
                ? bridge.data.status?.toUpperCase() ?? '—'
                : 'ERR'
          }
          subtitle={
            typeof bridge.data?.latencyMs === 'number'
              ? `${bridge.data.latencyMs}ms`
              : undefined
          }
          tone={bridgeTone}
        />

        <MiniCard
          label="Sprint MVP"
          value={
            sprint.isLoading
              ? '…'
              : !sprint.data?.ok
                ? 'ERR'
                : sprintDays === null
                  ? '—'
                  : sprintDays >= 0
                    ? `${sprintDays}d`
                    : `+${Math.abs(sprintDays)}d`
          }
          subtitle={
            sprint.data?.ok
              ? `${sprint.data.openTodos ?? 0} todos · ${sprint.data.vercelStatus ?? '?'}`
              : undefined
          }
          tone={sprintTone}
        />

        <MiniCard
          label="OpenRouter"
          value={
            balance.isLoading
              ? '…'
              : balance.data?.ok
                ? `$${balance.data.balance_usd?.toFixed(2) ?? '?'}`
                : 'ERR'
          }
          subtitle={
            balance.data?.ok && typeof balance.data.spent_30d_usd === 'number'
              ? `30d: $${balance.data.spent_30d_usd.toFixed(0)}`
              : undefined
          }
          tone={balanceTone}
        />
      </div>
    </WidgetShell>
  )
}
