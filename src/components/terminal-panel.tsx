import { useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useNavigate } from '@tanstack/react-router'
import {
  DEFAULT_PANEL_HEIGHT,
  MIN_PANEL_HEIGHT,
  useTerminalPanelStore,
} from '@/stores/terminal-panel-store'

const MAX_VIEWPORT_RATIO = 0.6

export function TerminalPanel() {
  const navigate = useNavigate()
  const isPanelOpen = useTerminalPanelStore((state) => state.isPanelOpen)
  const panelHeight = useTerminalPanelStore((state) => state.panelHeight)
  const setPanelOpen = useTerminalPanelStore((state) => state.setPanelOpen)
  const setPanelHeight = useTerminalPanelStore((state) => state.setPanelHeight)

  const dragStateRef = useRef<{
    startY: number
    startHeight: number
  } | null>(null)

  const handleClose = useCallback(
    function handleClose() {
      setPanelOpen(false)
    },
    [setPanelOpen],
  )

  const handleOpenIssue = useCallback(function handleOpenIssue() {
    window.open(
      'https://github.com/outsourc-e/clawsuite/issues/50',
      '_blank',
      'noopener,noreferrer',
    )
  }, [])

  const handleResizeStart = useCallback(
    function handleResizeStart(event: React.MouseEvent<HTMLDivElement>) {
      event.preventDefault()
      dragStateRef.current = {
        startY: event.clientY,
        startHeight: panelHeight || DEFAULT_PANEL_HEIGHT,
      }

      function onMove(moveEvent: MouseEvent) {
        const dragState = dragStateRef.current
        if (!dragState) return
        const delta = dragState.startY - moveEvent.clientY
        const maxHeight = Math.floor(window.innerHeight * MAX_VIEWPORT_RATIO)
        const nextHeight = Math.max(
          MIN_PANEL_HEIGHT,
          Math.min(maxHeight, dragState.startHeight + delta),
        )
        setPanelHeight(nextHeight)
      }

      function onUp() {
        dragStateRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }

      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [panelHeight, setPanelHeight],
  )

  useEffect(
    function clampHeightToViewport() {
      function clamp() {
        const maxHeight = Math.floor(window.innerHeight * MAX_VIEWPORT_RATIO)
        if (panelHeight > maxHeight) {
          setPanelHeight(maxHeight)
        }
      }

      clamp()
      window.addEventListener('resize', clamp)
      return function cleanup() {
        window.removeEventListener('resize', clamp)
      }
    },
    [panelHeight, setPanelHeight],
  )

  // navigate kept for future use when terminal is restored
  void navigate

  return (
    <AnimatePresence initial={false}>
      {isPanelOpen ? (
        <motion.section
          key="terminal-panel"
          initial={{ y: 36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 32, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute inset-x-0 bottom-0 z-40 border-t border-primary-300 bg-primary-50 shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
          style={{ height: panelHeight }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1 cursor-row-resize bg-primary-300/50 transition-colors hover:bg-[#ea580c]/80"
            onMouseDown={handleResizeStart}
            role="separator"
            aria-label="Resize terminal panel"
          />
          <div className="flex h-full flex-col items-center justify-center px-6 pt-2 text-center text-primary-900">
            <div className="flex items-center gap-2 text-amber-600">
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m0 3.75h.007m9.504-3.75c0 5.385-4.365 9.75-9.75 9.75S2.25 18.135 2.25 12.75 6.615 3 12 3s9.504 4.365 9.504 9.75z"
                />
              </svg>
              <span className="text-sm font-semibold">
                Terminal en mantenimiento
              </span>
            </div>
            <p className="mt-2 max-w-md text-xs text-primary-600">
              Bug conocido (React #418) en CKS Suite (fork de ClawSuite v3.2.0). Reportado upstream;
              vista deshabilitada hasta que se priorice un parche propio o
              upstream merge la corrección.
            </p>
            <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleOpenIssue}
                className="inline-flex items-center gap-2 rounded-md border border-primary-300 bg-primary-100 px-3 py-1.5 text-xs font-medium text-primary-900 transition-colors hover:bg-primary-200"
              >
                Ver issue upstream #50
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-2 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-600"
              >
                Cerrar panel
              </button>
            </div>
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  )
}
