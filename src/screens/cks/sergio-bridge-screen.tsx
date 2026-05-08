import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Activity01Icon,
  AlertCircleIcon,
  Car01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  DatabaseIcon,
  FactoryIcon,
  RefreshIcon,
  TrafficLightIcon,
} from '@hugeicons/core-free-icons'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'

type BridgeStatus = {
  ok: boolean
  up: boolean
  baseUrl: string
  hasApiKey: boolean
  status?: number
  latencyMs?: number
  error?: string
  checkedAt: string
}

type BridgeStats = {
  ok: boolean
  procedures: number | null
  verified: number | null
  vehicles: number | null
  brands: number | null
  links: number | null
  coveragePercent: number | null
  latencyMs?: number
  checkedAt: string
  error?: string
}

type RecentQuery = {
  ts: number
  path: string
  method: string
  status: number
  durationMs: number
  ok: boolean
  error?: string
}

type DailyCount = {
  date: string
  count: number
  ok: number
  failed: number
}

type RecentQueries = {
  ok: boolean
  recent: RecentQuery[]
  daily: DailyCount[]
  last24h: number
  checkedAt: string
}

const STATUS_REFRESH_MS = 30_000
const STATS_REFRESH_MS = 60_000
const QUERIES_REFRESH_MS = 15_000

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin' })
  if (!res.ok && res.status !== 502 && res.status !== 503) {
    throw new Error(`Request failed: ${res.status}`)
  }
  return (await res.json()) as T
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-ES').format(Math.round(n))
}

function formatPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${n.toFixed(1)}%`
}

function formatLatency(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return `hace ${Math.max(1, Math.round(diff / 1000))}s`
  if (diff < 3_600_000) return `hace ${Math.round(diff / 60_000)} min`
  if (diff < 86_400_000) return `hace ${Math.round(diff / 3_600_000)} h`
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function SergioBridgeScreen() {
  const statusQuery = useQuery({
    queryKey: ['cks-bridge-status'],
    queryFn: () => fetchJson<BridgeStatus>('/api/cks/bridge-status'),
    refetchInterval: STATUS_REFRESH_MS,
    retry: false,
  })

  const statsQuery = useQuery({
    queryKey: ['cks-bridge-stats'],
    queryFn: () => fetchJson<BridgeStats>('/api/cks/bridge-stats'),
    refetchInterval: STATS_REFRESH_MS,
    retry: false,
    enabled: statusQuery.data?.up === true,
  })

  const queriesQuery = useQuery({
    queryKey: ['cks-bridge-recent-queries'],
    queryFn: () =>
      fetchJson<RecentQueries>(
        '/api/cks/bridge-recent-queries?limit=25&days=7',
      ),
    refetchInterval: QUERIES_REFRESH_MS,
    retry: false,
  })

  const status = statusQuery.data
  const stats = statsQuery.data
  const queries = queriesQuery.data

  const lastChecked = status?.checkedAt
    ? new Date(status.checkedAt).toLocaleString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—'

  const heroTone: 'up' | 'down' | 'unknown' = useMemo(() => {
    if (statusQuery.isLoading && !status) return 'unknown'
    if (status?.up) return 'up'
    return 'down'
  }, [statusQuery.isLoading, status])

  function refreshAll() {
    void statusQuery.refetch()
    void statsQuery.refetch()
    void queriesQuery.refetch()
  }

  return (
    <div className="flex h-full flex-col bg-primary-50 dark:bg-neutral-950">
      <header className="shrink-0 border-b border-primary-200/70 bg-white/70 px-6 py-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200">
              <HugeiconsIcon icon={DatabaseIcon} size={20} strokeWidth={1.6} />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-primary-900 dark:text-neutral-50">
                Sergio Bridge
              </h1>
              <p className="text-xs text-primary-500 dark:text-neutral-400">
                Estado en directo de api.carkeysystem.com — Lobster v3
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-primary-500 dark:text-neutral-400">
              Última comprobación · {lastChecked}
            </span>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-2.5 py-1.5 text-xs font-medium text-primary-700 shadow-sm transition-colors hover:bg-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={1.8} />
              Refrescar
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
          <HeroCard
            tone={heroTone}
            status={status}
            isLoading={statusQuery.isLoading}
          />

          <KpiGrid stats={stats} last24h={queries?.last24h ?? null} />

          <section className="rounded-2xl border border-primary-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-primary-900 dark:text-neutral-100">
                  Queries últimos 7 días
                </h2>
                <p className="text-xs text-primary-500 dark:text-neutral-400">
                  Histograma diario de llamadas a /bridge/v1/* (auditoría
                  in-memory)
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-100 px-2.5 py-1 text-[11px] font-medium text-primary-700 dark:bg-neutral-800 dark:text-neutral-200">
                <HugeiconsIcon
                  icon={Activity01Icon}
                  size={12}
                  strokeWidth={1.8}
                />
                {queries?.last24h ?? 0} en 24h
              </span>
            </div>
            <QueriesChart daily={queries?.daily ?? []} />
          </section>

          <section className="rounded-2xl border border-primary-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-primary-200/70 px-5 py-3 dark:border-neutral-800">
              <div>
                <h2 className="text-sm font-semibold text-primary-900 dark:text-neutral-100">
                  Últimas queries
                </h2>
                <p className="text-xs text-primary-500 dark:text-neutral-400">
                  Auditoría de las llamadas más recientes al bridge
                </p>
              </div>
              <span className="text-[11px] text-primary-500 dark:text-neutral-400">
                {queries?.recent.length ?? 0} entradas
              </span>
            </div>
            <RecentQueriesTable
              recent={queries?.recent ?? []}
              loading={queriesQuery.isLoading}
            />
          </section>
        </div>
      </div>
    </div>
  )
}

function HeroCard({
  tone,
  status,
  isLoading,
}: {
  tone: 'up' | 'down' | 'unknown'
  status?: BridgeStatus
  isLoading: boolean
}) {
  const toneStyles: Record<typeof tone, string> = {
    up: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700/40 dark:bg-emerald-900/20',
    down: 'border-red-300 bg-red-50 dark:border-red-700/40 dark:bg-red-900/20',
    unknown:
      'border-primary-300 bg-primary-100 dark:border-neutral-700 dark:bg-neutral-900/40',
  }
  const toneText: Record<typeof tone, string> = {
    up: 'text-emerald-700 dark:text-emerald-200',
    down: 'text-red-700 dark:text-red-200',
    unknown: 'text-primary-600 dark:text-neutral-300',
  }
  const toneIcon =
    tone === 'up'
      ? CheckmarkCircle02Icon
      : tone === 'down'
        ? AlertCircleIcon
        : TrafficLightIcon
  const headline =
    tone === 'up'
      ? 'Bridge online'
      : tone === 'down'
        ? 'Bridge no responde'
        : 'Comprobando bridge…'

  const subline = !status
    ? isLoading
      ? 'Conectando con api.carkeysystem.com…'
      : 'Sin datos'
    : status.up
      ? `HTTP ${status.status ?? 200} · ${status.baseUrl}`
      : status.hasApiKey
        ? `${status.error ?? 'sin respuesta'} · ${status.baseUrl}`
        : 'Falta SERGIO_API_KEY en el entorno del servidor'

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-2xl border p-5 shadow-sm md:flex-row md:items-center md:justify-between',
        toneStyles[tone],
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'inline-flex size-12 items-center justify-center rounded-xl bg-white/70 dark:bg-neutral-900/40',
            toneText[tone],
          )}
        >
          <HugeiconsIcon icon={toneIcon} size={22} strokeWidth={1.6} />
        </span>
        <div>
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wider',
              toneText[tone],
            )}
          >
            api.carkeysystem.com
          </p>
          <h2 className="text-lg font-semibold text-primary-900 dark:text-neutral-50">
            {headline}
          </h2>
          <p className="mt-0.5 text-xs text-primary-600 dark:text-neutral-300">
            {subline}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-4">
        <HeroMetric
          icon={Clock01Icon}
          label="Latencia"
          value={formatLatency(status?.latencyMs)}
        />
        <HeroMetric
          icon={Activity01Icon}
          label="Estado"
          value={tone === 'up' ? 'OK' : tone === 'down' ? 'KO' : '—'}
        />
      </div>
    </section>
  )
}

function HeroMetric({
  icon,
  label,
  value,
}: {
  icon: typeof Activity01Icon
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 dark:bg-neutral-900/40">
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-neutral-800 dark:text-neutral-300">
        <HugeiconsIcon icon={icon} size={14} strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary-500 dark:text-neutral-400">
          {label}
        </p>
        <p className="text-sm font-semibold text-primary-900 dark:text-neutral-100">
          {value}
        </p>
      </div>
    </div>
  )
}

function KpiGrid({
  stats,
  last24h,
}: {
  stats?: BridgeStats
  last24h: number | null
}) {
  const items = [
    {
      icon: DatabaseIcon,
      label: 'Procedures',
      value: formatNumber(stats?.procedures ?? null),
      hint:
        stats?.verified != null
          ? `${formatNumber(stats.verified)} verificadas`
          : undefined,
    },
    {
      icon: Car01Icon,
      label: 'Vehículos',
      value: formatNumber(stats?.vehicles ?? null),
      hint:
        stats?.links != null ? `${formatNumber(stats.links)} vínculos` : undefined,
    },
    {
      icon: FactoryIcon,
      label: 'Marcas',
      value: formatNumber(stats?.brands ?? null),
      hint:
        stats?.coveragePercent != null
          ? `Cobertura ${formatPercent(stats.coveragePercent)}`
          : undefined,
    },
    {
      icon: Activity01Icon,
      label: 'Queries 24h',
      value: last24h != null ? formatNumber(last24h) : '—',
      hint: 'Auditoría in-memory',
    },
  ]

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-primary-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-200">
              <HugeiconsIcon icon={item.icon} size={16} strokeWidth={1.6} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-500 dark:text-neutral-400">
              {item.label}
            </p>
          </div>
          <p className="mt-3 text-2xl font-semibold text-primary-900 dark:text-neutral-50">
            {item.value}
          </p>
          {item.hint ? (
            <p className="mt-1 text-[11px] text-primary-500 dark:text-neutral-400">
              {item.hint}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  )
}

function QueriesChart({ daily }: { daily: DailyCount[] }) {
  const data = daily.map((d) => ({
    label: shortDate(d.date),
    count: d.count,
    failed: d.failed,
  }))
  const hasData = data.some((d) => d.count > 0)

  if (!hasData) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-primary-200 text-xs text-primary-500 dark:border-neutral-800 dark:text-neutral-400">
        Aún no hay queries registradas en los últimos 7 días
      </div>
    )
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid
            stroke="currentColor"
            className="stroke-primary-200/70 dark:stroke-neutral-800"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'currentColor' }}
            className="text-primary-500 dark:text-neutral-400"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={32}
            className="text-primary-500 dark:text-neutral-400"
          />
          <Tooltip
            contentStyle={{
              background: 'rgb(255 255 255 / 0.95)',
              border: '1px solid rgb(229 229 229)',
              borderRadius: '0.75rem',
              fontSize: 12,
            }}
            wrapperClassName="!text-primary-900"
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#c5020e"
            strokeWidth={2}
            dot={{ r: 3, fill: '#c5020e' }}
            activeDot={{ r: 5 }}
            name="Total"
          />
          <Line
            type="monotone"
            dataKey="failed"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name="Fallidas"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function RecentQueriesTable({
  recent,
  loading,
}: {
  recent: RecentQuery[]
  loading: boolean
}) {
  if (loading && recent.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-xs text-primary-500 dark:text-neutral-400">
        Cargando queries…
      </div>
    )
  }
  if (recent.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-xs text-primary-500 dark:text-neutral-400">
        No se han registrado queries todavía. Lanza una búsqueda contra el
        bridge desde cualquier skill para empezar a ver auditoría aquí.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-primary-200/70 text-left text-[11px] uppercase tracking-wider text-primary-500 dark:border-neutral-800 dark:text-neutral-400">
            <th className="px-5 py-2 font-semibold">Cuándo</th>
            <th className="px-3 py-2 font-semibold">Método</th>
            <th className="px-3 py-2 font-semibold">Endpoint</th>
            <th className="px-3 py-2 font-semibold text-right">HTTP</th>
            <th className="px-3 py-2 font-semibold text-right">Latencia</th>
            <th className="px-5 py-2 font-semibold">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((q, idx) => (
            <tr
              key={`${q.ts}-${idx}`}
              className="border-b border-primary-100/70 last:border-b-0 hover:bg-primary-50/60 dark:border-neutral-800/70 dark:hover:bg-neutral-800/40"
            >
              <td className="px-5 py-2 text-primary-700 dark:text-neutral-300">
                {relativeTime(q.ts)}
              </td>
              <td className="px-3 py-2 font-mono text-[11px] text-primary-600 dark:text-neutral-300">
                {q.method}
              </td>
              <td className="px-3 py-2 font-mono text-[11px] text-primary-800 dark:text-neutral-200">
                {q.path}
              </td>
              <td className="px-3 py-2 text-right font-mono text-[11px] text-primary-600 dark:text-neutral-300">
                {q.status || '—'}
              </td>
              <td className="px-3 py-2 text-right text-primary-600 dark:text-neutral-300">
                {formatLatency(q.durationMs)}
              </td>
              <td className="px-5 py-2">
                {q.ok ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                    OK
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-200"
                    title={q.error ?? 'error'}
                  >
                    {q.error ?? 'error'}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
