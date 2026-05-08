/**
 * Catálogo de crons CKS pre-poblados para el Cron Manager de ClawSuite.
 *
 * ─── INVESTIGACIÓN: server-side script vs agent turn ────────────────────────
 *
 * El sistema cron de ClawSuite NO ejecuta shell scripts server-side.
 * Cada cron job dispara un `agentTurn` (mensaje al gateway OpenClaw que crea
 * un turn del agente con el `message` como prompt) o un `systemEvent`
 * (notificación pasiva). Verificado en:
 *   - src/components/cron-manager/CronJobForm.tsx:462-481 (buildFriendlyPayload)
 *   - src/routes/api/cron/upsert.ts:42-49 (cron.add format con sessionTarget: 'main')
 *   - src/server/cron.ts (gatewayCronRpc → WebSocket al gateway)
 *
 * ─── IMPLICACIÓN PARA CKS ───────────────────────────────────────────────────
 *
 * Los crons CKS reales viven en el VPS (`/etc/cron.d/cks-openclaw` y
 * `/etc/cron.d/hermes-skills`) ejecutados por cron Linux con scripts bash
 * deterministas (ADR-005). Esos NO se reemplazan desde la UI ClawSuite.
 *
 * Las entries de este catálogo son **proyecciones UI complementarias** que
 * disparan agent turns al maestro pidiéndole que reporte/audite el resultado
 * del cron VPS equivalente. Útil para:
 *   1. Inventario visual del catálogo cron en la UI.
 *   2. Lanzar runs manuales de "report sobre estado X" via "Run Now".
 *   3. Auditar la frecuencia/cobertura del cron VPS desde el navegador.
 *
 * Por defecto vienen **disabled** (`enabled: false`) — el operador decide
 * cuáles activar en la UI tras importarlos. Activarlos crea coste LLM real.
 *
 * ─── ARQUITECTURA OPENCLAW ──────────────────────────────────────────────────
 *
 * `sessionTarget` está hardcoded a `'main'` en cron.add (upsert.ts:48). Todos
 * los agentTurns entran por el maestro, que delega al leaf correcto vía
 * routing semántico definido en `agents.list[main].systemPromptOverride`:
 *   - GitHub / repos / PRs / Vercel → cks-dev
 *   - Supabase / SQL / tech_procedures → cks-lab
 *   - Sergio API / cks-master-api / bridge → cks-bridge
 *   - Research / OSINT / docs externos → cks-scout
 *   - Estrategia / planning → cks-architect
 *
 * Por eso los `message` empiezan con un prefijo "[delega → cks-X]" explícito,
 * para que el maestro enrute correctamente sin ambigüedad.
 */

import type { CronJobUpsertInput } from '@/components/cron-manager/cron-types'

export type CksDefaultJob = CronJobUpsertInput & {
  /** Identificador estable del cron CKS (usado en logs). */
  cksId: string
  /** Equivalente bash en el VPS, si existe. */
  vpsScript?: string
  /** Categoría operativa para agrupación visual. */
  category:
    | 'briefing'
    | 'salud-infra'
    | 'salud-llm'
    | 'salud-deploy'
    | 'salud-bridge'
    | 'gestion'
    | 'reporte'
    | 'ecosistema'
}

/**
 * Catálogo canónico de 12 crons CKS proyectados a ClawSuite.
 *
 * Schedule expressions verbatim del VPS (ver CLAUDE.md §"Crons cks-*
 * activos"). Si cambia el cron VPS, actualizar aquí también.
 */
