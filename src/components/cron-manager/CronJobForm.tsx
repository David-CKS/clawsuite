import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CronJob, CronJobUpsertInput } from './cron-types'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

type CronJobFormProps = {
  mode: 'create' | 'edit'
  initialJob: CronJob | null
  pending: boolean
  error: string | null
  onSubmit: (payload: CronJobUpsertInput) => void
  onClose: () => void
}

type ScheduleType = 'interval' | 'daily' | 'weekly' | 'one-time'
type TaskType = 'agentTurn' | 'systemEvent'
type Meridiem = 'AM' | 'PM'
type DayOfWeek = '0' | '1' | '2' | '3' | '4' | '5' | '6'

type ParsedScheduleState = {
  type: ScheduleType
  intervalValue: string
  hour12: string
  minute: string
  meridiem: Meridiem
  weeklyDays: DayOfWeek[]
  oneTimeDate: string
  rawOverride: boolean
}

type ParsedPayloadState = {
  taskType: TaskType
  message: string
  model: string
  timeoutSeconds: string
  rawOverride: boolean
}

type ModelCatalogEntry = {
  id?: string
  provider?: string
  name?: string
}

const INTERVAL_OPTIONS = [
  { value: 'every 5m', label: 'Cada 5 minutos' },
  { value: 'every 15m', label: 'Cada 15 minutos' },
  { value: 'every 30m', label: 'Cada 30 minutos' },
  { value: 'every 1h', label: 'Cada hora' },
  { value: 'every 2h', label: 'Cada 2 horas' },
  { value: 'every 4h', label: 'Cada 4 horas' },
  { value: 'every 6h', label: 'Cada 6 horas' },
  { value: 'every 12h', label: 'Cada 12 horas' },
  { value: 'every 24h', label: 'Cada 24 horas' },
] as const

const SCHEDULE_TYPE_OPTIONS: Array<{ value: ScheduleType; label: string }> = [
  { value: 'interval', label: 'Intervalo' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'one-time', label: 'Una vez' },
]

const TASK_TYPE_OPTIONS: Array<{ value: TaskType; label: string }> = [
  { value: 'agentTurn', label: 'Turno de agente' },
  { value: 'systemEvent', label: 'Evento de sistema' },
]

const DAY_OPTIONS: Array<{ value: DayOfWeek; label: string }> = [
  { value: '0', label: 'Dom' },
  { value: '1', label: 'Lun' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Mié' },
  { value: '4', label: 'Jue' },
  { value: '5', label: 'Vie' },
  { value: '6', label: 'Sáb' },
]

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1),
)
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0'),
)

function stringifyJson(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function parseOptionalJson(
  rawValue: string,
  label: string,
): {
  value?: unknown
  error?: string
} {
  const trimmed = rawValue.trim()
  if (!trimmed) return {}
  try {
    return { value: JSON.parse(trimmed) as unknown }
  } catch {
    return { error: `${label} debe ser JSON válido.` }
  }
}

function to12HourParts(hour24: number, minute: number): {
  hour12: string
  minute: string
  meridiem: Meridiem
} {
  const normalizedHour = ((hour24 % 24) + 24) % 24
  const meridiem = normalizedHour >= 12 ? 'PM' : 'AM'
  const hour12Number = normalizedHour % 12 || 12
  return {
    hour12: String(hour12Number),
    minute: String(minute).padStart(2, '0'),
    meridiem,
  }
}

function to24Hour(hour12: string, meridiem: Meridiem): number {
  const parsed = Number(hour12)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) return 0
  if (meridiem === 'AM') return parsed === 12 ? 0 : parsed
  return parsed === 12 ? 12 : parsed + 12
}

function parseCronFields(schedule: string): string[] | null {
  const fields = schedule.trim().split(/\s+/)
  if (fields.length !== 5) return null
  return fields
}

