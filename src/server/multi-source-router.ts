/**
 * Routing helpers for `AdditionalSource` entries.
 *
 * The primary gateway flow (`src/server/gateway.ts`) is unchanged. This
 * module provides per-source probes and an HTTP-style request router for
 * `mcp` and `dashboard` types. Secondary gateway sources are probed via
 * /healthz HTTP fallback — full WebSocket runtime clients per gateway are
 * intentionally out of scope until a multi-tenant routing requirement
 * lands (the `gateway` shape is persisted today so the UI can stage
 * tenants without changing storage later).
 */

import type { AdditionalSource, SourceStatus } from '@/types/sources'

export type SourceProbeResult = {
  status: SourceStatus
  latencyMs?: number
  details?: string
}

const DEFAULT_TIMEOUT_MS = 5000

export async function probeSource(
  source: AdditionalSource,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<SourceProbeResult> {
  if (!source.enabled) {
    return { status: 'unknown', details: 'disabled' }
  }
  if (source.type === 'gateway') {
    return probeGatewayHttp(source.url, source.token, timeoutMs)
  }
  return probeHttp(source.url, source.token, timeoutMs)
}

async function probeHttp(
  rawUrl: string,
  token: string | undefined,
  timeoutMs: number,
): Promise<SourceProbeResult> {
  const url = rawUrl.trim()
  if (!url) return { status: 'error', details: 'empty url' }
  const start = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(function timedOut() {
    controller.abort()
  }, timeoutMs)
  try {
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(buildHealthUrl(url), {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
    })
    return classifyResponse(response, start)
  } catch (e) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      details: errorMessage(e),
    }
  } finally {
    clearTimeout(timer)
  }
}

async function probeGatewayHttp(
  rawUrl: string,
  token: string | undefined,
  timeoutMs: number,
): Promise<SourceProbeResult> {
  const httpUrl = rawUrl
    .trim()
    .replace(/^wss:\/\//i, 'https://')
    .replace(/^ws:\/\//i, 'http://')
  return probeHttp(httpUrl, token, timeoutMs)
}

function buildHealthUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.pathname === '' || parsed.pathname === '/') {
      parsed.pathname = '/healthz'
    }
    return parsed.toString()
  } catch {
    return url
  }
}

function classifyResponse(
  response: Response,
  start: number,
): SourceProbeResult {
  const latencyMs = Date.now() - start
  const status = response.status
  if (status >= 200 && status < 400) {
    return { status: 'online', latencyMs, details: `HTTP ${status}` }
  }
  // 401/403/404 still imply the host is reachable, just with auth/path issues
  if (status === 401 || status === 403 || status === 404) {
    return { status: 'online', latencyMs, details: `HTTP ${status} reachable` }
  }
  if (status >= 500) {
    return { status: 'offline', latencyMs, details: `HTTP ${status}` }
  }
  return { status: 'offline', latencyMs, details: `HTTP ${status}` }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

export type SourceRequestInit = Omit<RequestInit, 'headers'> & {
  path?: string
  headers?: Record<string, string>
}

/**
 * Issue an authenticated HTTP request against an MCP/Dashboard source.
 * Gateway sources are rejected — those need WebSocket runtime clients.
 */
export async function requestToSource(
  source: AdditionalSource,
  init: SourceRequestInit = {},
): Promise<Response> {
  if (!source.enabled) {
    throw new Error(`Source "${source.name}" is disabled`)
  }
  if (source.type === 'gateway') {
    throw new Error(
      'Gateway sources require a WebSocket runtime client; use the dedicated gateway client factory.',
    )
  }
  const path = normalizePath(init.path ?? '/')
  const targetUrl = joinUrl(source.url, path)
  const headers: Record<string, string> = { ...(init.headers ?? {}) }
  if (source.token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${source.token}`
  }
  const { path: _ignored, ...rest } = init
  return fetch(targetUrl, { ...rest, headers })
}

function normalizePath(path: string): string {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

function joinUrl(base: string, path: string): string {
  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base
  return `${trimmed}${path}`
}

/**
 * Resolve a list of source ids to runnable handles, filtering out
 * disabled/missing entries. Useful for UI panels that need to reflect
 * current routing without re-implementing the lookup.
 */
export function resolveSourcesById(
  ids: ReadonlyArray<string>,
  registry: ReadonlyArray<AdditionalSource>,
): Array<AdditionalSource> {
  const map = new Map(registry.map(function indexById(s) {
    return [s.id, s] as const
  }))
  const result: Array<AdditionalSource> = []
  for (const id of ids) {
    const source = map.get(id)
    if (source && source.enabled) result.push(source)
  }
  return result
}
