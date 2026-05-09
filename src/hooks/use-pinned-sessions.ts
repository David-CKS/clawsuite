import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type PinnedSessionsState = {
  pinnedSessionKeys: Array<string>
  pinSession: (key: string) => void
  unpinSession: (key: string) => void
  togglePinnedSession: (key: string) => void
  isSessionPinned: (key: string) => boolean
}

export const usePinnedSessionsStore = create<PinnedSessionsState>()(
  persist(
    (set, get) => ({
      pinnedSessionKeys: [],
      pinSession: (key) =>
        set((state) => {
          if (state.pinnedSessionKeys.includes(key)) return state
          return { pinnedSessionKeys: [...state.pinnedSessionKeys, key] }
        }),
      unpinSession: (key) =>
        set((state) => ({
          pinnedSessionKeys: state.pinnedSessionKeys.filter(
            (pinnedKey) => pinnedKey !== key,
          ),
        })),
      togglePinnedSession: (key) => {
        if (get().isSessionPinned(key)) {
          get().unpinSession(key)
          return
        }
        get().pinSession(key)
      },
      isSessionPinned: (key) => get().pinnedSessionKeys.includes(key),
    }),
    {
      name: 'pinned-sessions',
      // SSR-safe (GAP-F117 final): defer localStorage read until manual
      // rehydrate from RootLayout useEffect. Prevents server/client mismatch
      // for `pinnedSessionKeys` array on initial render in the sidebar.
      skipHydration: true,
    },
  ),
)

let didRehydratePinnedSessionsStore = false

/**
 * Called from `RootLayout` useEffect on the client. Triggers the manual
 * rehydration that `skipHydration: true` requires. Idempotent.
 */
export function rehydratePinnedSessionsStore(): void {
  if (didRehydratePinnedSessionsStore) return
  if (typeof window === 'undefined') return
  didRehydratePinnedSessionsStore = true
  void usePinnedSessionsStore.persist.rehydrate()
}

export function usePinnedSessions() {
  const pinnedSessionKeys = usePinnedSessionsStore((s) => s.pinnedSessionKeys)
  const togglePinnedSession = usePinnedSessionsStore(
    (s) => s.togglePinnedSession,
  )
  return { pinnedSessionKeys, togglePinnedSession }
}
