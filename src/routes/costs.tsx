import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { usePageTitle } from '@/hooks/use-page-title'
import { ErrorBoundary } from '@/components/error-boundary'

const CostsScreen = lazy(() =>
  import('@/screens/costs/costs-screen').then((m) => ({ default: m.CostsScreen })),
)

export const Route = createFileRoute('/costs')({
  ssr: false,
  component: function CostsRoute() {
    usePageTitle('Costes')
    return (
      <ErrorBoundary title="Error en analítica de costes" description="No se ha podido cargar la analítica de costes. Prueba a recargar.">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-neutral-400">Cargando analítica de costes…</div>
            </div>
          }
        >
          <CostsScreen />
        </Suspense>
      </ErrorBoundary>
    )
  },
})
