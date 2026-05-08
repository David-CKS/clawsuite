/**
 * CKS Bridge — server module for talking to api.carkeysystem.com
 *
 * The bridge exposes Sergio's Lobster API v3 (subset /bridge/v1/*) through a
 * Cloudflare Tunnel running in David's account. Auth is via X-API-Key header.
 *
 * This module:
 *   - wraps fetch with API key + timeout + audit log
 *   - exposes a small ring buffer of recent queries for the dashboard
 */

const DEFAULT_BASE_URL = 'https://api.carkeysystem.com'
const DEFAULT_TIMEOUT_MS = 8_000
const RECENT_QUERIES_LIMIT = 100

export type RecentQuery = {
  ts: number
  path: string
  method: string
  status: number
  durationMs: number
  ok: boolean
  error?: string
}

const recentQueries: RecentQuery[] = []

function recordQuery(entry: RecentQuery) {
  recentQueries.push(entry)
  if (recentQueries.length > RECENT_QUERIES_LIMIT) {
    recentQueries.splice(0, recentQueries.length - RECENT_QUERIES_LIMIT)
  }
}

export function getBridgeBaseUrl(): string {
  const v = process.env.SERGIO_API_BASE_URL?.trim()
  return v && v.length > 0 ? v.replace(/\/+$/, '') : DEFAULT_BASE_URL
}

export function getBridgeApiKey(): string | null {
  const v = process.env.SERGIO_API_KEY?.trim()
  return v && v.length > 0 ? v : null
}

export type CksFetchResult<T> =
  | { ok: true; data: T; status: number; durationMs: number }
  | { ok: false; error: string; status: number; durationMs: number }

export async function cksFetch<T = unknown>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<CksFetchResult<T>> {
  const baseUrl = getBridgeBaseUrl()
  const apiKey = getBridgeApiKey()
  const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`
  const method = (init.method ?? 'GET').toUpperCase()
  const timeoutMs = init.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const start = Date.now()

  let status = 0
  let durationMs = 0

  try {
    const headers = new Headers(init.headers)
    if (apiKey) headers.set('X-API-Key', apiKey)
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')

    const res = await fetch(url, {
      ...init,
      method,
      headers,
      signal: controller.signal,
    })
    durationMs = Date.now() - start
    status = res.status

    let data: unknown = null
    const text = await res.text()
    if (text.length > 0) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    const ok = res.ok
    recordQuery({
      ts: Date.now(),
      path,
      method,
      status,
      durationMs,
      ok,
      error: ok ? undefined : `HTTP ${status}`,
    })

    if (!ok) {
      return {
        ok: false,
        status,
        durationMs,
        error: `HTTP ${status}`,
      }
    }

    return { ok: true, status, durationMs, data: data as T }
  } catch (err) {
    durationMs = Date.now() - start
    const message =
      err instanceof Error
        ? err.name === 'AbortError'
          ? `timeout after ${timeoutMs}ms`
          : err.message
        : 'unknown error'
    recordQuery({
      ts: Date.now(),
      path,
      method,
      status: status || 0,
      durationMs,
      ok: false,
      error: message,
    })
    return { ok: false, status: status || 0, durationMs, error: message }
  } finally {
    clearTimeout(timer)
  }
}

export function getRecentQueries(limit = RECENT_QUERIES_LIMIT): RecentQuery[] {
  const slice = recentQueries.slice(-limit)
  return slice.slice().reverse()
}

export type DailyCount = { date: string; count: number; ok: number; failed: number }

/**
 * Aggregate the audit log into a 7-day bucket histogram.
 * Returns oldest-first so it can be plotted directly.
 */
export function getDailyHistogram(days = 7): DailyCount[] {
  const now = new Date()
  const buckets = new Map<string, DailyCount>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = isoDate(d)
    buckets.set(key, { date: key, count: 0, ok: 0, failed: 0 })
  }

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  for (const q of recentQueries) {
    if (q.ts < cutoff) continue
    const key = isoDate(new Date(q.ts))
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.count += 1
    if (q.ok) bucket.ok += 1
    else bucket.failed += 1
  }

  return Array.from(buckets.values())
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function countQueriesSince(sinceMs: number): number {
  return recentQueries.filter((q) => q.ts >= sinceMs).length
}
