import { create } from 'zustand'

export type SubTaskStatus =
  | 'pending'
  | 'dispatching'
  | 'running'
  | 'done'
  | 'failed'
  | 'skipped'

export type SubTask = {
  id: string
  title: string
  description: string
  agent: string
  dependsOn: string[]
  status: SubTaskStatus
  runId?: string
  output?: string
  error?: string
  startedAt?: string
  finishedAt?: string
}

export type GoalStatus =
  | 'draft'
  | 'decomposed'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type GoalSource = 'ui' | 'telegram' | 'api'

export type Goal = {
  id: string
  title: string
  description: string
  source: GoalSource
  status: GoalStatus
  subtasks: SubTask[]
  notes?: string
  telegramChatId?: number
  createdAt: string
  updatedAt: string
}

type DecomposeResponse = {
  goal: Goal
  decompositionSource: 'llm' | 'fallback'
  decompositionError?: string
}

type ExecuteResponse = {
  goal: Goal
  dispatched: Array<{ subtaskId: string; runId?: string; error?: string }>
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as Record<string, unknown>
    if (typeof payload.error === 'string') return payload.error
  } catch {
    // ignore
  }
  return `Request failed (${response.status})`
}

type Store = {
  goals: Goal[]
  selectedGoalId: string | null
  loading: boolean
  decomposing: boolean
  executing: boolean
  lastError: string | null
  lastDecompositionSource: 'llm' | 'fallback' | null
  selectGoal: (id: string | null) => void
  syncFromApi: () => Promise<void>
  decomposeGoal: (input: {
    title: string
    description: string
    sessionKey?: string
  }) => Promise<Goal | null>
  redecompose: (
    goalId: string,
    sessionKey?: string,
  ) => Promise<Goal | null>
  executeGoal: (
    goalId: string,
    sessionKey: string,
    subtaskIds?: string[],
  ) => Promise<Goal | null>
  deleteGoal: (goalId: string) => Promise<void>
  patchGoal: (
    goalId: string,
    patch: Partial<Pick<Goal, 'status' | 'notes' | 'title' | 'description'>>,
  ) => Promise<Goal | null>
}

function upsertGoal(goals: Goal[], goal: Goal): Goal[] {
  const idx = goals.findIndex((g) => g.id === goal.id)
  if (idx === -1) return [goal, ...goals]
  const next = goals.slice()
  next[idx] = goal
  return next
}

export const useGoalDecompStore = create<Store>((set, get) => ({
  goals: [],
  selectedGoalId: null,
  loading: false,
  decomposing: false,
  executing: false,
  lastError: null,
  lastDecompositionSource: null,

  selectGoal: (id) => set({ selectedGoalId: id }),

  syncFromApi: async () => {
    set({ loading: true, lastError: null })
    try {
      const response = await fetch('/api/orchestrator/goals')
      if (!response.ok) {
        const message = await readError(response)
        set({ loading: false, lastError: message })
        return
      }
      const payload = (await response.json()) as { goals?: Goal[] }
      set({
        goals: Array.isArray(payload.goals) ? payload.goals : [],
        loading: false,
      })
    } catch (err) {
      set({
        loading: false,
        lastError: err instanceof Error ? err.message : String(err),
      })
    }
  },

  decomposeGoal: async ({ title, description, sessionKey }) => {
    set({ decomposing: true, lastError: null, lastDecompositionSource: null })
    try {
      const response = await fetch('/api/orchestrator/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sessionKey, source: 'ui' }),
      })
      if (!response.ok) {
        const message = await readError(response)
        set({ decomposing: false, lastError: message })
        return null
      }
      const payload = (await response.json()) as DecomposeResponse
      set((state) => ({
        decomposing: false,
        goals: upsertGoal(state.goals, payload.goal),
        selectedGoalId: payload.goal.id,
        lastDecompositionSource: payload.decompositionSource,
        lastError: payload.decompositionError ?? null,
      }))
      return payload.goal
    } catch (err) {
      set({
        decomposing: false,
        lastError: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  },

  redecompose: async (goalId, sessionKey) => {
    set({ decomposing: true, lastError: null })
    try {
      const response = await fetch('/api/orchestrator/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, sessionKey }),
      })
      if (!response.ok) {
        const message = await readError(response)
        set({ decomposing: false, lastError: message })
        return null
      }
      const payload = (await response.json()) as DecomposeResponse
      set((state) => ({
        decomposing: false,
        goals: upsertGoal(state.goals, payload.goal),
        lastDecompositionSource: payload.decompositionSource,
        lastError: payload.decompositionError ?? null,
      }))
      return payload.goal
    } catch (err) {
      set({
        decomposing: false,
        lastError: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  },

  executeGoal: async (goalId, sessionKey, subtaskIds) => {
    set({ executing: true, lastError: null })
    try {
      const response = await fetch('/api/orchestrator/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId, sessionKey, subtaskIds }),
      })
      if (!response.ok) {
        const message = await readError(response)
        set({ executing: false, lastError: message })
        return null
      }
      const payload = (await response.json()) as ExecuteResponse
      set((state) => ({
        executing: false,
        goals: upsertGoal(state.goals, payload.goal),
      }))
      return payload.goal
    } catch (err) {
      set({
        executing: false,
        lastError: err instanceof Error ? err.message : String(err),
      })
      return null
    }
  },

  deleteGoal: async (goalId) => {
    const previous = get().goals
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== goalId),
      selectedGoalId:
        state.selectedGoalId === goalId ? null : state.selectedGoalId,
    }))
    try {
      const response = await fetch(`/api/orchestrator/goals/${goalId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const message = await readError(response)
        set({ goals: previous, lastError: message })
      }
    } catch (err) {
      set({
        goals: previous,
        lastError: err instanceof Error ? err.message : String(err),
      })
    }
  },

  patchGoal: async (goalId, patch) => {
    try {
      const response = await fetch(`/api/orchestrator/goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!response.ok) {
        const message = await readError(response)
        set({ lastError: message })
        return null
      }
      const payload = (await response.json()) as { goal: Goal }
      set((state) => ({
        goals: upsertGoal(state.goals, payload.goal),
      }))
      return payload.goal
    } catch (err) {
      set({ lastError: err instanceof Error ? err.message : String(err) })
      return null
    }
  },
}))

export const SUBTASK_STATUS_LABEL: Record<SubTaskStatus, string> = {
  pending: 'Pending',
  dispatching: 'Dispatching',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  skipped: 'Skipped',
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  draft: 'Draft',
  decomposed: 'Decomposed',
  approved: 'Approved',
  executing: 'Executing',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}
