import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  prepareSeedJobs,
  seedCksCronJobs,
  validateCksCatalog,
} from './cks-cron-seeder'

describe('prepareSeedJobs', () => {
  test('returns CronJobUpsertInput shape from CksDefaultJob catalog', () => {
    const result = prepareSeedJobs()

    expect(result).toHaveLength(12)
    for (const job of result) {
      expect(job).toHaveProperty('name')
      expect(job).toHaveProperty('schedule')
      expect(job).toHaveProperty('enabled')
      expect(job).toHaveProperty('payload')
      expect(job).not.toHaveProperty('cksId')
      expect(job).not.toHaveProperty('category')
      expect(job).not.toHaveProperty('vpsScript')
    }
  })

  test('all jobs are disabled by default for safe import', () => {
    const result = prepareSeedJobs()
    for (const job of result) {
      expect(job.enabled).toBe(false)
    }
  })

  test('all schedule expressions are valid 5-field cron strings', () => {
    const result = prepareSeedJobs()
    const cronFieldRegex = /^(\S+\s+){4}\S+$/
    for (const job of result) {
      expect(job.schedule).toMatch(cronFieldRegex)
    }
  })

  test('every payload has either agentTurn or systemEvent kind', () => {
    const result = prepareSeedJobs()
    for (const job of result) {
      const payload = job.payload as { kind?: string }
      expect(['agentTurn', 'systemEvent']).toContain(payload.kind)
    }
  })
})

describe('validateCksCatalog', () => {
  test('detects duplicate cksIds (none expected in baseline catalog)', () => {
    const result = validateCksCatalog()
    expect(result.ok).toBe(true)
    expect(result.duplicates).toEqual([])
  })

  test('reports total entries as 12', () => {
    const result = validateCksCatalog()
    expect(result.total).toBe(12)
  })
})

describe('seedCksCronJobs', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('dry-run mode does not call fetch', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, jobId: 'x' })),
      )

    const result = await seedCksCronJobs({ dryRun: true })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.attempted).toBe(12)
    expect(result.created).toBe(0)
    expect(result.dryRun).toBe(true)
  })

  test('real mode posts each job to /api/cron/upsert', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true, jobId: 'job-id' }), {
          headers: { 'content-type': 'application/json' },
        }),
      )

    const result = await seedCksCronJobs()

    expect(fetchSpy).toHaveBeenCalledTimes(12)
    const firstCall = fetchSpy.mock.calls[0]
    expect(firstCall[0]).toBe('/api/cron/upsert')
    const init = firstCall[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
    expect(result.created).toBe(12)
    expect(result.failed).toBe(0)
  })

  test('counts failed when API responds non-ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: 'gateway down' }), {
        status: 500,
      }),
    )

    const result = await seedCksCronJobs()

    expect(result.created).toBe(0)
    expect(result.failed).toBe(12)
    expect(result.errors).toHaveLength(12)
    expect(result.errors[0]).toContain('gateway down')
  })

  test('respects custom baseUrl prefix', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true })),
      )

    await seedCksCronJobs({ baseUrl: 'https://clawsuite.cks.example' })

    const firstCall = fetchSpy.mock.calls[0]
    expect(firstCall[0]).toBe(
      'https://clawsuite.cks.example/api/cron/upsert',
    )
  })

  test('forwards Authorization header when authToken provided', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true })),
      )

    await seedCksCronJobs({ authToken: 'Basic dXNlcjpwYXNz' })

    const firstCall = fetchSpy.mock.calls[0]
    const init = firstCall[1] as RequestInit
    expect(init.headers).toMatchObject({
      Authorization: 'Basic dXNlcjpwYXNz',
    })
  })
})
