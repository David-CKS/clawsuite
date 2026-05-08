#!/usr/bin/env node
/**
 * seed-cks-crons.mjs — bulk-import del catálogo CKS al Cron Manager.
 *
 * Lee el catálogo vía GET /api/cron/cks-defaults (single source-of-truth en
 * src/components/cron-manager/cks-default-jobs.ts) y postea cada entry a
 * /api/cron/upsert.
 *
 * Diseñado para usarse contra una instancia ClawSuite viva. Para preview sin
 * server, usa el botón "Import CKS Defaults" del Cron Manager (mismo
 * efecto, fetch desde el browser).
 *
 * Usage:
 *   node scripts/seed-cks-crons.mjs --base-url http://127.0.0.1:3000
 *   node scripts/seed-cks-crons.mjs --base-url https://cks.suite \
 *       --auth-basic david:supersecret
 *   node scripts/seed-cks-crons.mjs --base-url http://127.0.0.1:3000 --dry-run
 *
 * Flags:
 *   --base-url <url>      ClawSuite instance URL (required).
 *   --auth-basic <u:p>    HTTP Basic auth credentials.
 *   --auth-bearer <token> HTTP Bearer token (alternative to --auth-basic).
 *   --auth-header <hdr>   Raw Authorization header value.
 *   --dry-run             Fetch catalog but do not POST upserts.
 *   --enabled             Override `enabled: false` and import as enabled.
 *                         Use with care — creates real LLM cost on next tick.
 *   --help                Show this message.
 */

import { argv, exit, stdout, stderr } from 'node:process'

const USAGE = `Usage: seed-cks-crons.mjs --base-url <url> [options]

Bulk-imports the 12 CKS default cron jobs into a ClawSuite instance.

Options:
  --base-url <url>       ClawSuite URL (required, e.g. http://127.0.0.1:3000)
  --auth-basic <u:p>     HTTP Basic auth credentials
  --auth-bearer <token>  HTTP Bearer token
  --auth-header <hdr>    Raw Authorization header value
  --dry-run              Fetch catalog and print plan, do not POST
  --enabled              Override enabled:false (creates LLM cost on next tick)
  --help                 Show this message

Endpoints used:
  GET  /api/cron/cks-defaults  → reads the canonical catalog
  POST /api/cron/upsert        → creates each job
`

function parseArgs(args) {
  const opts = {
    baseUrl: '',
    authHeader: '',
    dryRun: false,
    forceEnabled: false,
    showHelp: false,
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--help' || a === '-h') {
      opts.showHelp = true
    } else if (a === '--dry-run') {
      opts.dryRun = true
    } else if (a === '--enabled') {
      opts.forceEnabled = true
    } else if (a === '--base-url') {
      opts.baseUrl = args[++i] ?? ''
    } else if (a === '--auth-basic') {
      const cred = args[++i] ?? ''
      const encoded = Buffer.from(cred, 'utf8').toString('base64')
      opts.authHeader = `Basic ${encoded}`
    } else if (a === '--auth-bearer') {
      opts.authHeader = `Bearer ${args[++i] ?? ''}`
    } else if (a === '--auth-header') {
      opts.authHeader = args[++i] ?? ''
    } else {
      throw new Error(`Unknown flag: ${a}`)
    }
  }
  return opts
}

function fail(msg, code = 2) {
  stderr.write(`error: ${msg}\n`)
  stderr.write('\n')
  stderr.write(USAGE)
  exit(code)
}

async function fetchCatalog(baseUrl, authHeader) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/cron/cks-defaults`
  const headers = { Accept: 'application/json' }
  if (authHeader) headers.Authorization = authHeader
  const response = await fetch(url, { headers })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(
      `GET ${url} → HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
    )
  }
  const payload = await response.json()
  if (!payload?.ok || !Array.isArray(payload.jobs)) {
    throw new Error(`unexpected response shape from ${url}`)
  }
  return payload.jobs
}

async function postOne(job, baseUrl, authHeader) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/cron/upsert`
  const headers = { 'Content-Type': 'application/json' }
  if (authHeader) headers.Authorization = authHeader
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(job.upsertPayload),
  })
  let payload = null
  try {
    payload = await response.json()
  } catch {
    /* ignore */
  }
  const ok =
    response.ok && (!payload || payload.ok !== false)
  return {
    ok,
    error: ok
      ? undefined
      : (payload?.error || payload?.message || `HTTP ${response.status}`),
  }
}

async function main() {
  let opts
  try {
    opts = parseArgs(argv.slice(2))
  } catch (err) {
    fail(err.message, 2)
    return
  }

  if (opts.showHelp) {
    stdout.write(USAGE)
    exit(0)
    return
  }

  if (!opts.baseUrl) {
    fail('--base-url is required', 2)
    return
  }

  let catalog
  try {
    catalog = await fetchCatalog(opts.baseUrl, opts.authHeader)
  } catch (err) {
    fail(err.message, 3)
    return
  }

  stdout.write(`CKS catalog: ${catalog.length} jobs\n`)
  for (const job of catalog) {
    const tag = `[${job.category ?? 'unknown'}]`
    stdout.write(
      `  · ${job.cksId.padEnd(28)} ${tag.padEnd(18)} ${job.upsertPayload.schedule}\n`,
    )
  }

  if (opts.dryRun) {
    stdout.write('\nDry-run mode — no POST requests issued.\n')
    exit(0)
    return
  }

  let created = 0
  const errors = []
  for (const job of catalog) {
    if (opts.forceEnabled) {
      job.upsertPayload.enabled = true
    }
    const result = await postOne(job, opts.baseUrl, opts.authHeader)
    if (result.ok) {
      created += 1
      stdout.write(`  ok   ${job.cksId}\n`)
    } else {
      errors.push(`${job.cksId}: ${result.error}`)
      stdout.write(`  fail ${job.cksId} — ${result.error}\n`)
    }
  }

  stdout.write(
    `\nDone: ${created}/${catalog.length} created. ${errors.length} failed.\n`,
  )
  if (errors.length > 0) {
    exit(1)
    return
  }
  exit(0)
}

main().catch(function onError(err) {
  fail(err instanceof Error ? err.message : String(err), 4)
})
