/**
 * Multi-source gateway connection model.
 *
 * The primary OpenClaw gateway lives in `useSettingsStore.gatewayUrl/Token`
 * (legacy single-source flow). Additional sources — MCP servers, external
 * dashboards, secondary gateways for multi-tenant — are persisted here and
 * routed through the helpers in `src/server/multi-source-router.ts`.
 */

export type SourceType = 'gateway' | 'mcp' | 'dashboard'

export type SourceStatus =
  | 'unknown'
  | 'probing'
  | 'online'
  | 'offline'
  | 'error'

export type AdditionalSource = {
  id: string
  name: string
  type: SourceType
  url: string
  token?: string
  enabled: boolean
  metadata?: Record<string, string>
  createdAt: number
  updatedAt: number
}

export type MCPPreset = {
  id: string
  name: string
  description: string
  defaultUrl?: string
  envHints?: Array<string>
}

export type DashboardPreset = {
  id: string
  name: string
  description: string
  defaultUrl: string
}

/**
 * Hardcoded MCP server suggestions surfaced in the "Add source" modal.
 * Mirror of the MCP servers that the operator has already configured on
 * their Mac local — selecting one prefills name + URL.
 */
export const MCP_SERVER_PRESETS: ReadonlyArray<MCPPreset> = [
  {
    id: 'github',
    name: 'GitHub MCP',
    description: 'Repos, PRs, issues, code search',
    defaultUrl: 'https://api.githubcopilot.com/mcp/',
    envHints: ['GITHUB_PAT', 'GITHUB_TOKEN'],
  },
  {
    id: 'supabase',
    name: 'Supabase MCP',
    description: 'Postgres, edge functions, branches',
    defaultUrl: 'https://mcp.supabase.com/mcp',
    envHints: ['SUPABASE_SERVICE_ROLE'],
  },
  {
    id: 'vercel',
    name: 'Vercel MCP',
    description: 'Deploys, projects, env vars',
    defaultUrl: 'https://mcp.vercel.com',
    envHints: ['VERCEL_TOKEN'],
  },
  {
    id: 'notion',
    name: 'Notion MCP',
    description: 'Pages, databases, blocks',
    defaultUrl: 'https://mcp.notion.com',
    envHints: ['NOTION_TOKEN'],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare MCP',
    description: 'Workers, KV, D1, R2, Hyperdrive',
    defaultUrl: 'https://mcp.cloudflare.com',
    envHints: ['CF_API_TOKEN'],
  },
  {
    id: 'sentry',
    name: 'Sentry MCP',
    description: 'Errors, releases, performance',
    defaultUrl: 'https://mcp.sentry.dev/mcp',
    envHints: ['SENTRY_AUTH_TOKEN'],
  },
  {
    id: 'context7',
    name: 'Context7 MCP',
    description: 'Library docs lookup',
    defaultUrl: 'https://mcp.context7.com/mcp',
    envHints: [],
  },
  {
    id: 'fetch',
    name: 'Fetch MCP',
    description: 'Generic HTTP fetch tool',
    defaultUrl: '',
    envHints: [],
  },
  {
    id: 'filesystem',
    name: 'Filesystem MCP',
    description: 'Local file operations',
    defaultUrl: '',
    envHints: [],
  },
  {
    id: 'playwright',
    name: 'Playwright MCP',
    description: 'Browser automation',
    defaultUrl: '',
    envHints: [],
  },
  {
    id: 'figma',
    name: 'Figma MCP',
    description: 'Design files, components',
    defaultUrl: 'https://mcp.figma.com',
    envHints: ['FIGMA_TOKEN'],
  },
  {
    id: 'linear',
    name: 'Linear MCP',
    description: 'Issues, projects, cycles',
    defaultUrl: 'https://mcp.linear.app/mcp',
    envHints: ['LINEAR_API_KEY'],
  },
] as const

/**
 * Common dashboards consumed by the OpenClaw operator stack.
 */
export const DASHBOARD_PRESETS: ReadonlyArray<DashboardPreset> = [
  {
    id: 'hermes',
    name: 'Hermes Dashboard',
    description: 'Meta-orchestrator sidecar (port 9119)',
    defaultUrl: 'https://hermes.carkeysystem.com',
  },
  {
    id: 'cks-hub',
    name: 'CKS Hub',
    description: 'Central control panel for all CKS systems',
    defaultUrl: 'https://cks.carkeysystem.com',
  },
  {
    id: 'phoenix',
    name: 'Arize Phoenix',
    description: 'OTLP traces and LLM observability',
    defaultUrl: 'https://phoenix.carkeysystem.com',
  },
  {
    id: 'mando',
    name: 'War Room (Mando)',
    description: 'Executive panel with 8 tabs',
    defaultUrl: 'https://mando.carkeysystem.com',
  },
] as const

export type UrlValidationResult =
  | { ok: true }
  | { ok: false; reason: string }

export function isValidSourceUrl(
  type: SourceType,
  url: string,
): UrlValidationResult {
  if (!url || !url.trim()) return { ok: false, reason: 'URL requerida' }
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return { ok: false, reason: 'URL no válida' }
  }
  if (type === 'gateway') {
    const allowed = ['ws:', 'wss:', 'http:', 'https:']
    if (!allowed.includes(parsed.protocol)) {
      return {
        ok: false,
        reason: 'Gateway acepta ws://, wss://, http:// o https://',
      }
    }
  } else if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Requiere http:// o https://' }
  }
  return { ok: true }
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  gateway: 'Gateway',
  mcp: 'MCP',
  dashboard: 'Dashboard',
}
