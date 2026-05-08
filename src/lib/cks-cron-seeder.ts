/**
 * CKS Cron Seeder — lógica core para importar el catálogo CKS_DEFAULT_JOBS
 * al gateway OpenClaw vía /api/cron/upsert.
 *
 * Diseñado como módulo testeable independiente del transport (browser fetch,
 * node fetch, dry-run). El componente UI y el CLI ambos lo consumen.
 */

import {
  CKS_DEFAULT_JOBS,
  toCronUpsertInput,
  type CksDefaultJob,
} from '@/components/cron-manager/cks-default-jobs'
import type { CronJobUpsertInput } from '@/components/cron-manager/cron-types'

export type SeedOptions = {
  /** Si `true`, no hace HTTP — solo prepara payloads y reporta. */
  dryRun?: boolean
  /** Prefijo de URL (ej: `https://clawsuite.cks.example`). Por defecto vacío. */
  baseUrl?: string
  /** Bearer/Basic auth para entornos remotos. */
  authToken?: string
  /**
   * Opcional: catálogo a sembrar. Por defecto usa `CKS_DEFAULT_JOBS`.
   * Útil para tests y para subsets curados.
   */
  catalog?: ReadonlyArray<CksDefaultJob>
}

export type SeedResult = {
  attempted: number
  created: number
  failed: number
  dryRun: boolean
  errors: ReadonlyArray<string>
}

export type CatalogValidation = {
  ok: boolean
  total: number
  duplicates: ReadonlyArray<string>
}

/**
 * Convierte el catálogo CKS al shape exacto que espera /api/cron/upsert.
 */
export function prepareSeedJobs(
  catalog: ReadonlyArray<CksDefaultJob> = CKS_DEFAULT_JOBS,
): ReadonlyArray<CronJobUpsertInput> {
  return catalog.map(function mapJob(job) {
    return toCronUpsertInput(job)
  })
}

/**
 * Valida estructuralmente el catálogo: detecta duplicados de cksId.
 */
export function validateCksCatalog(
  catalog: ReadonlyArray<CksDefaultJob> = CKS_DEFAULT_JOBS,
): CatalogValidation {
  const seen = new Set<string>()
  const duplicates: string[] = []
  for (const job of catalog) {
    if (seen.has(job.cksId)) {
      duplicates.push(job.cksId)
    } else {
      seen.add(job.cksId)
    }
  }
  return {
    ok: duplicates.length === 0,
    total: catalog.length,
    duplicates,
  }
}

function readErrorFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (typeof record.error === 'string') return record.error
  if (typeof record.message === 'string') return record.message
  return null
}

async function postOne(
  job: CronJobUpsertInput,
  baseUrl: string,
  authToken: string | undefined,
): Promise<{ ok: boolean; error?: string }> {
  const url = `${baseUrl}/api/cron/upsert`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authToken) headers.Authorization = authToken

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(job),
    })
    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      // ignore parse error
    }
    if (!response.ok) {
      const msg =
        readErrorFromPayload(payload) ?? `HTTP ${response.status}`
      return { ok: false, error: `${job.name}: ${msg}` }
    }
    if (payload && typeof payload === 'object' && 'ok' in payload) {
      const okFlag = (payload as Record<string, unknown>).ok
      if (okFlag === false) {
        const msg = readErrorFromPayload(payload) ?? 'request failed'
        return { ok: false, error: `${job.name}: ${msg}` }
      }
    }
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `${job.name}: ${msg}` }
  }
}

/**
 * Ejecuta el seed. En `dryRun: true` no toca la red.
 * En modo real hace POST secuencial a /api/cron/upsert por cada entry.
 *
 * Secuencial (no paralelo) por seguridad: el gateway puede aplicar rate limit
 * y queremos errores deterministas por entry.
 */
export async function seedCksCronJobs(
  options: SeedOptions = {},
): Promise<SeedResult> {
  const dryRun = Boolean(options.dryRun)
  const baseUrl = (options.baseUrl ?? '').replace(/\/+$/, '')
  const catalog = options.catalog ?? CKS_DEFAULT_JOBS
  const jobs = prepareSeedJobs(catalog)

  if (dryRun) {
    return {
      attempted: jobs.length,
      created: 0,
      failed: 0,
      dryRun: true,
      errors: [],
    }
  }

  const errors: string[] = []
  let created = 0

  for (const job of jobs) {
    const result = await postOne(job, baseUrl, options.authToken)
    if (result.ok) {
      created += 1
    } else if (result.error) {
      errors.push(result.error)
    }
  }

  return {
    attempted: jobs.length,
    created,
    failed: jobs.length - created,
    dryRun: false,
    errors,
  }
}