function parseInitialSchedule(schedule: string): ParsedScheduleState {
  const trimmed = schedule.trim()
  const defaultTime = { hour12: '9', minute: '00', meridiem: 'AM' as const }

  const everyMatch = trimmed.match(
    /^every\s+(\d+)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days)?$/i,
  )
  if (everyMatch?.[1]) {
    const interval = Number(everyMatch[1])
    const unitToken = (everyMatch[2] ?? 'm').toLowerCase()
    const normalizedValue = unitToken.startsWith('h')
      ? `every ${interval}h`
      : unitToken.startsWith('d')
        ? `every ${interval}d`
        : `every ${interval}m`
    const matchedOption = INTERVAL_OPTIONS.find(
      (option) => option.value === normalizedValue,
    )
    return {
      type: 'interval',
      intervalValue: matchedOption?.value ?? INTERVAL_OPTIONS[0].value,
      hour12: defaultTime.hour12,
      minute: defaultTime.minute,
      meridiem: defaultTime.meridiem,
      weeklyDays: ['1'],
      oneTimeDate: '',
      rawOverride: !matchedOption,
    }
  }

  const atMatch = trimmed.match(/^at\s+(.+)$/i)
  const oneTimeValue = atMatch?.[1] ?? trimmed
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(oneTimeValue)) {
    const [datePart, timePart] = oneTimeValue.split('T')
    const [hour, minute] = (timePart ?? '09:00').slice(0, 5).split(':')
    const time = to12HourParts(Number(hour), Number(minute))
    return {
      type: 'one-time',
      intervalValue: INTERVAL_OPTIONS[0].value,
      hour12: time.hour12,
      minute: time.minute,
      meridiem: time.meridiem,
      weeklyDays: ['1'],
      oneTimeDate: datePart ?? '',
      rawOverride: false,
    }
  }

  const cronFields = parseCronFields(trimmed)
  if (cronFields) {
    const [minuteField, hourField, dayOfMonth, month, dayOfWeek] = cronFields
    const hour = Number(hourField)
    const minute = Number(minuteField)
    const hasFixedTime =
      Number.isInteger(hour) &&
      hour >= 0 &&
      hour <= 23 &&
      Number.isInteger(minute) &&
      minute >= 0 &&
      minute <= 59

    if (hasFixedTime && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      const time = to12HourParts(hour, minute)
      return {
        type: 'daily',
        intervalValue: INTERVAL_OPTIONS[0].value,
        hour12: time.hour12,
        minute: time.minute,
        meridiem: time.meridiem,
        weeklyDays: ['1'],
        oneTimeDate: '',
        rawOverride: false,
      }
    }

    if (
      hasFixedTime &&
      dayOfMonth === '*' &&
      month === '*' &&
      /^[0-6](,[0-6])*$/.test(dayOfWeek)
    ) {
      const time = to12HourParts(hour, minute)
      return {
        type: 'weekly',
        intervalValue: INTERVAL_OPTIONS[0].value,
        hour12: time.hour12,
        minute: time.minute,
        meridiem: time.meridiem,
        weeklyDays: dayOfWeek.split(',') as DayOfWeek[],
        oneTimeDate: '',
        rawOverride: false,
      }
    }
  }

  return {
    type: 'daily',
    intervalValue: INTERVAL_OPTIONS[0].value,
    hour12: defaultTime.hour12,
    minute: defaultTime.minute,
    meridiem: defaultTime.meridiem,
    weeklyDays: ['1'],
    oneTimeDate: '',
    rawOverride: Boolean(trimmed),
  }
}

function parseInitialPayload(payload: unknown): ParsedPayloadState {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      taskType: 'agentTurn',
      message: '',
      model: '',
      timeoutSeconds: '600',
      rawOverride: false,
    }
  }

  const record = payload as Record<string, unknown>
  const message =
    typeof record.message === 'string'
      ? record.message
      : typeof record.text === 'string'
        ? record.text
        : ''

  if (record.kind === 'agentTurn') {
    const allowedKeys = new Set(['kind', 'message', 'model', 'timeoutSeconds'])
    const rawOverride = Object.keys(record).some((key) => !allowedKeys.has(key))
    return {
      taskType: 'agentTurn',
      message,
      model: typeof record.model === 'string' ? record.model : '',
      timeoutSeconds:
        typeof record.timeoutSeconds === 'number'
          ? String(record.timeoutSeconds)
          : typeof record.timeoutSeconds === 'string'
            ? record.timeoutSeconds
            : '600',
      rawOverride,
    }
  }

  const allowedKeys = new Set(['kind', 'message', 'text'])
  return {
    taskType: 'systemEvent',
    message,
    model: '',
    timeoutSeconds: '600',
    rawOverride: Object.keys(record).some((key) => !allowedKeys.has(key)),
  }
}

