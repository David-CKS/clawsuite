import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type WorkspaceState = {
  sidebarCollapsed: boolean
  fileExplorerCollapsed: boolean
  /** Currently active sub-page route (e.g. '/skills', '/channels') — null means chat-only */
  activeSubPage: string | null
  /** Chat panel visible alongside non-chat routes */
  chatPanelOpen: boolean
  /** Session key for the chat panel (defaults to 'main') */
  chatPanelSessionKey: string
  /** Mobile keyboard / composer focus — hides tab bar */
  mobileKeyboardOpen: boolean
  mobileKeyboardInset: number
  mobileComposerFocused: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleFileExplorer: () => void
  setFileExplorerCollapsed: (collapsed: boolean) => void
  setActiveSubPage: (page: string | null) => void
  toggleChatPanel: () => void
  setChatPanelOpen: (open: boolean) => void
  setChatPanelSessionKey: (key: string) => void
  setMobileKeyboardOpen: (open: boolean) => void
  setMobileKeyboardInset: (inset: number) => void
  setMobileComposerFocused: (focused: boolean) => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      fileExplorerCollapsed: true,
      activeSubPage: null,
      chatPanelOpen: false,
      chatPanelSessionKey: 'main',
      mobileKeyboardOpen: false,
      mobileKeyboardInset: 0,
      mobileComposerFocused: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleFileExplorer: () =>
        set((s) => ({ fileExplorerCollapsed: !s.fileExplorerCollapsed })),
      setFileExplorerCollapsed: (collapsed) =>
        set({ fileExplorerCollapsed: collapsed }),
      setActiveSubPage: (page) => set({ activeSubPage: page }),
      toggleChatPanel: () => set((s) => ({ chatPanelOpen: !s.chatPanelOpen })),
      setChatPanelOpen: (open) => set({ chatPanelOpen: open }),
      setMobileKeyboardOpen: (open) => set({ mobileKeyboardOpen: open }),
      setMobileKeyboardInset: (inset) => set({ mobileKeyboardInset: inset }),
      setMobileComposerFocused: (focused) =>
        set({ mobileComposerFocused: focused }),
      setChatPanelSessionKey: (key) => set({ chatPanelSessionKey: key }),
    }),
    {
      name: 'openclaw-workspace-v1',
      // SSR-safe (GAP-F117 follow-up): same pattern as useSettingsStore. Defer
      // the localStorage read until manual `useWorkspaceStore.persist.rehydrate()`
      // call from a useEffect on the client. This prevents the persisted state
      // from diverging from the server-rendered defaults during hydration,
      // which causes React #418 in components that read from this store on
      // every route (ChatPanelToggle, WorkspaceShell, etc.).
      skipHydration: true,
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        fileExplorerCollapsed: state.fileExplorerCollapsed,
        chatPanelOpen: state.chatPanelOpen,
        chatPanelSessionKey: state.chatPanelSessionKey,
      }),
    },
  ),
)

let didRehydrateWorkspaceStore = false

/**
 * Called from `RootLayout` useEffect on the client. Triggers the manual
 * rehydration that `skipHydration: true` requires. Idempotent.
 */
export function rehydrateWorkspaceStore(): void {
  if (didRehydrateWorkspaceStore) return
  if (typeof window === 'undefined') return
  didRehydrateWorkspaceStore = true
  void useWorkspaceStore.persist.rehydrate()
}
