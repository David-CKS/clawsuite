import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdditionalSource, SourceStatus } from '@/types/sources'

type SourcesState = {
  sources: Array<AdditionalSource>
  statuses: Record<string, SourceStatus>
  addSource: (
    input: Omit<AdditionalSource, 'id' | 'createdAt' | 'updatedAt'>,
  ) => string
  updateSource: (id: string, patch: Partial<AdditionalSource>) => void
  removeSource: (id: string) => void
  toggleSource: (id: string) => void
  setStatus: (id: string, status: SourceStatus) => void
  clearStatuses: () => void
}

function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as Crypto).randomUUID === 'function'
  ) {
    return (crypto as Crypto).randomUUID()
  }
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  )
}

export const useSourcesStore = create<SourcesState>()(
  persist(
    function createSourcesStore(set) {
      return {
        sources: [],
        statuses: {},
        addSource: function addSource(input) {
          const now = Date.now()
          const id = generateId()
          set(function applyAdd(state) {
            return {
              sources: [
                ...state.sources,
                { ...input, id, createdAt: now, updatedAt: now },
              ],
            }
          })
          return id
        },
        updateSource: function updateSource(id, patch) {
          set(function applyPatch(state) {
            return {
              sources: state.sources.map(function applyToMatch(s) {
                if (s.id !== id) return s
                return {
                  ...s,
                  ...patch,
                  id: s.id,
                  createdAt: s.createdAt,
                  updatedAt: Date.now(),
                }
              }),
            }
          })
        },
        removeSource: function removeSource(id) {
          set(function applyRemove(state) {
            const nextStatuses: Record<string, SourceStatus> = {}
            for (const key of Object.keys(state.statuses)) {
              if (key !== id) nextStatuses[key] = state.statuses[key]
            }
            return {
              sources: state.sources.filter(function keepOthers(s) {
                return s.id !== id
              }),
              statuses: nextStatuses,
            }
          })
        },
        toggleSource: function toggleSource(id) {
          set(function applyToggle(state) {
            return {
              sources: state.sources.map(function flipMatch(s) {
                if (s.id !== id) return s
                return { ...s, enabled: !s.enabled, updatedAt: Date.now() }
              }),
            }
          })
        },
        setStatus: function setStatus(id, status) {
          set(function applyStatus(state) {
            return {
              statuses: { ...state.statuses, [id]: status },
            }
          })
        },
        clearStatuses: function clearStatuses() {
          set(function reset() {
            return { statuses: {} }
          })
        },
      }
    },
    {
      name: 'openclaw-sources',
      partialize: function partialize(state) {
        return { sources: state.sources }
      },
    },
  ),
)

export function useSources() {
  return useSourcesStore(function selectSources(state) {
    return state.sources
  })
}

export function useSourceById(id: string): AdditionalSource | undefined {
  return useSourcesStore(function findSource(state) {
    return state.sources.find(function matchId(s) {
      return s.id === id
    })
  })
}

export function useSourceStatus(id: string): SourceStatus {
  return useSourcesStore(function selectStatus(state) {
    return state.statuses[id] ?? 'unknown'
  })
}
