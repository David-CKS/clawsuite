import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../../server/auth-middleware'
import {
  CKS_DEFAULT_JOBS,
  toCronUpsertInput,
} from '@/components/cron-manager/cks-default-jobs'

/**
 * Endpoint read-only que devuelve el catálogo CKS pre-poblado para el Cron
 * Manager. Lo consume `scripts/seed-cks-crons.mjs` (CLI) y opcionalmente
 * cualquier otro tooling externo.
 *
 * El catálogo en sí vive en TypeScript como source-of-truth tipado
 * (src/components/cron-manager/cks-default-jobs.ts). Este endpoint solo lo
 * serializa para consumers fuera del bundle.
 */
export const Route = createFileRoute('/api/cron/cks-defaults')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAuthenticated(request)) {
          return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
        }
        return json({
          ok: true,
          total: CKS_DEFAULT_JOBS.length,
          jobs: CKS_DEFAULT_JOBS.map(function mapJob(job) {
            return {
              cksId: job.cksId,
              category: job.category,
              vpsScript: job.vpsScript ?? null,
              upsertPayload: toCronUpsertInput(job),
            }
          }),
        })
      },
    },
  },
})
