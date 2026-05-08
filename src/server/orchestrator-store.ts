import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const GOALS_FILE = path.join(process.cwd(), 'data', 'orchestrator-goals.json')

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

async function ensureFile(): Promise<void> {
  await fs.mkdir(path.dirname(GOALS_FILE), { recursive: true })
  try {
    await fs.access(GOALS_FILE)
  } catch {
    await fs.writeFile(GOALS_FILE, '[]', 'utf-8')
  }
}

export async function readGoals(): Promise<Goal[]> {
  await ensureFile()
  try {
    const raw = await fs.readFile(GOALS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as Goal[]) : []
  } catch {
    return []
  }
}

async function writeGoals(goals: Goal[]): Promise<void> {
  await ensureFile()
  await fs.writeFile(GOALS_FILE, JSON.stringify(goals, null, 2), 'utf-8')
}

export type CreateGoalInput = {
  title: string
  description?: string
  source?: GoalSource
  telegramChatId?: number
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const now = new Date().toISOString()
  const goal: Goal = {
    id: `GOAL-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4)}`,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    source: input.source ?? 'ui',
    status: 'draft',
    subtasks: [],
    telegramChatId: input.telegramChatId,
    createdAt: now,
    updatedAt: now,
  }
  const goals = await readGoals()
  goals.unshift(goal)
  await writeGoals(goals)
  return goal
}

export async function getGoal(id: string): Promise<Goal | null> {
  const goals = await readGoals()
  return goals.find((g) => g.id === id) ?? null
}

export async function updateGoal(
  id: string,
  patch: Partial<Omit<Goal, 'id' | 'createdAt'>>,
): Promise<Goal | null> {
  const goals = await readGoals()
  const idx = goals.findIndex((g) => g.id === id)
  if (idx === -1) return null
  const next: Goal = {
    ...goals[idx],
    ...patch,
    id: goals[idx].id,
    createdAt: goals[idx].createdAt,
    updatedAt: new Date().toISOString(),
  }
  goals[idx] = next
  await writeGoals(goals)
  return next
}

export async function deleteGoal(id: string): Promise<boolean> {
  const goals = await readGoals()
  const filtered = goals.filter((g) => g.id !== id)
  if (filtered.length === goals.length) return false
  await writeGoals(filtered)
  return true
}

export async function setSubtasks(
  goalId: string,
  subtasks: SubTask[],
): Promise<Goal | null> {
  return updateGoal(goalId, { subtasks, status: 'decomposed' })
}

export async function patchSubtask(
  goalId: string,
  subtaskId: string,
  patch: Partial<Omit<SubTask, 'id'>>,
): Promise<Goal | null> {
  const goal = await getGoal(goalId)
  if (!goal) return null
  const next = goal.subtasks.map((st) =>
    st.id === subtaskId ? { ...st, ...patch, id: st.id } : st,
  )
  return updateGoal(goalId, { subtasks: next })
}

export function makeSubtask(input: {
  title: string
  description?: string
  agent?: string
  dependsOn?: string[]
}): SubTask {
  return {
    id: `ST-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4)}`,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    agent: (input.agent ?? 'general').trim(),
    dependsOn: input.dependsOn ?? [],
    status: 'pending',
  }
}
