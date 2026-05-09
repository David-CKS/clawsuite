import type { CronJob, CronRun, CronRunStatus, CronSortKey } from './cron-types'

function normalizeTimestampToMs(value: string | null | undefined): number {
  if (!value) return 0
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatTwoDigits(value: number): string {
  return value.toString().padStart(2, '0')
}

function formatDayValue(value: string): string {
  const mapping: Record<string, string> = {
    '0': 'domingo',
    '1': 'lunes',
    '2': 'martes',
    '3': 'miércoles',
    '4': 'jueves',
    '5': 'viernes',
    '6': 'sábado',
  }
  return mapping[value] ?? value
}

export function formatCronHuman(expression: string): string {
  const parts = expression.trim().split(/\s+/)
  if (parts.length < 5) return expression

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  if (
    minute === '*' &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return 'Cada minuto'
  }

  if (
    minute.startsWith('*/') &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    const interval = Number(minute.slice(2))
    if (Number.isFinite(interval) && interval > 0) {
      return `Cada ${interval} minutos`
    }
  }

  if (
    /^\d+$/.test(minute) &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return `En el minuto ${minute} de cada hora`
  }

  if (
    /^\d+$/.test(minute) &&
    /^\d+$/.test(hour) &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return `Cada día a las ${formatTwoDigits(Number(hour))}:${formatTwoDigits(Number(minute))}`
  }

  if (
    /^\d+$/.test(minute) &&
    /^\d+$/.test(hour) &&
    dayOfMonth === '*' &&
    month === '*' &&
    /^\d$/.test(dayOfWeek)
  ) {
    return `Cada ${formatDayValue(dayOfWeek)} a las ${formatTwoDigits(Number(hour))}:${formatTwoDigits(Number(minute))}`
  }

  return expression
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Nunca'
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return value

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(parsed))
}

export function formatDuration(valueMs?: number): string {
  if (!valueMs || valueMs <= 0) return 'n/d'
  if (valueMs < 1000) return `${Math.round(valueMs)}ms`
  if (valueMs < 60_000) return `${(valueMs / 1000).toFixed(1)}s`
  return `${(valueMs / 60_000).toFixed(1)}m`
}

export function statusLabel(status: CronRunStatus): string {
  if (status === 'success') return 'Éxito'
  if (status === 'error') return 'Error'
  if (status === 'running') return 'En curso'
  if (status === 'queued') return 'En cola'
  return 'Desconocido'
}

export function sortCronJobs(
  jobs: Array<CronJob>,
  sortKey: CronSortKey,
): Array<CronJob> {
  return [...jobs].sort(function sortJobs(a, b) {
    if (sortKey === 'name') {
      return a.name.localeCompare(b.name)
    }
    if (sortKey === 'schedule') {
      return a.schedule.localeCompare(b.schedule)
    }

    const aLastRun = normalizeTimestampToMs(a.lastRun?.startedAt)
    const bLastRun = normalizeTimestampToMs(b.lastRun?.startedAt)
    return bLastRun - aLastRun
  })
}

export function getLatestRun(
  job: CronJob,
  runs: Array<CronRun>,
): CronRun | undefined {
  if (runs.length > 0) return runs[0]
  return job.lastRun
}

export function statusBadgeClass(status: CronRunStatus): string {
  if (status === 'success') {
    return 'border-primary-300 bg-primary-100 text-primary-800'
  }
  if (status === 'error') {
    return 'border-orange-500/40 bg-orange-500/15 text-orange-500'
  }
  if (status === 'running') {
    return 'border-primary-400 bg-primary-100 text-primary-900'
  }
  if (status === 'queued') {
    return 'border-primary-300 bg-primary-100 text-primary-700'
  }
  return 'border-primary-300 bg-primary-100 text-primary-700'
}
