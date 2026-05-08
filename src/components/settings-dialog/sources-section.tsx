'use client'

import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  CloudIcon,
  Delete01Icon,
  Edit01Icon,
  Globe02Icon,
  RefreshIcon,
  ServerStack01Icon,
} from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useSourcesStore } from '@/stores/sources-store'
import type { AdditionalSource, SourceType } from '@/types/sources'
import { SourceAddModal } from './source-add-modal'

const TYPE_META: Record<
  SourceType,
  { label: string; icon: any; badgeClass: string }
> = {
  gateway: {
    label: 'Gateway',
    icon: ServerStack01Icon,
    badgeClass:
      'border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  },
  mcp: {
    label: 'MCP',
    icon: CloudIcon,
    badgeClass:
      'border-purple-500/35 bg-purple-500/10 text-purple-700 dark:text-purple-300',
  },
  dashboard: {
    label: 'Dashboard',
    icon: Globe02Icon,
    badgeClass:
      'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
}

const STATUS_LABELS: Record<string, string> = {
  unknown: 'Sin probar',
  probing: 'Probando…',
  online: 'Online',
  offline: 'Offline',
  error: 'Error',
}

export function SourcesSection() {
  const sources = useSourcesStore(function selectSources(state) {
    return state.sources
  })
  const removeSource = useSourcesStore(function selectRemove(state) {
    return state.removeSource
  })
  const toggleSource = useSourcesStore(function selectToggle(state) {
    return state.toggleSource
  })
  const setStatus = useSourcesStore(function selectSetStatus(state) {
    return state.setStatus
  })
  const statuses = useSourcesStore(function selectStatuses(state) {
    return state.statuses
  })

  const [editing, setEditing] = useState<AdditionalSource | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  async function probe(source: AdditionalSource) {
    setStatus(source.id, 'probing')
    try {
      const response = await fetch('/api/sources/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const data = (await response.json()) as { status?: string }
      const next =
        data.status === 'online'
          ? 'online'
          : data.status === 'offline'
            ? 'offline'
            : data.status === 'error'
              ? 'error'
              : 'unknown'
      setStatus(source.id, next)
    } catch {
      setStatus(source.id, 'error')
    }
  }

  function confirmAndRemove(source: AdditionalSource) {
    const ok = window.confirm(`¿Eliminar la source "${source.name}"?`)
    if (ok) removeSource(source.id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-500">
            Sources adicionales
          </p>
          <p className="text-xs text-primary-500 dark:text-neutral-400">
            Conecta MCP servers, dashboards externos y gateways
            adicionales (multi-tenant).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(null)
            setShowAdd(true)
          }}
          className="h-8 shrink-0 rounded-lg border-primary-200 px-3"
          aria-label="Añadir source"
        >
          <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
          Añadir
        </Button>
      </div>

      <div className="space-y-2">
        {sources.length === 0 && (
          <div className="rounded-xl border border-dashed border-primary-200 bg-primary-50/40 px-4 py-6 text-center text-xs text-primary-500 dark:text-neutral-400">
            Sin sources adicionales todavía. Añade tu primer MCP server o
            dashboard.
          </div>
        )}
        {sources.map((source) => {
          const meta = TYPE_META[source.type]
          const status = statuses[source.id] ?? 'unknown'
          return (
            <div
              key={source.id}
              className="rounded-xl border border-primary-200 bg-primary-50/80 px-3 py-2 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    meta.badgeClass,
                  )}
                >
                  <HugeiconsIcon
                    icon={meta.icon}
                    size={11}
                    strokeWidth={1.5}
                  />
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-primary-900 dark:text-neutral-100">
                    {source.name}
                  </p>
                  <p className="truncate font-mono text-[11px] text-primary-500 dark:text-neutral-400">
                    {source.url}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    status === 'online' &&
                      'border-green-500/35 bg-green-500/10 text-green-600',
                    status === 'offline' &&
                      'border-orange-500/35 bg-orange-500/10 text-orange-600',
                    status === 'error' &&
                      'border-red-500/35 bg-red-500/10 text-red-600',
                    status === 'probing' &&
                      'border-accent-500/35 bg-accent-500/10 text-accent-600',
                    (status === 'unknown' || !status) &&
                      'border-primary-300 bg-primary-100 text-primary-600 dark:bg-neutral-800 dark:text-neutral-300',
                  )}
                >
                  {STATUS_LABELS[status] ?? '–'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void probe(source)}
                  className="h-7 w-7 rounded-lg p-0"
                  aria-label="Probar conexión"
                  disabled={status === 'probing'}
                >
                  <HugeiconsIcon
                    icon={RefreshIcon}
                    size={14}
                    strokeWidth={1.5}
                  />
                </Button>
                <Switch
                  checked={source.enabled}
                  onCheckedChange={() => toggleSource(source.id)}
                  aria-label={`${source.enabled ? 'Desactivar' : 'Activar'} ${source.name}`}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAdd(false)
                    setEditing(source)
                  }}
                  className="h-7 w-7 rounded-lg p-0"
                  aria-label="Editar"
                >
                  <HugeiconsIcon
                    icon={Edit01Icon}
                    size={14}
                    strokeWidth={1.5}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => confirmAndRemove(source)}
                  className="h-7 w-7 rounded-lg p-0 text-red-600 hover:text-red-700"
                  aria-label="Eliminar"
                >
                  <HugeiconsIcon
                    icon={Delete01Icon}
                    size={14}
                    strokeWidth={1.5}
                  />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {(showAdd || editing) && (
        <SourceAddModal
          open
          source={editing ?? undefined}
          onClose={() => {
            setShowAdd(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
