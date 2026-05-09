import { useCallback, useSyncExternalStore } from 'react'

export type DashboardSettings = {
  /** ZIP code, city name, or empty for auto-detect via timezone */
  weatherLocation: string
  /** 12 or 24 hour clock */
  clockFormat: '12h' | '24h'
}

const STORAGE_KEY = 'openclaw-dashboard-settings'

const DEFAULT_SETTINGS: DashboardSettings = {
  weatherLocation: '',
  clockFormat: '12h',
}

let cached: DashboardSettings | null = null

function read(): DashboardSettings {
  if (cached) return cached
  if (typeof window === 'undefined') {
    // SSR: never touch localStorage. Return defaults; the client will
    // re-read from storage on first useEffect tick (post-mount).
    return DEFAULT_SETTINGS
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardSettings>
      cached = { ...DEFAULT_SETTINGS, ...parsed }
      return cached
    }
  } catch {}
  cached = DEFAULT_SETTINGS
  return cached
}

function write(settings: DashboardSettings) {
  cached = settings
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }
  // Notify subscribers
  for (const cb of listeners) cb()
}

const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return read()
}

// Distinct snapshot for SSR — must return a stable reference identical to
// the client's first paint to avoid React #418 hydration mismatch
// (GAP-F117 zone B). React calls this on the server and on the very first
// client render before any effect has run.
function getServerSnapshot() {
  return DEFAULT_SETTINGS
}

export function useDashboardSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  )

  const update = useCallback(function updateSettings(
    patch: Partial<DashboardSettings>,
  ) {
    write({ ...read(), ...patch })
  }, [])

  return { settings, update }
}