export const CKS_DEFAULT_JOBS: ReadonlyArray<CksDefaultJob> = [
  // ── 1. Briefing diario (mencionado por David) ──────────────────────────
  {
    cksId: 'cks-daily-brief',
    name: 'CKS · Daily Brief (Lun–Vie 09:00)',
    schedule: '0 9 * * 1-5',
    enabled: false,
    description:
      'Brief diario del estado del proyecto. El maestro compone resumen leyendo state files (sprint, deploys, gaps, OAuth, costes). Cron VPS equivalente: /usr/local/bin/run-skill.sh /data/.openclaw/workspace/scripts/cks-daily-brief.sh',
    vpsScript: '/data/.openclaw/workspace/scripts/cks-daily-brief.sh',
    category: 'briefing',
    payload: {
      kind: 'agentTurn',
      message:
        'Genera el daily brief CKS de hoy: estado del proyecto, sprint actual, últimos deploys Vercel, salud del bridge api.carkeysystem.com, costes OpenRouter, gaps abiertos. Formato compacto (~10 líneas) en español. Si detectas algo crítico, márcalo con 🔴.',
      timeoutSeconds: 180,
    },
  },

  // ── 2. Bridge health (mencionado por David) ───────────────────────────
  {
    cksId: 'cks-bridge-health',
    name: 'CKS · Bridge Health (cada 30min)',
    schedule: '*/30 * * * *',
    enabled: false,
    description:
      'Healthcheck del Cloudflare Tunnel api.carkeysystem.com → Ubuntu Sergio (Track 1 API v3). Cron VPS equivalente determinístico bash + curl. Esta entry pide al cks-bridge un report manual.',
    vpsScript: '/data/.openclaw/workspace/scripts/cks-bridge-health.sh',
    category: 'salud-bridge',
    payload: {
      kind: 'agentTurn',
      message:
        '[delega → cks-bridge] Verifica el estado del Cloudflare Tunnel api.carkeysystem.com. Hace ping a /bridge/v1/search?q=test (rate limit-friendly) y reporta: HTTP code, latencia, si la API key está vigente, y errores si los hay. Output 1-2 líneas máximo.',
      timeoutSeconds: 60,
    },
  },

  // ── 3. Deploy check (mencionado por David) ────────────────────────────
  {
    cksId: 'cks-deploy-check',
    name: 'CKS · Deploy Check Vercel (cada 15min)',
    schedule: '*/15 * * * *',
    enabled: false,
    description:
      'Monitor de deploys Vercel del proyecto cks-system. Detecta ERROR / cuelgue / recovery. Cron VPS equivalente bash + cks-vercel.sh.',
    vpsScript: '/data/.openclaw/workspace/scripts/cks-deploy-check.sh',
    category: 'salud-deploy',
    payload: {
      kind: 'agentTurn',
      message:
        '[delega → cks-dev] Reporta el estado del último deploy de cks-system en Vercel: status (READY/ERROR/BUILDING), branch, commit hash, autor, build duration. Si está ERROR o BUILDING > 10min, márcalo crítico.',
      timeoutSeconds: 90,
    },
  },

  // ── 4. Sprint status (mencionado por David) ───────────────────────────
  {
    cksId: 'cks-sprint-status',
    name: 'CKS · Sprint Status (Lun–Vie 07:50)',
    schedule: '50 7 * * 1-5',
    enabled: false,
    description:
      'Snapshot Sprint MVP: estado repo cks-system + deploys Vercel + Cloudflare Tunnel + tabla supabase tech_procedures. Alimenta el daily-brief.',
    vpsScript: '/data/.openclaw/workspace/scripts/cks-sprint-status.sh',
    category: 'gestion',
    payload: {
      kind: 'agentTurn',
      message:
        '[delega → cks-dev] Genera snapshot del Sprint MVP CKS System: PRs abiertos, último commit en main, build status Vercel, conteo procedures supabase. Output JSON compacto + resumen 3-4 líneas.',
      timeoutSeconds: 120,
    },
  },

  // ── 5. Cost monitor (mencionado por David) ────────────────────────────
  {
    cksId: 'cks-cost-monitor',
    name: 'CKS · Cost Monitor OpenRouter (08:20)',
    schedule: '20 8 * * *',
    enabled: false,
    description:
      'Saldo OpenRouter + alertas en picos (3× sobre media 7d). Cron VPS bash llama OpenRouter API key con privilegios mínimos.',
    vpsScript: '/data/.openclaw/workspace/scripts/cks-cost-monitor.sh',
    category: 'salud-llm',
    payload: {
      kind: 'agentTurn',
      message:
        'Reporta el saldo OpenRouter actual (https://openrouter.ai/api/v1/credits) y el gasto últimas 24h. Si gasto 24h supera 3× la media de 7d, alerta crítico. Output: saldo restante en USD + spike flag.',
      timeoutSeconds: 60,
    },
  },

  // ── 6. LLM health ─────────────────────────────────────────────────────
  {
    cksId: 'cks-llm-health',
    name: 'CKS · LLM Health (cada hora :17)',
    schedule: '17 * * * *',
    enabled: false,
    description:
      'Healthcheck del primary (Nemotron 3 Super 120B) + fallback-1 (Minimax M2.7) + fallback-2 (OAuth Codex). Detecta 4xx que OpenClaw no retry-ea por diseño.',
    vpsScript: '/data/.openclaw/workspace/scripts/cks-llm-health.sh',
    category: 'salud-llm',
    payload: {
      kind: 'agentTurn',
      message:
        'Lanza un completion mínimo (1 token) contra Nemotron 3 Super 120B y reporta: status (HTTP code), latencia, modelo respondiendo. Si 4xx, sugiere swap a minimax-m2.7. Output 1 línea.',
      timeoutSeconds: 45,
    },
  },

  // ── 7. Disk monitor ───────────────────────────────────────────────────
  {
    cksId: 'cks-disk-monitor',
    name: 'CKS · Disk Monitor VPS (08:45)',
    schedule: '45 8 * * *',
    enabled: false,
    description:
      'Uso de disco VPS. Warning ≥80%, critical ≥90%. Cron VPS HOST-only (df + threshold).',
    vpsScript: '/usr/local/bin/cks-disk-monitor.sh (HOST-only)',
    category: 'salud-infra',
    payload: {
      kind: 'systemEvent',
      message: 'cks-disk-monitor reminder',
      text:
        'Recordatorio: revisar uso de disco VPS Hostinger. La entry agentTurn equivalente puede pedir al maestro que ejecute `ssh root@72.62.190.131 df -h` (requiere skill SSH activa).',
    },
  },

  // ── 8. Snapshot reminder ──────────────────────────────────────────────
  {
    cksId: 'cks-snapshot-reminder',
    name: 'CKS · Snapshot Reminder Hostinger (08:30)',
    schedule: '30 8 * * *',
    enabled: false,
    description:
      'Alerta 4 días antes del vencimiento del snapshot manual Hostinger (ADR-006: no pagamos plan 11.99€/mes). Próximo vencimiento: 9-may-2026.',
    vpsScript: '/usr/local/bin/cks-snapshot-reminder.sh (HOST-only)',
    category: 'salud-infra',
    payload: {
      kind: 'systemEvent',
      message: 'cks-snapshot-reminder',
      text:
        'Recordatorio diario: validar fecha vencimiento snapshot Hostinger (ADR-006). Si quedan ≤4 días, alertar a David para crear snapshot manual nuevo desde el panel.',
    },
  },

  // ── 9. Update check ───────────────────────────────────────────────────
  {
    cksId: 'cks-update-check',
    name: 'CKS · Update Check OpenClaw (08:40)',
    schedule: '40 8 * * *',
    enabled: false,
    description:
      'Diff digest ghcr.io/openclaw/openclaw vs versión local. Aplica política de soak time 7d (ADR-024) + Hostinger lag (ADR-028). Solo alerta cuando elegible.',
    vpsScript: '/usr/local/bin/cks-update-check.sh (HOST-only)',
    category: 'gestion',
    payload: {
      kind: 'agentTurn',
      message:
        'Compara versión OpenClaw local con ghcr.io/openclaw/openclaw:latest. Reporta versión actual, versión última disponible, días de soak en upstream, y verdict: ELIGIBLE / WAITING_SOAK / SECURITY_FORCE. Si elegible, sugiere comando `bash scripts/openclaw-update.sh`.',
      timeoutSeconds: 120,
    },
  },

  // ── 10. Ordenes sync ──────────────────────────────────────────────────
  {
    cksId: 'cks-ordenes-sync',
    name: 'CKS · Ordenes Sync (cada 30min)',
    schedule: '*/30 * * * *',
    enabled: false,
    description:
      'Parsea docs/ORDENES.md del repo OpenClaw → state/ordenes-sync.json. Habilita el dispatch protocol (Claude Code AFK).',
    vpsScript: '/data/.openclaw/workspace/scripts/cks-ordenes-sync.sh',
    category: 'gestion',
    payload: {
      kind: 'agentTurn',
      message:
        '[delega → cks-dev] Lee docs/ORDENES.md del repo David-CKS/cks-system y devuelve resumen: tareas con tag [dispatch-ok], [dispatch-prep], [dispatch-no]. Output tabla compacta.',
      timeoutSeconds: 90,
    },
  },

  // ── 11. Weekly report (Lunes 08:00) ──────────────────────────────────
  {
    cksId: 'cks-weekly-report',
    name: 'CKS · Weekly Report (Lunes 08:00)',
    schedule: '0 8 * * 1',
    enabled: false,
    description:
      'Reporte semanal agregado del JSONL openclaw-events: skills ejecutados, errores, latencias, ADRs nuevos, gaps cerrados/abiertos.',
    vpsScript: '/usr/local/bin/cks-weekly-report.sh (HOST-only)',
    category: 'reporte',
    payload: {
      kind: 'agentTurn',
      message:
        'Genera reporte semanal CKS (lunes a domingo): (1) total runs cron + skills + agent turns, (2) errores agrupados por skill, (3) latencias p50/p95, (4) ADRs nuevos esta semana, (5) gaps cerrados/abiertos. Formato markdown 1 página.',
      timeoutSeconds: 300,
    },
  },

  // ── 12. Ecosystem watcher (releases Claude Code / MCPs) ──────────────
  {
    cksId: 'cks-ecosystem-signal',
    name: 'CKS · Ecosystem Watcher (09:00)',
    schedule: '0 9 * * *',
    enabled: false,
    description:
      'Marker diario release watch: GitHub releases anthropic/claude-code, modelcontextprotocol/*, openclaw/openclaw. Alimenta el skill openclaw-ecosystem-watcher.',
    vpsScript: '/usr/local/bin/cks-ecosystem-signal.sh',
    category: 'ecosistema',
    payload: {
      kind: 'agentTurn',
      message:
        '[delega → cks-scout] Vigilancia ecosistema 24h: nuevas releases en anthropic/claude-code, modelcontextprotocol/servers, openclaw/openclaw. Para cada release reporta: tag, fecha, tipo (major/minor/patch/security), 1-línea de impacto en CKS. Si security → 🔴.',
      timeoutSeconds: 240,
    },
  },
] as const

/**
 * Helper: obtiene los crons del catálogo por categoría.
 */
export function getCksJobsByCategory(
  category: CksDefaultJob['category'],
): ReadonlyArray<CksDefaultJob> {
  return CKS_DEFAULT_JOBS.filter(function matchCategory(job) {
    return job.category === category
  })
}

/**
 * Helper: traduce un CksDefaultJob al payload exacto que espera
 * `/api/cron/upsert` (sin el cksId/vpsScript/category, solo CronJobUpsertInput).
 */
export function toCronUpsertInput(
  job: CksDefaultJob,
): CronJobUpsertInput {
  return {
    name: job.name,
    schedule: job.schedule,
    enabled: job.enabled,
    description: job.description,
    payload: job.payload,
    deliveryConfig: job.deliveryConfig,
  }
}
