'use client'

import { useEffect, useState } from 'react'
import type * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSourcesStore } from '@/stores/sources-store'
import type { AdditionalSource, SourceType } from '@/types/sources'
import {
  DASHBOARD_PRESETS,
  MCP_SERVER_PRESETS,
  isValidSourceUrl,
} from '@/types/sources'

type Props = {
  open: boolean
  source?: AdditionalSource
  onClose: () => void
}

const TYPE_DESCRIPTIONS: Record<SourceType, string> = {
  gateway: 'OpenClaw gateway adicional (multi-tenant)',
  mcp: 'MCP server externo (GitHub, Supabase, Vercel, …)',
  dashboard: 'Dashboard externo accesible vía HTTP',
}

export function SourceAddModal({ open, source, onClose }: Props) {
  const isEdit = !!source
  const addSource = useSourcesStore(function selectAdd(state) {
    return state.addSource
  })
  const updateSource = useSourcesStore(function selectUpdate(state) {
    return state.updateSource
  })

  const [type, setType] = useState<SourceType>(source?.type ?? 'mcp')
  const [name, setName] = useState(source?.name ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const [token, setToken] = useState(source?.token ?? '')
  const [enabled, setEnabled] = useState(source?.enabled ?? true)
  const [error, setError] = useState<string | null>(null)
  const [presetId, setPresetId] = useState<string>('')

  useEffect(
    function syncFromSource() {
      if (!source) return
      setType(source.type)
      setName(source.name)
      setUrl(source.url)
      setToken(source.token ?? '')
      setEnabled(source.enabled)
      setError(null)
      setPresetId('')
    },
    [source],
  )

  function applyPreset(nextPresetId: string) {
    setPresetId(nextPresetId)
    if (!nextPresetId) return
    if (type === 'mcp') {
      const preset = MCP_SERVER_PRESETS.find(function matchId(p) {
        return p.id === nextPresetId
      })
      if (!preset) return
      if (!name) setName(preset.name)
      if (preset.defaultUrl) setUrl(preset.defaultUrl)
    } else if (type === 'dashboard') {
      const preset = DASHBOARD_PRESETS.find(function matchId(p) {
        return p.id === nextPresetId
      })
      if (!preset) return
      if (!name) setName(preset.name)
      setUrl(preset.defaultUrl)
    }
  }

  function handleTypeChange(nextType: SourceType) {
    setType(nextType)
    setPresetId('')
    setError(null)
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Nombre requerido')
      return
    }
    const validation = isValidSourceUrl(type, url)
    if (!validation.ok) {
      setError(validation.reason)
      return
    }
    setError(null)
    const payload = {
      type,
      name: name.trim(),
      url: url.trim(),
      token: token.trim() ? token.trim() : undefined,
      enabled,
    }
    if (isEdit && source) {
      updateSource(source.id, payload)
    } else {
      addSource(payload)
    }
    onClose()
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="w-[min(480px,92vw)] p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <DialogTitle>
              {isEdit ? 'Editar source' : 'Añadir source'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs">
              MCP server, dashboard externo o gateway adicional.
            </DialogDescription>
          </div>
          <DialogClose
            render={
              <Button
                variant="outline"
                className="h-7 w-7 rounded-lg p-0"
                aria-label="Cerrar"
              >
                <HugeiconsIcon
                  icon={Cancel01Icon}
                  size={14}
                  strokeWidth={1.5}
                />
              </Button>
            }
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-primary-700 dark:text-neutral-300">
              Tipo
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['gateway', 'mcp', 'dashboard'] as Array<SourceType>).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                      type === t
                        ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-300'
                        : 'border-primary-200 text-primary-700 hover:bg-primary-100 dark:text-neutral-300',
                    )}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
            <p className="mt-1 text-[11px] text-primary-500 dark:text-neutral-400">
              {TYPE_DESCRIPTIONS[type]}
            </p>
          </div>

          {(type === 'mcp' || type === 'dashboard') && (
            <div>
              <label className="mb-1 block text-xs font-medium text-primary-700 dark:text-neutral-300">
                Preset (opcional)
              </label>
              <select
                value={presetId}
                onChange={(e) => applyPreset(e.target.value)}
                className="h-8 w-full rounded-lg border border-primary-200 bg-white px-2 text-sm text-primary-900 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="">— Selecciona un preset —</option>
                {(type === 'mcp' ? MCP_SERVER_PRESETS : DASHBOARD_PRESETS).map(
                  (p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.description}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-primary-700 dark:text-neutral-300">
              Nombre
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GitHub MCP"
              className="h-8"
              maxLength={80}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-primary-700 dark:text-neutral-300">
              URL
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === 'gateway' ? 'ws://127.0.0.1:18789' : 'https://…'
              }
              className="h-8 font-mono text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-primary-700 dark:text-neutral-300">
              Token / API key (opcional)
            </label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token o API key"
              type="password"
              className="h-8 font-mono text-xs"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] text-primary-500 dark:text-neutral-400">
              Se envía como{' '}
              <code className="rounded bg-primary-100 px-1 text-[10px] dark:bg-neutral-800">
                Authorization: Bearer …
              </code>{' '}
              al probar y al rutar peticiones.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-primary-700 dark:text-neutral-300">
                Activado
              </p>
              <p className="text-[11px] text-primary-500 dark:text-neutral-400">
                Si lo desactivas, el routing lo ignora sin borrarlo.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 rounded-lg"
            >
              Cancelar
            </Button>
            <Button type="submit" size="sm" className="h-8 rounded-lg">
              {isEdit ? 'Guardar' : 'Añadir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  )
}
