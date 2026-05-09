// All mission state persisted to localStorage — local-first, no external DB

export type MissionCheckpoint = {
  id: string
  label: string
  processType: 'sequential' | 'hierarchical' | 'parallel'
  team: Array<{ id: string; name: string; modelId: string; roleDescription: string; goal: string; backstory: string }>
  tasks: Array<{ id: string; title: string; status: string; assignedTo?: string }>
  agentSessionMap: Record<string, string>
  status: 'running' | 'paused' | 'completed' | 'aborted'
  startedAt: number
  updatedAt: number
  completedAt?: number
}

const CURRENT_KEY = 'clawsuite:mission-checkpoint'
const HISTORY_KEY = 'clawsuite:mission-history'
const MAX_HISTORY = 20

export function saveMissionCheckpoint(cp: MissionCheckpoint): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CURRENT_KEY, JSON.stringify({ ...cp, updatedAt: Date.now() }))
  } catch { /* ignore quota errors */ }
}

export function loadMissionCheckpoint(): MissionCheckpoint | null {
  // GAP-F117 follow-up: defensive guard so SSR callers do not crash.
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as MissionCheckpoint
  } catch { return null }
}

export function clearMissionCheckpoint(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CURRENT_KEY)
}

export function archiveMissionToHistory(cp: MissionCheckpoint): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const history: MissionCheckpoint[] = raw ? (JSON.parse(raw) as MissionCheckpoint[]) : []
    history.unshift({ ...cp, completedAt: Date.now() })
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch { /* ignore */ }
}

export function loadMissionHistory(): MissionCheckpoint[] {
  // GAP-F117 follow-up: defensive guard. If anyone calls this from a useState
  // initializer during SSR, we must not throw on missing `localStorage`.
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as MissionCheckpoint[]
  } catch { return [] }
}