function validateCronExpr(expr: string): string | null {
  const trimmed = expr.trim()
  if (!trimmed) return 'El horario es obligatorio.'

  const everyMatch = trimmed.match(
    /^every\s+(\d+)\s*(m|min|minute|minutes|h|hr|hour|hours|d|day|days)?$/i,
  )
  if (everyMatch?.[1]) {
    return Number(everyMatch[1]) > 0
      ? null
      : 'El intervalo del horario debe ser mayor que cero.'
  }

  if (/^(at\s+)?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
    return null
  }

  const fields = trimmed.split(/\s+/)
  if (fields.length !== 5) {
    return 'La expresión cron debe tener 5 campos.'
  }
  const valid = /^[0-9*,/\-?LW#]+$/
  for (const field of fields) {
    if (!valid.test(field)) {
      return `Campo cron inválido: "${field}".`
    }
  }
  return null
}

function FieldLabel({
  children,
  optional,
}: {
  children: string
  optional?: boolean
}) {
  return (
    <span className="text-xs font-medium text-primary-600">
      {children}
      {optional ? (
        <span className="ml-1 text-primary-500">(opcional)</span>
      ) : null}
    </span>
  )
}

export function CronJobForm({
  mode,
  initialJob,
  pending,
  error,
  onSubmit,
  onClose,
}: CronJobFormProps) {
  const parsedSchedule = useMemo(
    () => parseInitialSchedule(initialJob?.schedule ?? ''),
    [initialJob?.schedule],
  )
  const parsedPayload = useMemo(
    () => parseInitialPayload(initialJob?.payload),
    [initialJob?.payload],
  )

  const [name, setName] = useState(initialJob?.name ?? '')
  const [description, setDescription] = useState(initialJob?.description ?? '')
  const [enabled, setEnabled] = useState(initialJob?.enabled ?? true)
  const [scheduleType, setScheduleType] = useState<ScheduleType>(parsedSchedule.type)
  const [intervalValue, setIntervalValue] = useState(parsedSchedule.intervalValue)
  const [hour12, setHour12] = useState(parsedSchedule.hour12)
  const [minute, setMinute] = useState(parsedSchedule.minute)
  const [meridiem, setMeridiem] = useState<Meridiem>(parsedSchedule.meridiem)
  const [weeklyDays, setWeeklyDays] = useState<DayOfWeek[]>(parsedSchedule.weeklyDays)
  const [oneTimeDate, setOneTimeDate] = useState(parsedSchedule.oneTimeDate)
  const [rawScheduleInput, setRawScheduleInput] = useState(initialJob?.schedule ?? '')
  const [useRawSchedule, setUseRawSchedule] = useState(parsedSchedule.rawOverride)
  const [taskType, setTaskType] = useState<TaskType>(parsedPayload.taskType)
  const [message, setMessage] = useState(parsedPayload.message)
  const [model, setModel] = useState(parsedPayload.model)
  const [timeoutSeconds, setTimeoutSeconds] = useState(parsedPayload.timeoutSeconds)
  const [rawPayloadInput, setRawPayloadInput] = useState(
    stringifyJson(initialJob?.payload ?? ''),
  )
  const [useRawPayload, setUseRawPayload] = useState(parsedPayload.rawOverride)
  const [deliveryConfigInput, setDeliveryConfigInput] = useState(
    stringifyJson(initialJob?.deliveryConfig),
  )
  const [advancedOpen, setAdvancedOpen] = useState(
    Boolean(parsedSchedule.rawOverride || parsedPayload.rawOverride),
  )
  const [localError, setLocalError] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const modelsQuery = useQuery({
    queryKey: ['cron-form', 'models'],
    queryFn: async () => {
      const response = await fetch('/api/models')
      const data = (await response.json()) as {
        ok?: boolean
        error?: string
        models?: Array<ModelCatalogEntry>
      }
      if (!response.ok || data.ok === false) {
        throw new Error(data.error ?? 'No se pudieron cargar los modelos')
      }
      return Array.isArray(data.models) ? data.models : []
    },
    enabled: taskType === 'agentTurn',
    staleTime: 60_000,
  })

  const modelOptions = useMemo(
    () =>
      (modelsQuery.data ?? []).map((entry) => ({
        value: entry.id ?? '',
        label:
          entry.name && entry.provider
            ? `${entry.name} (${entry.provider})`
            : entry.name ?? entry.id ?? 'Modelo sin nombre',
      })),
    [modelsQuery.data],
  )

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !pending) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, pending])

  function markFriendlyScheduleDirty() {
    setUseRawSchedule(false)
    setScheduleError(null)
    setLocalError(null)
  }

  function markFriendlyPayloadDirty() {
    setUseRawPayload(false)
    setLocalError(null)
  }

  function buildFriendlySchedule(): string {
    if (scheduleType === 'interval') {
      return intervalValue
    }

    const cronHour = to24Hour(hour12, meridiem)

    if (scheduleType === 'daily') {
      return `${minute} ${cronHour} * * *`
    }

    if (scheduleType === 'weekly') {
      const sortedDays = [...weeklyDays].sort()
      return `${minute} ${cronHour} * * ${sortedDays.join(',')}`
    }

    if (!oneTimeDate) return ''
    return `${oneTimeDate}T${String(cronHour).padStart(2, '0')}:${minute}`
  }

  function buildFriendlyPayload(): Record<string, unknown> {
    if (taskType === 'systemEvent') {
      return {
        kind: 'systemEvent',
        message: message.trim(),
        text: message.trim(),
      }
    }

    const payload: Record<string, unknown> = {
      kind: 'agentTurn',
      message: message.trim(),
    }
    if (model.trim()) {
      payload.model = model.trim()
    }
    if (timeoutSeconds.trim()) {
      payload.timeoutSeconds = Number(timeoutSeconds)
    }
    return payload
  }

  const generatedSchedule = useMemo(
    () => buildFriendlySchedule(),
    [
      intervalValue,
      meridiem,
      minute,
      oneTimeDate,
      hour12,
      scheduleType,
      weeklyDays,
    ],
  )

  const generatedPayloadPreview = useMemo(
    () => stringifyJson(buildFriendlyPayload()),
    [message, model, taskType, timeoutSeconds],
  )

  function handleToggleWeekday(day: DayOfWeek) {
    markFriendlyScheduleDirty()
    setWeeklyDays((currentDays) => {
      if (currentDays.includes(day)) {
        return currentDays.filter((value) => value !== day)
      }
      return [...currentDays, day].sort() as DayOfWeek[]
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)
    setScheduleError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setLocalError('El nombre es obligatorio.')
      return
    }

    const scheduleResult = useRawSchedule
      ? rawScheduleInput.trim()
      : generatedSchedule.trim()
    if (!scheduleResult) {
      setLocalError('El horario es obligatorio.')
      return
    }

    const cronError = validateCronExpr(scheduleResult)
    if (cronError) {
      setScheduleError(cronError)
      return
    }

    if (!useRawSchedule && scheduleType === 'weekly' && weeklyDays.length === 0) {
      setLocalError('Selecciona al menos un día para un horario semanal.')
      return
    }

    const payloadResult = useRawPayload
      ? parseOptionalJson(rawPayloadInput, 'Payload JSON')
      : { value: buildFriendlyPayload() }
    if (payloadResult.error) {
      setLocalError(payloadResult.error)
      return
    }

    const payloadValue = payloadResult.value
    if (!useRawPayload && !message.trim()) {
      setLocalError('El mensaje es obligatorio.')
      return
    }

    if (!useRawPayload && taskType === 'agentTurn' && timeoutSeconds.trim()) {
      const timeout = Number(timeoutSeconds)
      if (!Number.isFinite(timeout) || timeout <= 0) {
        setLocalError('El tiempo límite debe ser un número positivo de segundos.')
        return
      }
    }

    const deliveryConfigResult = parseOptionalJson(
      deliveryConfigInput,
      'Config de entrega',
    )
    if (deliveryConfigResult.error) {
      setLocalError(deliveryConfigResult.error)
      return
    }

    onSubmit({
      jobId: initialJob?.id,
      name: trimmedName,
      schedule: scheduleResult,
      description: description.trim() || undefined,
      enabled,
      payload: payloadValue,
      deliveryConfig: deliveryConfigResult.value,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6 backdrop-blur-md"
      onClick={() => {
        if (!pending) onClose()
      }}
    >
      <section
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-primary-200 bg-primary-50/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6"
        onClick={(event) => {
          event.stopPropagation()
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-500">
              Gestor de cron
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-primary-900">
              {mode === 'edit' ? 'Editar tarea programada' : 'Crear tarea programada'}
            </h2>
            <p className="mt-2 text-sm text-primary-600">
              Crea un horario, define el payload de la tarea y deja los controles
              raw disponibles para casos especiales.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-primary-200 bg-white/80 text-lg text-primary-600 transition-colors hover:border-primary-300 hover:text-primary-900 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Cerrar formulario de tarea programada"
          >
            ×
          </button>
        </div>

        {error || localError ? (
          <div className="mt-5 rounded-xl border border-accent-500/40 bg-accent-500/10 px-4 py-3 text-sm text-accent-500">
            {localError ?? error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <section className="rounded-xl border border-primary-200 bg-white/70 p-4">
            <div className="grid gap-4 md:grid-cols-[1.3fr_1fr]">
              <label className="space-y-2">
                <FieldLabel>Nombre</FieldLabel>
                <input
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setLocalError(null)
                  }}
                  placeholder="Resumen diario"
                  className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none transition-colors placeholder:text-primary-500 focus:border-primary-300"
                />
              </label>

              <label className="space-y-2">
                <FieldLabel optional>Descripción</FieldLabel>
                <input
                  value={description}
                  onChange={(event) => {
                    setDescription(event.target.value)
                  }}
                  placeholder="Contexto opcional para esta tarea"
                  className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none transition-colors placeholder:text-primary-500 focus:border-primary-300"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-primary-200 bg-white/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-primary-900">
                  Horario
                </h3>
                <p className="mt-1 text-xs text-primary-600">
                  Elige el tipo de horario y el formulario generará la expresión
                  de tiempo de ejecución por ti.
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-primary-200 bg-primary-100/60 p-1">
                {SCHEDULE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setScheduleType(option.value)
                      markFriendlyScheduleDirty()
                    }}
                    className={[
                      'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      scheduleType === option.value
                        ? 'border border-primary-300 bg-white text-primary-900 shadow-sm'
                        : 'text-primary-700 hover:bg-primary-200',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {scheduleType === 'interval' ? (
                <label className="space-y-2">
                  <FieldLabel>Intervalo</FieldLabel>
                  <select
                    value={intervalValue}
                    onChange={(event) => {
                      setIntervalValue(event.target.value)
                      markFriendlyScheduleDirty()
                    }}
                    className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none focus:border-primary-300"
                  >
                    {INTERVAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {scheduleType === 'daily' || scheduleType === 'weekly' || scheduleType === 'one-time' ? (
                <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                  {scheduleType === 'one-time' ? (
                    <label className="space-y-2 md:col-span-3">
                      <FieldLabel>Fecha</FieldLabel>
                      <input
                        type="date"
                        value={oneTimeDate}
                        onChange={(event) => {
                          setOneTimeDate(event.target.value)
                          markFriendlyScheduleDirty()
                        }}
                        className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none focus:border-primary-300"
                      />
                    </label>
                  ) : null}

                  <label className="space-y-2">
                    <FieldLabel>Hora</FieldLabel>
                    <select
                      value={hour12}
                      onChange={(event) => {
                        setHour12(event.target.value)
                        markFriendlyScheduleDirty()
                      }}
                      className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none focus:border-primary-300"
                    >
                      {HOUR_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <FieldLabel>Minuto</FieldLabel>
                    <select
                      value={minute}
                      onChange={(event) => {
                        setMinute(event.target.value)
                        markFriendlyScheduleDirty()
                      }}
                      className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none focus:border-primary-300"
                    >
                      {MINUTE_OPTIONS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <FieldLabel>AM/PM</FieldLabel>
                    <select
                      value={meridiem}
                      onChange={(event) => {
                        setMeridiem(event.target.value as Meridiem)
                        markFriendlyScheduleDirty()
                      }}
                      className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none focus:border-primary-300"
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {scheduleType === 'weekly' ? (
                <div className="space-y-2">
                  <FieldLabel>Días de la semana</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {DAY_OPTIONS.map((day) => {
                      const checked = weeklyDays.includes(day.value)
                      return (
                        <label
                          key={day.value}
                          className={[
                            'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors',
                            checked
                              ? 'border-primary-300 bg-primary-100 text-primary-900'
                              : 'border-primary-200 bg-primary-50 text-primary-600',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              handleToggleWeekday(day.value)
                            }}
                            className="size-4 rounded border-primary-300 text-primary-900"
                          />
                          {day.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-primary-200 bg-primary-100/40 px-4 py-3">
                <p className="text-xs font-medium text-primary-600">
                  Vista previa del horario generado
                </p>
                <code className="mt-1 block text-sm text-primary-900">
                  {generatedSchedule || 'Esperando los detalles del horario'}
                </code>
                {scheduleError ? (
                  <p className="mt-2 text-xs text-accent-500">{scheduleError}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-primary-200 bg-white/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-primary-900">Tarea</h3>
                <p className="mt-1 text-xs text-primary-600">
                  Configura el payload de la tarea sin editar JSON raw por
                  defecto.
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-primary-200 bg-primary-100/60 p-1">
                {TASK_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTaskType(option.value)
                      markFriendlyPayloadDirty()
                    }}
                    className={[
                      'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      taskType === option.value
                        ? 'border border-primary-300 bg-white text-primary-900 shadow-sm'
                        : 'text-primary-700 hover:bg-primary-200',
                    ].join(' ')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4">
              {taskType === 'agentTurn' ? (
                <label className="space-y-2">
                  <FieldLabel>Mensaje</FieldLabel>
                  <textarea
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value)
                      markFriendlyPayloadDirty()
                    }}
                    rows={5}
                    placeholder="Describe el turno de agente que debe ejecutar esta tarea."
                    className="w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 py-3 text-sm text-primary-900 outline-none transition-colors placeholder:text-primary-500 focus:border-primary-300"
                  />
                </label>
              ) : (
                <label className="space-y-2">
                  <FieldLabel>Mensaje</FieldLabel>
                  <input
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value)
                      markFriendlyPayloadDirty()
                    }}
                    placeholder="Mensaje del evento de sistema"
                    className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none transition-colors placeholder:text-primary-500 focus:border-primary-300"
                  />
                </label>
              )}

              {taskType === 'agentTurn' ? (
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <label className="space-y-2">
                    <FieldLabel optional>Modelo</FieldLabel>
                    <select
                      value={model}
                      onChange={(event) => {
                        setModel(event.target.value)
                        markFriendlyPayloadDirty()
                      }}
                      className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none focus:border-primary-300"
                    >
                      <option value="">
                        {modelsQuery.isLoading
                          ? 'Cargando modelos…'
                          : 'Modelo por defecto del gateway'}
                      </option>
                      {modelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {modelsQuery.isError ? (
                      <p className="text-xs text-accent-500">
                        {modelsQuery.error instanceof Error
                          ? modelsQuery.error.message
                          : 'Falló la carga de modelos.'}
                      </p>
                    ) : null}
                  </label>

                  <label className="space-y-2">
                    <FieldLabel>Tiempo límite (segundos)</FieldLabel>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={timeoutSeconds}
                      onChange={(event) => {
                        setTimeoutSeconds(event.target.value)
                        markFriendlyPayloadDirty()
                      }}
                      className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none focus:border-primary-300"
                    />
                  </label>
                </div>
              ) : null}

              <div className="rounded-xl border border-primary-200 bg-primary-100/40 px-4 py-3">
                <p className="text-xs font-medium text-primary-600">
                  Vista previa del payload generado
                </p>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-primary-900">
                  {generatedPayloadPreview}
                </pre>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-primary-200 bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-primary-900">
                  Activado
                </h3>
                <p className="mt-1 text-xs text-primary-600">
                  Las tareas desactivadas se guardan pero no se ejecutan automáticamente.
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-100/50 px-3 py-2">
                <Switch
                  checked={enabled}
                  onCheckedChange={(nextValue) => {
                    setEnabled(Boolean(nextValue))
                  }}
                />
                <span className="text-sm text-primary-900">
                  {enabled ? 'Activado' : 'Desactivado'}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-primary-200 bg-white/70 p-4">
            <button
              type="button"
              onClick={() => {
                setAdvancedOpen((currentValue) => !currentValue)
              }}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <h3 className="text-sm font-semibold text-primary-900">
                  Avanzado
                </h3>
                <p className="mt-1 text-xs text-primary-600">
                  Sobrescribe el horario generado o el JSON del payload y edita
                  la config de entrega directamente.
                </p>
              </div>
              <span className="rounded-lg border border-primary-200 bg-primary-100/60 px-3 py-1.5 text-xs font-medium text-primary-700">
                {advancedOpen ? 'Ocultar' : 'Mostrar'}
              </span>
            </button>

            {advancedOpen ? (
              <div className="mt-4 space-y-4">
                <label className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-100/40 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={useRawSchedule}
                    onChange={(event) => {
                      setUseRawSchedule(event.target.checked)
                      setScheduleError(null)
                    }}
                    className="mt-0.5 size-4 rounded border-primary-300"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-primary-900">
                      Usa horario raw en vez del selector
                    </span>
                    <span className="block text-xs text-primary-600">
                      Acepta expresiones cron y los formatos existentes `every ...` y
                      `at ...`.
                    </span>
                  </span>
                </label>

                <label className="space-y-2">
                  <FieldLabel>Horario raw / expresión cron</FieldLabel>
                  <input
                    value={rawScheduleInput}
                    onChange={(event) => {
                      setRawScheduleInput(event.target.value)
                      setScheduleError(null)
                    }}
                    placeholder="0 9 * * 1-5"
                    className="h-11 w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 text-sm text-primary-900 outline-none transition-colors placeholder:text-primary-500 focus:border-primary-300"
                  />
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-100/40 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={useRawPayload}
                    onChange={(event) => {
                      setUseRawPayload(event.target.checked)
                    }}
                    className="mt-0.5 size-4 rounded border-primary-300"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-primary-900">
                      Usa JSON raw del payload en vez del constructor de tareas
                    </span>
                    <span className="block text-xs text-primary-600">
                      Déjalo activado para payloads personalizados o opciones
                      avanzadas del gateway.
                    </span>
                  </span>
                </label>

                <label className="space-y-2">
                  <FieldLabel>JSON raw del payload</FieldLabel>
                  <textarea
                    value={rawPayloadInput}
                    onChange={(event) => {
                      setRawPayloadInput(event.target.value)
                    }}
                    rows={6}
                    className="w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 py-3 text-xs text-primary-900 outline-none transition-colors focus:border-primary-300"
                  />
                </label>

                <label className="space-y-2">
                  <FieldLabel optional>JSON de config de entrega</FieldLabel>
                  <textarea
                    value={deliveryConfigInput}
                    onChange={(event) => {
                      setDeliveryConfigInput(event.target.value)
                    }}
                    rows={5}
                    placeholder='{"provider":"slack"}'
                    className="w-full rounded-xl border border-primary-200 bg-primary-100/60 px-4 py-3 text-xs text-primary-900 outline-none transition-colors placeholder:text-primary-500 focus:border-primary-300"
                  />
                </label>
              </div>
            ) : null}
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-primary-200 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending
                ? 'Guardando…'
                : mode === 'edit'
                  ? 'Guardar cambios'
                  : 'Crear tarea'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
