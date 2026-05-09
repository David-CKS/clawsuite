import { useCallback, useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowRight01Icon,
  Delete02Icon,
  PlayIcon,
  RefreshIcon,
  Robot02Icon,
  Tag01Icon,
} from '@hugeicons/core-free-icons'
import {
  GOAL_STATUS_LABEL,
  SUBTASK_STATUS_LABEL,
  useGoalDecompStore,
  type Goal,
  type GoalStatus,
  type SubTask,
  type SubTaskStatus,
} from '@/stores/goal-decomp-store'
import { cn } from '@/lib/utils'

const SESSION_KEY_STORAGE = 'clawsuite-orchestrator-session-key'

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function statusDot(status: SubTaskStatus): string {
  if (status === 'running') return 'bg-emerald-500 animate-pulse'
  if (status === 'dispatching') return 'bg-amber-500 animate-pulse'
  if (status === 'done') return 'bg-emerald-600'
  if (status === 'failed') return 'bg-red-500'
  if (status === 'skipped') return 'bg-primary-400'
  return 'bg-primary-300'
}

function goalStatusBadge(status: GoalStatus): string {
  if (status === 'executing') return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
  if (status === 'completed') return 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'
  if (status === 'failed') return 'bg-red-500/15 text-red-600 dark:text-red-400'
  if (status === 'cancelled') return 'bg-primary-300/40 text-primary-600 dark:text-primary-300'
  if (status === 'approved') return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
  if (status === 'decomposed') return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  return 'bg-primary-200/60 text-primary-600 dark:text-primary-300'
}

function GoalCreator({
  onSubmit,
  busy,
}: {
  onSubmit: (input: { title: string; description: string }) => Promise<void>
  busy: boolean
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handle = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!title.trim() || busy) return
      await onSubmit({ title: title.trim(), description: description.trim() })
      setTitle('')
      setDescription('')
    },
    [title, description, busy, onSubmit],
  )

  return (
    <form
      onSubmit={handle}
      className="rounded-xl border border-primary-200 bg-primary-50 p-4 shadow-sm dark:bg-primary-100"
    >
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary-500">
        Nuevo objetivo
      </h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Objetivo de alto nivel (ej. Lanzar toggle de modo oscuro)"
        className="mb-2 w-full rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent-400 dark:bg-primary-50"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Contexto, restricciones, criterios de éxito…"
        rows={3}
        className="mb-3 w-full resize-y rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent-400 dark:bg-primary-50"
      />
      <button
        type="submit"
        disabled={!title.trim() || busy}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-[13px] font-medium text-white transition-colors',
          busy
            ? 'cursor-not-allowed opacity-60'
            : 'hover:bg-accent-400',
        )}
      >
        <HugeiconsIcon icon={Add01Icon} className="h-4 w-4" />
        {busy ? 'Descomponiendo…' : 'Descomponer objetivo'}
      </button>
    </form>
  )
}

