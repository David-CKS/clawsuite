/**
 * Tracks which widgets are currently visible on the dashboard.
 * Persisted to localStorage, reversible via Reset Layout.
 */
import { useCallback, useEffect, useState } from 'react'
import type { WidgetId } from '../constants/grid-config'
import { WIDGET_REGISTRY } from '../constants/grid-config'

const STORAGE_KEY = 'openclaw-dashboard-visible-widgets-v3'

/** Widgets hidden by default — available via Widgets menu */
const HIDDEN_BY_DEFAULT: WidgetId[] = [
  'notifications',
  'usage-meter',
  'agent-status',
  'activity-log',
  'skills',
]

function getDefaultVisibleIds(): WidgetId[] {
  return WIDGET_REGISTRY.map((w) => w.id).filter(
    (id) => !HIDDEN_BY_DEFAULT.includes(id),
  )
}

function loadVisibleFromStorage(): WidgetId[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as WidgetId[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    /* ignore */
  }
  return null
}

function saveVisible(ids: WidgetId[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

export function useVisibleWidgets() {
  // SSR-safe: start with defaults on both server and client first paint, then
  // sync to localStorage in useEffect post-mount. Avoids React #418 hydration
  // mismatch when the user has persisted widget preferences. GAP-F117 zone B.
  const [visibleIds, setVisibleIds] = useState<WidgetId[]>(getDefaultVisibleIds)

  useEffect(() => {
    const persisted = loadVisibleFromStorage()
    if (persisted) setVisibleIds(persisted)
  }, [])

  const addWidget = useCallback((id: WidgetId) => {
    setVisibleIds((prev) => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      saveVisible(next)
      return next
    })
  }, [])

  const removeWidget = useCallback((id: WidgetId) => {
    setVisibleIds((prev) => {
      const next = prev.filter((w) => w !== id)
      saveVisible(next)
      return next
    })
  }, [])

  const resetVisible = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    const defaults = getDefaultVisibleIds()
    setVisibleIds(defaults)
  }, [])

  return { visibleIds, addWidget, removeWidget, resetVisible }
}
