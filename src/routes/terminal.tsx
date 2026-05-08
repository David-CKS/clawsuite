import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { usePageTitle } from '@/hooks/use-page-title'

export const Route = createFileRoute('/terminal')({
  ssr: false,
  component: TerminalRoute,
  errorComponent: function TerminalError({ error }) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-primary-50">
        <h2 className="text-xl font-semibold text-primary-900 mb-3">
          Terminal Error
        </h2>
        <p className="text-sm text-primary-600 mb-4 max-w-md">
          {error instanceof Error
            ? error.message
            : 'Failed to initialize terminal'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
        >
          Reload Terminal
        </button>
      </div>
    )
  },
})

function TerminalRoute() {
  usePageTitle('Terminal · En mantenimiento')
  const navigate = useNavigate()

  function handleBack() {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    navigate({
      to: '/chat/$sessionKey',
      params: { sessionKey: 'main' },
      replace: true,
    })
  }

  return (
    <div className="box-border flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-surface px-6 pb-24 text-center text-primary-900 md:pb-0">
      <svg
        aria-hidden="true"
        className="mb-4 h-16 w-16 text-amber-500"
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
      <h1 className="mb-2 text-2xl font-semibold">Terminal en mantenimiento</h1>
      <p className="mb-6 max-w-md text-sm text-primary-600">
        El terminal integrado tiene un bug conocido en ClawSuite v3.2.0 que
        afecta el wire-up del teclado tras la hidratación SSR (React error #418).
        Hasta que se priorice un parche propio o upstream merge la corrección,
        esta vista está deshabilitada.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <a
          href="https://github.com/outsourc-e/clawsuite/issues/50"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-primary-300 bg-primary-100 px-4 py-2 text-sm font-medium text-primary-900 transition-colors hover:bg-primary-200"
        >
          Ver issue upstream #50
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
            />
          </svg>
        </a>
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-600"
        >
          Volver al chat
        </button>
      </div>
      <p className="mt-6 max-w-md text-xs text-primary-500">
        Mientras tanto, usa el terminal de tu IDE local o SSH directo al VPS
        para tareas operativas.
      </p>
    </div>
  )
}