function GoalListItem({
  goal,
  active,
  onSelect,
  onDelete,
}: {
  goal: Goal
  active: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group cursor-pointer rounded-lg border p-3 transition-colors',
        active
          ? 'border-accent-400 bg-accent-50/40 dark:bg-accent-500/10'
          : 'border-primary-200 bg-primary-50 hover:border-primary-300 dark:bg-primary-100',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium text-ink">
            {goal.title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-primary-500">
            <span
              className={cn(
                'inline-flex rounded px-1.5 py-0.5 font-medium',
                goalStatusBadge(goal.status),
              )}
            >
              {GOAL_STATUS_LABEL[goal.status]}
            </span>
            <span>{goal.subtasks.length} sub-tareas</span>
            <span>·</span>
            <span>{formatDate(goal.createdAt)}</span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="rounded p-1 text-primary-400 opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
          title="Eliminar objetivo"
          aria-label="Eliminar objetivo"
        >
          <HugeiconsIcon icon={Delete02Icon} className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

function SubTaskRow({
  subtask,
  index,
  selected,
  onToggle,
  subtasks,
}: {
  subtask: SubTask
  index: number
  selected: boolean
  onToggle: () => void
  subtasks: SubTask[]
}) {
  const dependencyTitles = subtask.dependsOn
    .map((depId) => subtasks.find((s) => s.id === depId)?.title)
    .filter((title): title is string => Boolean(title))

  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        selected
          ? 'border-accent-400 bg-accent-50/40 dark:bg-accent-500/10'
          : 'border-primary-200 bg-primary-50 dark:bg-primary-100',
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 cursor-pointer accent-accent-500"
          aria-label={`Seleccionar ${subtask.title}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn('h-2 w-2 rounded-full', statusDot(subtask.status))}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium uppercase tracking-wide text-primary-500">
              #{index + 1}
            </span>
            <span className="text-[13px] font-medium text-ink">
              {subtask.title}
            </span>
            <span
              className={cn(
                'ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium',
                subtask.status === 'failed'
                  ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                  : subtask.status === 'done'
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                    : subtask.status === 'running' ||
                        subtask.status === 'dispatching'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      : 'bg-primary-200/60 text-primary-600 dark:text-primary-300',
              )}
            >
              {SUBTASK_STATUS_LABEL[subtask.status]}
            </span>
          </div>
          {subtask.description ? (
            <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-primary-600 dark:text-primary-400">
              {subtask.description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-primary-500">
            <span className="inline-flex items-center gap-1">
              <HugeiconsIcon icon={Robot02Icon} className="h-3 w-3" />
              {subtask.agent}
            </span>
            {dependencyTitles.length > 0 ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon icon={ArrowRight01Icon} className="h-3 w-3" />
                depende de {dependencyTitles.join(', ')}
              </span>
            ) : null}
            {subtask.runId ? (
              <span className="inline-flex items-center gap-1">
                <HugeiconsIcon icon={Tag01Icon} className="h-3 w-3" />
                run {subtask.runId.slice(0, 8)}
              </span>
            ) : null}
          </div>
          {subtask.error ? (
            <p className="mt-2 rounded bg-red-500/10 px-2 py-1 text-[11px] text-red-600 dark:text-red-400">
              {subtask.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function GoalDetail({
  goal,
  sessionKey,
  onSessionKeyChange,
  onExecute,
  onRedecompose,
  busyExecute,
  busyDecompose,
}: {
  goal: Goal
  sessionKey: string
  onSessionKeyChange: (value: string) => void
  onExecute: (subtaskIds: string[]) => Promise<void>
  onRedecompose: () => Promise<void>
  busyExecute: boolean
  busyDecompose: boolean
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    setSelected(new Set())
  }, [goal.id])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const allSelected = goal.subtasks.length > 0 && selected.size === goal.subtasks.length
  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(goal.subtasks.map((s) => s.id)))
  }, [allSelected, goal.subtasks])

  const handleExecute = useCallback(async () => {
    if (!sessionKey.trim()) return
    const ids = selected.size === 0 ? [] : Array.from(selected)
    await onExecute(ids)
  }, [sessionKey, selected, onExecute])

  return (
    <div className="flex h-full flex-col gap-4">
      <header className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:bg-primary-100">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-ink">
              {goal.title}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-primary-500">
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 font-medium',
                  goalStatusBadge(goal.status),
                )}
              >
                {GOAL_STATUS_LABEL[goal.status]}
              </span>
              <span>id: {goal.id}</span>
              <span>·</span>
              <span>creado {formatDate(goal.createdAt)}</span>
              <span>·</span>
              <span>origen: {goal.source}</span>
            </div>
            {goal.description ? (
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-primary-700 dark:text-primary-300">
                {goal.description}
              </p>
            ) : null}
            {goal.notes ? (
              <p className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                {goal.notes}
              </p>
            ) : null}
          </div>
          <button
            onClick={onRedecompose}
            disabled={busyDecompose}
            className={cn(
              'inline-flex items-center gap-1 rounded-lg border border-primary-200 px-2 py-1 text-[12px] text-primary-600 transition-colors',
              busyDecompose
                ? 'cursor-not-allowed opacity-60'
                : 'hover:border-accent-400 hover:text-accent-500',
            )}
            title="Volver a ejecutar la descomposición"
          >
            <HugeiconsIcon icon={RefreshIcon} className="h-3 w-3" />
            {busyDecompose ? 'Descomponiendo…' : 'Re-descomponer'}
          </button>
        </div>
      </header>

      <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 dark:bg-primary-100">
        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-primary-500">
          Clave de sesión de despacho
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={sessionKey}
            onChange={(e) => onSessionKeyChange(e.target.value)}
            placeholder="ej. coder-pool / openclaw-main"
            className="min-w-[220px] flex-1 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent-400 dark:bg-primary-50"
          />
          <button
            onClick={toggleAll}
            disabled={goal.subtasks.length === 0}
            className="rounded-lg border border-primary-200 px-3 py-2 text-[12px] text-primary-600 hover:border-accent-400 hover:text-accent-500"
          >
            {allSelected ? 'Limpiar selección' : 'Seleccionar todo'}
          </button>
          <button
            onClick={handleExecute}
            disabled={busyExecute || !sessionKey.trim() || goal.subtasks.length === 0}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg bg-accent-500 px-3 py-2 text-[13px] font-medium text-white transition-colors',
              busyExecute || !sessionKey.trim() || goal.subtasks.length === 0
                ? 'cursor-not-allowed opacity-60'
                : 'hover:bg-accent-400',
            )}
          >
            <HugeiconsIcon icon={PlayIcon} className="h-4 w-4" />
            {busyExecute
              ? 'Despachando…'
              : selected.size === 0
                ? 'Ejecutar pendientes'
                : `Ejecutar ${selected.size} seleccionadas`}
          </button>
        </div>
      </div>

      <section className="flex-1 overflow-y-auto rounded-xl border border-primary-200 bg-primary-50 p-3 dark:bg-primary-100">
        {goal.subtasks.length === 0 ? (
          <p className="p-6 text-center text-[12px] text-primary-500">
            Aún no hay sub-tareas — vuelve a ejecutar la descomposición.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {goal.subtasks.map((subtask, idx) => (
              <SubTaskRow
                key={subtask.id}
                subtask={subtask}
                index={idx}
                subtasks={goal.subtasks}
                selected={selected.has(subtask.id)}
                onToggle={() => toggle(subtask.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export function OrchestratorScreen() {
  const goals = useGoalDecompStore((s) => s.goals)
  const selectedGoalId = useGoalDecompStore((s) => s.selectedGoalId)
  const decomposing = useGoalDecompStore((s) => s.decomposing)
  const executing = useGoalDecompStore((s) => s.executing)
  const lastError = useGoalDecompStore((s) => s.lastError)
  const decompositionSource = useGoalDecompStore(
    (s) => s.lastDecompositionSource,
  )
  const syncFromApi = useGoalDecompStore((s) => s.syncFromApi)
  const decomposeGoal = useGoalDecompStore((s) => s.decomposeGoal)
  const redecompose = useGoalDecompStore((s) => s.redecompose)
  const executeGoal = useGoalDecompStore((s) => s.executeGoal)
  const deleteGoal = useGoalDecompStore((s) => s.deleteGoal)
  const selectGoal = useGoalDecompStore((s) => s.selectGoal)

  // SSR-safe (GAP-F117 follow-up): start with '' on server AND first client paint
  // so React hydration matches. Then peek at localStorage in useEffect.
  const [sessionKey, setSessionKey] = useState<string>('')

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_KEY_STORAGE)
      if (stored) setSessionKey(stored)
    } catch {
      // ignore — keep empty default
    }
  }, [])

  useEffect(() => {
    void syncFromApi()
  }, [syncFromApi])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionKey) window.localStorage.setItem(SESSION_KEY_STORAGE, sessionKey)
    else window.localStorage.removeItem(SESSION_KEY_STORAGE)
  }, [sessionKey])

  const selectedGoal = useMemo(
    () => goals.find((g) => g.id === selectedGoalId) ?? null,
    [goals, selectedGoalId],
  )

  const handleCreate = useCallback(
    async ({ title, description }: { title: string; description: string }) => {
      await decomposeGoal({ title, description, sessionKey: sessionKey || undefined })
    },
    [decomposeGoal, sessionKey],
  )

  const handleRedecompose = useCallback(async () => {
    if (!selectedGoal) return
    await redecompose(selectedGoal.id, sessionKey || undefined)
  }, [redecompose, selectedGoal, sessionKey])

  const handleExecute = useCallback(
    async (subtaskIds: string[]) => {
      if (!selectedGoal) return
      await executeGoal(
        selectedGoal.id,
        sessionKey,
        subtaskIds.length > 0 ? subtaskIds : undefined,
      )
    },
    [executeGoal, selectedGoal, sessionKey],
  )

  return (
    <div className="flex h-full flex-col gap-3 bg-primary-50 p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">Orquestador</h1>
          <p className="text-[12px] text-primary-500">
            Convierte objetivos de alto nivel en sub-tareas listas para los agentes. Descomposición asistida por LLM con revisión manual.
          </p>
        </div>
        <button
          onClick={() => void syncFromApi()}
          className="inline-flex items-center gap-1 rounded-lg border border-primary-200 px-2 py-1 text-[12px] text-primary-600 hover:border-accent-400 hover:text-accent-500"
        >
          <HugeiconsIcon icon={RefreshIcon} className="h-3 w-3" />
          Actualizar
        </button>
      </header>

      {lastError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-600 dark:text-red-400">
          {lastError}
          {decompositionSource === 'fallback'
            ? ' (se usó la heurística de descomposición de respaldo)'
            : null}
        </div>
      ) : null}

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3 overflow-y-auto">
          <GoalCreator onSubmit={handleCreate} busy={decomposing} />
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-3 dark:bg-primary-100">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-primary-500">
                Objetivos ({goals.length})
              </h2>
            </div>
            {goals.length === 0 ? (
              <p className="p-3 text-center text-[12px] text-primary-500">
                Aún no hay objetivos. Crea uno arriba.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {goals.map((goal) => (
                  <GoalListItem
                    key={goal.id}
                    goal={goal}
                    active={goal.id === selectedGoalId}
                    onSelect={() => selectGoal(goal.id)}
                    onDelete={() => void deleteGoal(goal.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
        <main className="flex min-h-0 flex-1 flex-col">
          {selectedGoal ? (
            <GoalDetail
              goal={selectedGoal}
              sessionKey={sessionKey}
              onSessionKeyChange={setSessionKey}
              onExecute={handleExecute}
              onRedecompose={handleRedecompose}
              busyExecute={executing}
              busyDecompose={decomposing}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-primary-200 p-8 text-center dark:border-primary-300">
              <HugeiconsIcon
                icon={Robot02Icon}
                className="mb-3 h-8 w-8 text-primary-400"
              />
              <p className="text-[13px] text-primary-500">
                Selecciona un objetivo a la izquierda o crea uno nuevo para ver su descomposición.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
