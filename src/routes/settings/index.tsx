import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckmarkCircle02Icon,
  CloudIcon,
  ComputerIcon,
  MessageMultiple01Icon,
  Moon01Icon,
  Notification03Icon,
  PaintBoardIcon,
  Settings02Icon,
  SourceCodeSquareIcon,
  Sun01Icon,
  UserIcon,
} from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import type * as React from 'react'
import type { AccentColor, SettingsThemeMode } from '@/hooks/use-settings'
import { usePageTitle } from '@/hooks/use-page-title'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { applyTheme, useSettings } from '@/hooks/use-settings'
import type { ThemeId } from '@/lib/theme'
import { cn } from '@/lib/utils'
import {
  getChatProfileDisplayName,
  useChatSettingsStore,
} from '@/hooks/use-chat-settings'
import { useGatewaySetupStore } from '@/hooks/use-gateway-setup'
import type { LoaderStyle } from '@/hooks/use-chat-settings'
import { UserAvatar } from '@/components/avatars'
import { Input } from '@/components/ui/input'
import { LogoLoader } from '@/components/logo-loader'
import { BrailleSpinner } from '@/components/ui/braille-spinner'
import type { BrailleSpinnerPreset } from '@/components/ui/braille-spinner'
import { ThreeDotsSpinner } from '@/components/ui/three-dots-spinner'
// useWorkspaceStore removed — hamburger eliminated on mobile

export const Route = createFileRoute('/settings/')({
  component: SettingsRoute,
})

// ── Enterprise Theme Picker (P1-2) ─────────────────────────────────────

const ENTERPRISE_THEMES_PAGE = [
  {
    id: 'paper-light' as ThemeId,
    label: 'Clean',
    icon: '☀️',
    desc: 'Warm gray canvas with white cards',
    preview: { bg: '#f5f5f5', panel: '#ffffff', border: '#e5e5e5', accent: '#f97316', text: '#1a1a1a' },
  },
  {
    id: 'ops-dark' as ThemeId,
    label: 'Slate',
    icon: '🖥️',
    desc: 'Deep slate with teal secondary glow',
    preview: { bg: '#1e1e2e', panel: '#2a2a3e', border: '#3a3a4e', accent: '#14b8a6', text: '#e5e5e5' },
  },
  {
    id: 'premium-dark' as ThemeId,
    label: 'Midnight',
    icon: '✨',
    desc: 'OLED true black with high contrast',
    preview: { bg: '#000000', panel: '#0a0a0a', border: '#1a1a1a', accent: '#f97316', text: '#f5f5f5' },
  },
  {
    id: 'sunset-brand' as ThemeId,
    label: 'Sunset',
    icon: '🌇',
    desc: 'Warm brown brand immersion',
    preview: { bg: '#1a0e05', panel: '#2a1a0e', border: '#6b3c1b', accent: '#f59e0b', text: '#ffe7d1' },
  },
] as const

const DARK_ENTERPRISE_SET = new Set<ThemeId>(['ops-dark', 'premium-dark', 'sunset-brand'])

function PageThemeSwatch({
  colors,
}: {
  colors: (typeof ENTERPRISE_THEMES_PAGE)[number]['preview']
}) {
  return (
    <div
      className="flex h-10 w-full overflow-hidden rounded-md border"
      style={{ borderColor: colors.border, backgroundColor: colors.bg }}
    >
      <div
        className="flex h-full w-4 flex-col gap-0.5 p-0.5"
        style={{ backgroundColor: colors.panel }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1.5 w-full rounded-sm"
            style={{ backgroundColor: colors.border }}
          />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-1">
        <div
          className="h-1.5 w-3/4 rounded"
          style={{ backgroundColor: colors.text, opacity: 0.8 }}
        />
        <div
          className="h-1 w-1/2 rounded"
          style={{ backgroundColor: colors.text, opacity: 0.3 }}
        />
        <div
          className="mt-0.5 h-1.5 w-6 rounded-full"
          style={{ backgroundColor: colors.accent }}
        />
      </div>
    </div>
  )
}

function EnterpriseThemePickerPage() {
  const { updateSettings } = useSettings()
  const [current, setCurrent] = useState<string>(() => {
    if (typeof window === 'undefined') return 'paper-light'
    const stored = localStorage.getItem('clawsuite-theme')
    return ENTERPRISE_THEMES_PAGE.some((t) => t.id === stored) ? (stored as string) : 'paper-light'
  })

  function applyEnterpriseTheme(id: ThemeId) {
    const html = document.documentElement
    html.setAttribute('data-theme', id)
    if (DARK_ENTERPRISE_SET.has(id)) {
      html.classList.add('dark')
      html.classList.remove('light')
      updateSettings({ theme: 'dark' })
    } else {
      html.classList.add('light')
      html.classList.remove('dark')
      updateSettings({ theme: 'light' })
    }
    localStorage.setItem('clawsuite-theme', id)
    setCurrent(id)
  }

  return (
    <div className="grid w-full grid-cols-2 gap-2">
      {ENTERPRISE_THEMES_PAGE.map((t) => {
        const isActive = current === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => applyEnterpriseTheme(t.id)}
            className={cn(
              'flex flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors',
              isActive
                ? 'border-accent-500 bg-accent-50 text-accent-700'
                : 'border-primary-200 bg-primary-50/80 hover:bg-primary-100',
            )}
          >
            <PageThemeSwatch colors={t.preview} />
            <div className="flex items-center gap-1">
              <span className="text-xs">{t.icon}</span>
              <span className="text-xs font-semibold text-primary-900 dark:text-neutral-100">
                {t.label}
              </span>
              {isActive && (
                <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-accent-600">
                  Activo
                </span>
              )}
            </div>
            <p className="text-[10px] leading-tight text-primary-500 dark:text-neutral-400">
              {t.desc}
            </p>
          </button>
        )
      })}
    </div>
  )
}

type SectionProps = {
  title: string
  description: string
  icon: React.ComponentProps<typeof HugeiconsIcon>['icon']
  children: React.ReactNode
}

function SettingsSection({ title, description, icon, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-primary-200 bg-primary-50/80 p-4 shadow-sm backdrop-blur-xl md:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-xl border border-primary-200 bg-primary-100/70">
          <HugeiconsIcon icon={icon} size={20} strokeWidth={1.5} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-medium text-primary-900 text-balance">
            {title}
          </h2>
          <p className="text-sm text-primary-600 text-pretty">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

type RowProps = {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsRow({ label, description, children }: RowProps) {
  return (
    <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-primary-900 text-balance">
          {label}
        </p>
        {description ? (
          <p className="text-xs text-primary-600 text-pretty">{description}</p>
        ) : null}
      </div>
      <div className="flex w-full items-center gap-2 md:w-auto md:justify-end">
        {children}
      </div>
    </div>
  )
}

type SettingsSectionId =
  | 'profile'
  | 'appearance'
  | 'chat'
  | 'editor'
  | 'notifications'
  | 'advanced'

type SettingsNavItem = {
  id: SettingsSectionId
  label: string
}

const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  { id: 'profile', label: 'Perfil' },
  { id: 'appearance', label: 'Apariencia' },
  { id: 'chat', label: 'Chat' },
  { id: 'editor', label: 'Editor' },
  { id: 'notifications', label: 'Notificaciones' },
  { id: 'advanced', label: 'Avanzado' },
]

function SettingsRoute() {
  usePageTitle('Ajustes')
  const { settings, updateSettings } = useSettings()
  const gatewaySetup = useGatewaySetupStore()
  const [gatewayUrlInput, setGatewayUrlInput] = useState(settings.gatewayUrl)
  const [connectionStatus, setConnectionStatus] = useState<
    'idle' | 'testing' | 'connected' | 'failed'
  >('idle')

  // Phase 4.2: Fetch models for preferred model dropdowns
  const [availableModels, setAvailableModels] = useState<
    Array<{ id: string; label: string }>
  >([])
  const [modelsError, setModelsError] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchModels() {
      setModelsError(false)
      try {
        const res = await fetch('/api/models')
        if (!res.ok) {
          setModelsError(true)
          return
        }
        const data = await res.json()
        const models = Array.isArray(data.models) ? data.models : []
        setAvailableModels(
          models.map((m: any) => ({
            id: m.id || '',
            label: m.id?.split('/').pop() || m.id || '',
          })),
        )
      } catch {
        setModelsError(true)
      }
    }
    void fetchModels()
  }, [])

  useEffect(() => {
    setGatewayUrlInput(settings.gatewayUrl)
  }, [settings.gatewayUrl])

  async function handleTestConnection() {
    setConnectionStatus('testing')

    try {
      // Test via ClawSuite's server-side /api/ping which does the real
      // WebSocket handshake to the gateway. Can't hit gateway directly
      // from browser — it's a WS server, not HTTP.
      const response = await fetch('/api/ping', {
        signal: AbortSignal.timeout(8000),
      })
      const data = (await response.json()) as { ok?: boolean }
      setConnectionStatus(data.ok ? 'connected' : 'failed')
    } catch {
      setConnectionStatus('failed')
    }
  }

  function validateGatewayUrl(value: string): string | null {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      new URL(trimmed)
      return null
    } catch {
      return 'Formato de URL no válido'
    }
  }

  function persistGatewayUrl(value: string) {
    const error = validateGatewayUrl(value)
    setUrlError(error)
    if (error) return
    updateSettings({ gatewayUrl: value.trim() })
  }

  function handleThemeChange(value: string) {
    const theme = value as SettingsThemeMode
    applyTheme(theme)
    updateSettings({ theme })

    // P1-1: Persist enterprise theme to localStorage, mirroring settings-dialog behaviour
    if (theme === 'light') {
      localStorage.setItem('clawsuite-theme', 'paper-light')
    } else if (theme === 'dark') {
      const current = localStorage.getItem('clawsuite-theme')
      const darkThemes = ['ops-dark', 'premium-dark', 'sunset-brand']
      if (!darkThemes.includes(current ?? '')) {
        localStorage.setItem('clawsuite-theme', 'ops-dark')
      }
    }
  }

  function getAccentBadgeClass(color: AccentColor): string {
    if (color === 'orange') return 'bg-orange-500'
    if (color === 'purple') return 'bg-purple-500'
    if (color === 'blue') return 'bg-blue-500'
    return 'bg-green-500'
  }

  function getConnectionDotClass(): string {
    if (connectionStatus === 'connected') return 'bg-green-500'
    if (connectionStatus === 'failed') return 'bg-red-500'
    if (connectionStatus === 'testing') return 'bg-accent-500'
    return 'bg-primary-500'
  }

  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('profile')

  return (
    <div className="min-h-screen bg-surface text-primary-900">
      <div className="pointer-events-none fixed inset-0 bg-radial from-primary-400/20 via-transparent to-transparent" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-primary-100/25 via-transparent to-primary-300/20" />

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pt-6 pb-24 sm:px-6 md:flex-row md:gap-6 md:pb-8 lg:pt-8">
        {/* Sidebar nav */}
        <nav className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-8">
            <h1 className="mb-4 text-lg font-semibold text-primary-900 px-3">
              Ajustes
            </h1>
            <div className="flex flex-col gap-0.5">
              {SETTINGS_NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    activeSection === item.id
                      ? 'bg-accent-500/10 text-accent-600 font-medium'
                      : 'text-primary-600 hover:bg-primary-100 hover:text-primary-900',
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Mobile header */}
        <div className="flex items-center gap-2 md:hidden">
          <h1 className="text-lg font-semibold text-primary-900">Ajustes</h1>
        </div>

        {/* Mobile section pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none md:hidden">
          {SETTINGS_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                activeSection === item.id
                  ? 'bg-accent-500 text-white'
                  : 'bg-primary-100 text-primary-600',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* ── Profile ─────────────────────────────────────────── */}
          {activeSection === 'profile' && <ProfileSection />}

          {/* ── Appearance ──────────────────────────────────────── */}
          {activeSection === 'appearance' && (
            <>
              <SettingsSection
                title="Apariencia"
                description="Elige el tema de la app y el color de acento."
                icon={PaintBoardIcon}
              >
                <SettingsRow
                  label="Tema"
                  description="Aplica modo claro, oscuro o sigue las preferencias del sistema."
                >
                  <Tabs
                    value={settings.theme}
                    onValueChange={handleThemeChange}
                  >
                    <TabsList variant="default" className="gap-1">
                      <TabsTab value="system">
                        <HugeiconsIcon
                          icon={ComputerIcon}
                          size={20}
                          strokeWidth={1.5}
                        />
                        <span>Sistema</span>
                      </TabsTab>
                      <TabsTab value="light">
                        <HugeiconsIcon
                          icon={Sun01Icon}
                          size={20}
                          strokeWidth={1.5}
                        />
                        <span>Claro</span>
                      </TabsTab>
                      <TabsTab value="dark">
                        <HugeiconsIcon
                          icon={Moon01Icon}
                          size={20}
                          strokeWidth={1.5}
                        />
                        <span>Oscuro</span>
                      </TabsTab>
                    </TabsList>
                  </Tabs>
                </SettingsRow>

                <SettingsRow
                  label="Color de acento"
                  description="Elige el acento principal para controles y resaltados."
                >
                  <div className="flex flex-wrap gap-2">
                    {(['orange', 'purple', 'blue', 'green'] as const).map(
                      function mapAccent(color) {
                        const active = settings.accentColor === color
                        return (
                          <Button
                            key={color}
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              updateSettings({ accentColor: color })
                            }
                            className={cn(
                              'border border-primary-200 bg-primary-100/70 text-primary-900 hover:bg-primary-200',
                              active && 'border-primary-500 bg-primary-200',
                            )}
                          >
                            <span
                              className={cn(
                                'size-2.5 rounded-full',
                                getAccentBadgeClass(color),
                              )}
                            />
                            <span className="capitalize">{color}</span>
                          </Button>
                        )
                      },
                    )}
                  </div>
                </SettingsRow>

                {/* P1-2: Enterprise theme picker — mobile-only settings UI needs this */}
                <SettingsRow
                  label="Tema enterprise"
                  description="Plantillas de marca completas con paletas de color personalizadas."
                >
                  <div className="w-full">
                    <EnterpriseThemePickerPage />
                  </div>
                </SettingsRow>
              </SettingsSection>
              <LoaderStyleSection />
            </>
          )}

          {/* ── Chat ────────────────────────────────────────────── */}
          {activeSection === 'chat' && <ChatDisplaySection />}

          {/* ── Editor ──────────────────────────────────────────── */}
          {activeSection === 'editor' && (
            <SettingsSection
              title="Editor"
              description="Configura los valores por defecto de Monaco para el workspace de archivos."
              icon={SourceCodeSquareIcon}
            >
              <SettingsRow
                label="Tamaño de fuente"
                description="Ajusta el tamaño de fuente del editor entre 12 y 20."
              >
                <div className="flex w-full items-center gap-2 md:max-w-xs">
                  <input
                    type="range"
                    min={12}
                    max={20}
                    value={settings.editorFontSize}
                    onChange={(e) =>
                      updateSettings({ editorFontSize: Number(e.target.value) })
                    }
                    className="w-full accent-primary-900 dark:accent-primary-400"
                    aria-label={`Tamaño de fuente del editor: ${settings.editorFontSize} píxeles`}
                    aria-valuemin={12}
                    aria-valuemax={20}
                    aria-valuenow={settings.editorFontSize}
                  />
                  <span className="w-12 text-right text-sm tabular-nums text-primary-700">
                    {settings.editorFontSize}px
                  </span>
                </div>
              </SettingsRow>
              <SettingsRow
                label="Ajuste de línea"
                description="Ajustar líneas largas en el editor por defecto."
              >
                <Switch
                  checked={settings.editorWordWrap}
                  onCheckedChange={(checked) =>
                    updateSettings({ editorWordWrap: checked })
                  }
                  aria-label="Ajuste de línea"
                />
              </SettingsRow>
              <SettingsRow
                label="Minimapa"
                description="Mostrar la vista previa del minimapa en el editor Monaco."
              >
                <Switch
                  checked={settings.editorMinimap}
                  onCheckedChange={(checked) =>
                    updateSettings({ editorMinimap: checked })
                  }
                  aria-label="Mostrar minimapa"
                />
              </SettingsRow>
            </SettingsSection>
          )}

          {/* ── Notifications ───────────────────────────────────── */}
          {activeSection === 'notifications' && (
            <SettingsSection
              title="Notificaciones"
              description="Controla el envío de alertas y el umbral de aviso de uso."
              icon={Notification03Icon}
            >
              <SettingsRow
                label="Activar alertas"
                description="Mostrar notificaciones de uso y alertas del sistema."
              >
                <Switch
                  checked={settings.notificationsEnabled}
                  onCheckedChange={(checked) =>
                    updateSettings({ notificationsEnabled: checked })
                  }
                  aria-label="Activar alertas"
                />
              </SettingsRow>
              <SettingsRow
                label="Umbral de uso"
                description="Configura el aviso de uso entre el 50% y el 100%."
              >
                <div className="flex w-full items-center gap-2 md:max-w-xs">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={settings.usageThreshold}
                    onChange={(e) =>
                      updateSettings({ usageThreshold: Number(e.target.value) })
                    }
                    className="w-full accent-primary-900 dark:accent-primary-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!settings.notificationsEnabled}
                    aria-label={`Umbral de uso: ${settings.usageThreshold} por ciento`}
                    aria-valuemin={50}
                    aria-valuemax={100}
                    aria-valuenow={settings.usageThreshold}
                  />
                  <span className="w-12 text-right text-sm tabular-nums text-primary-700">
                    {settings.usageThreshold}%
                  </span>
                </div>
              </SettingsRow>
            </SettingsSection>
          )}

          {/* ── Advanced ────────────────────────────────────────── */}
          {activeSection === 'advanced' && (
            <>
              <SettingsSection
                title="Conexión del gateway"
                description="Configura el endpoint del gateway y verifica la conectividad."
                icon={CloudIcon}
              >
                <SettingsRow
                  label="URL del gateway"
                  description="La usa CKS Suite para comprobar la conectividad de los proveedores."
                >
                  <div className="w-full md:max-w-md">
                    <input
                      type="url"
                      placeholder="https://api.openclaw.ai"
                      value={gatewayUrlInput}
                      onChange={(e) => {
                        const nextValue = e.target.value
                        setGatewayUrlInput(nextValue)
                        if (urlError) {
                          setUrlError(validateGatewayUrl(nextValue))
                        }
                      }}
                      onBlur={(e) => persistGatewayUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        persistGatewayUrl((e.target as HTMLInputElement).value)
                        ;(e.target as HTMLInputElement).blur()
                      }}
                      className="h-9 w-full rounded-lg border border-primary-200 dark:border-gray-600 bg-primary-50 dark:bg-gray-800 px-3 text-sm text-primary-900 dark:text-gray-100 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-500"
                      aria-label="URL del gateway"
                      aria-invalid={!!urlError}
                      aria-describedby={
                        urlError ? 'gateway-url-error' : undefined
                      }
                    />
                    {urlError && (
                      <p
                        id="gateway-url-error"
                        className="mt-1 text-xs text-red-600"
                        role="alert"
                      >
                        {urlError}
                      </p>
                    )}
                  </div>
                </SettingsRow>
                <SettingsRow
                  label="Token del gateway"
                  description="Token de autenticación de tu gateway (opcional)."
                >
                  <div className="w-full md:max-w-md">
                    <input
                      type="password"
                      placeholder="Introduce el token de tu gateway…"
                      value={settings.gatewayToken}
                      onChange={(e) =>
                        updateSettings({ gatewayToken: e.target.value })
                      }
                      className="h-9 w-full rounded-lg border border-primary-200 dark:border-gray-600 bg-primary-50 dark:bg-gray-800 px-3 text-sm text-primary-900 dark:text-gray-100 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-500"
                      aria-label="Token del gateway"
                    />
                  </div>
                </SettingsRow>
                <SettingsRow
                  label="Estado de la conexión"
                  description="Estado actual de la comprobación de conectividad del gateway."
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium',
                      connectionStatus === 'connected' &&
                        'border-green-500/35 bg-green-500/10 text-green-600',
                      connectionStatus === 'failed' &&
                        'border-red-500/35 bg-red-500/10 text-red-600',
                      connectionStatus === 'testing' &&
                        'border-accent-500/35 bg-accent-500/10 text-accent-600',
                      connectionStatus === 'idle' &&
                        'border-primary-300 bg-primary-100 text-primary-700',
                    )}
                  >
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        getConnectionDotClass(),
                      )}
                    />
                    {connectionStatus === 'idle' ? 'Sin probar' : null}
                    {connectionStatus === 'testing' ? 'Probando…' : null}
                    {connectionStatus === 'connected' ? 'Conectado' : null}
                    {connectionStatus === 'failed' ? 'Falló' : null}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleTestConnection()}
                    disabled={connectionStatus === 'testing' || !!urlError}
                  >
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      size={20}
                      strokeWidth={1.5}
                    />
                    Probar
                  </Button>
                </SettingsRow>
                <SettingsRow
                  label="Asistente de configuración"
                  description="Vuelve a lanzar el asistente de configuración del gateway."
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => gatewaySetup.open()}
                  >
                    Reconfigurar gateway
                  </Button>
                </SettingsRow>
              </SettingsSection>

              <SettingsSection
                title="Sugerencias inteligentes"
                description="Recibe sugerencias proactivas de modelos para optimizar coste y calidad."
                icon={Settings02Icon}
              >
                <SettingsRow
                  label="Activar sugerencias inteligentes"
                  description="Sugerir modelos más baratos para tareas simples o mejores para trabajos complejos."
                >
                  <Switch
                    checked={settings.smartSuggestionsEnabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ smartSuggestionsEnabled: checked })
                    }
                    aria-label="Activar sugerencias inteligentes"
                  />
                </SettingsRow>
                <SettingsRow
                  label="Modelo económico preferido"
                  description="Modelo por defecto para sugerencias más baratas (déjalo vacío para autodetectar)."
                >
                  <select
                    value={settings.preferredBudgetModel}
                    onChange={(e) =>
                      updateSettings({ preferredBudgetModel: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-primary-200 dark:border-gray-600 bg-primary-50 dark:bg-gray-800 px-3 text-sm text-primary-900 dark:text-gray-100 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-500 md:max-w-xs"
                    aria-label="Modelo económico preferido"
                  >
                    <option value="">Autodetectar</option>
                    {modelsError && (
                      <option disabled>No se han podido cargar los modelos</option>
                    )}
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </SettingsRow>
                <SettingsRow
                  label="Modelo premium preferido"
                  description="Modelo por defecto para sugerencias de upgrade (déjalo vacío para autodetectar)."
                >
                  <select
                    value={settings.preferredPremiumModel}
                    onChange={(e) =>
                      updateSettings({ preferredPremiumModel: e.target.value })
                    }
                    className="h-9 w-full rounded-lg border border-primary-200 dark:border-gray-600 bg-primary-50 dark:bg-gray-800 px-3 text-sm text-primary-900 dark:text-gray-100 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-400 dark:focus-visible:ring-primary-500 md:max-w-xs"
                    aria-label="Modelo premium preferido"
                  >
                    <option value="">Autodetectar</option>
                    {modelsError && (
                      <option disabled>No se han podido cargar los modelos</option>
                    )}
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </SettingsRow>
                <SettingsRow
                  label="Sugerir solo modelos más baratos"
                  description="Nunca sugerir upgrades, solo alternativas más baratas."
                >
                  <Switch
                    checked={settings.onlySuggestCheaper}
                    onCheckedChange={(checked) =>
                      updateSettings({ onlySuggestCheaper: checked })
                    }
                    aria-label="Sugerir solo modelos más baratos"
                  />
                </SettingsRow>
              </SettingsSection>
            </>
          )}

          <footer className="mt-auto pt-4">
            <div className="flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50/70 p-3 text-sm text-primary-600 backdrop-blur-sm">
              <HugeiconsIcon
                icon={Settings02Icon}
                size={20}
                strokeWidth={1.5}
              />
              <span className="text-pretty">
                Los cambios se guardan automáticamente en el almacenamiento local.
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

// ── Profile Section ─────────────────────────────────────────────────────

const PROFILE_IMAGE_MAX_DIMENSION = 128
const PROFILE_IMAGE_MAX_FILE_SIZE = 10 * 1024 * 1024

function ProfileSection() {
  const { settings: chatSettings, updateSettings: updateChatSettings } =
    useChatSettingsStore()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileProcessing, setProfileProcessing] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const displayName = getChatProfileDisplayName(chatSettings.displayName)

  function handleNameChange(value: string) {
    if (value.length > 50) {
      setNameError('Nombre demasiado largo (máx 50 caracteres)')
      return
    }
    setNameError(null)
    updateChatSettings({ displayName: value })
  }

  async function handleAvatarUpload(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileError('Tipo de archivo no soportado.')
      return
    }
    if (file.size > PROFILE_IMAGE_MAX_FILE_SIZE) {
      setProfileError('Imagen demasiado grande (máx 10 MB).')
      return
    }
    setProfileError(null)
    setProfileProcessing(true)
    try {
      const url = URL.createObjectURL(file)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('No se ha podido cargar la imagen'))
        i.src = url
      })
      const max = PROFILE_IMAGE_MAX_DIMENSION
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      updateChatSettings({ avatarDataUrl: canvas.toDataURL(outputType, 0.82) })
    } catch {
      setProfileError('No se ha podido procesar la imagen.')
    } finally {
      setProfileProcessing(false)
    }
  }

  return (
    <SettingsSection
      title="Perfil"
      description="Tu nombre y avatar para el chat."
      icon={UserIcon}
    >
      <div className="flex items-center gap-4">
        <UserAvatar
          size={56}
          src={chatSettings.avatarDataUrl}
          alt={displayName}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-900">{displayName}</p>
          <p className="text-xs text-primary-500">
            Aparece en la barra lateral y en los mensajes del chat.
          </p>
        </div>
      </div>
      <SettingsRow label="Nombre visible" description="Déjalo en blanco para usar el predeterminado.">
        <div className="w-full md:max-w-xs">
          <Input
            value={chatSettings.displayName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Usuario"
            className="h-9 w-full"
            maxLength={50}
            aria-label="Nombre visible"
            aria-invalid={!!nameError}
            aria-describedby={nameError ? 'profile-name-error' : undefined}
          />
          {nameError && (
            <p
              id="profile-name-error"
              className="mt-1 text-xs text-red-600"
              role="alert"
            >
              {nameError}
            </p>
          )}
        </div>
      </SettingsRow>
      <SettingsRow
        label="Foto de perfil"
        description="Se redimensiona a 128×128 y se guarda localmente."
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={profileProcessing}
                aria-label="Subir foto de perfil"
                className="block w-full cursor-pointer text-xs text-primary-700 dark:text-gray-300 md:max-w-xs file:mr-2 file:cursor-pointer file:rounded-md file:border file:border-primary-200 dark:file:border-gray-600 file:bg-primary-100 dark:file:bg-gray-700 file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-primary-900 dark:file:text-gray-100 file:transition-colors hover:file:bg-primary-200 dark:hover:file:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateChatSettings({ avatarDataUrl: null })}
              disabled={!chatSettings.avatarDataUrl || profileProcessing}
            >
              Quitar
            </Button>
          </div>
          {profileError && (
            <p className="text-xs text-red-600" role="alert">
              {profileError}
            </p>
          )}
        </div>
      </SettingsRow>
    </SettingsSection>
  )
}

// ── Chat Display Section ────────────────────────────────────────────────

function ChatDisplaySection() {
  const { settings: chatSettings, updateSettings: updateChatSettings } =
    useChatSettingsStore()
  const { settings, updateSettings } = useSettings()

  return (
    <>
    <SettingsSection
      title="Visualización del chat"
      description="Controla qué se muestra en los mensajes del chat."
      icon={MessageMultiple01Icon}
    >
      <SettingsRow
        label="Mostrar mensajes de herramientas"
        description="Muestra los detalles de llamada cuando el agente usa herramientas."
      >
        <Switch
          checked={chatSettings.showToolMessages}
          onCheckedChange={(checked) =>
            updateChatSettings({ showToolMessages: checked })
          }
          aria-label="Mostrar mensajes de herramientas"
        />
      </SettingsRow>
      <SettingsRow
        label="Mostrar bloques de razonamiento"
        description="Muestra el proceso de pensamiento y razonamiento del modelo."
      >
        <Switch
          checked={chatSettings.showReasoningBlocks}
          onCheckedChange={(checked) =>
            updateChatSettings({ showReasoningBlocks: checked })
          }
          aria-label="Mostrar bloques de razonamiento"
        />
      </SettingsRow>
    </SettingsSection>
    <SettingsSection
      title="Navegación en móvil"
      description="Cómo se comporta la barra inferior en las pantallas del chat."
      icon={MessageMultiple01Icon}
    >
      <SettingsRow
        label="Modo de la nav del chat"
        description="Dock: oculta la nav en el chat (estilo iMessage). Scroll-hide: la nav se queda y el composer flota encima."
      >
        <select
          value={settings.mobileChatNavMode ?? 'dock'}
          onChange={(e) => updateSettings({ mobileChatNavMode: e.target.value as 'dock' | 'integrated' | 'scroll-hide' })}
          className="rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
          <option value="dock">Dock (iMessage)</option>
          <option value="scroll-hide">Nav visible (pill encima)</option>
        </select>
      </SettingsRow>
    </SettingsSection>
    </>
  )
}

// ── Loader Style Section ────────────────────────────────────────────────

type LoaderStyleOption = { value: LoaderStyle; label: string }

const LOADER_STYLES: LoaderStyleOption[] = [
  { value: 'dots', label: 'Dots' },
  { value: 'braille-claw', label: 'Claw' },
  { value: 'braille-orbit', label: 'Orbit' },
  { value: 'braille-breathe', label: 'Breathe' },
  { value: 'braille-pulse', label: 'Pulse' },
  { value: 'braille-wave', label: 'Wave' },
  { value: 'lobster', label: 'Lobster' },
  { value: 'logo', label: 'Logo' },
]

function getPreset(style: LoaderStyle): BrailleSpinnerPreset | null {
  const map: Record<string, BrailleSpinnerPreset> = {
    'braille-claw': 'claw',
    'braille-orbit': 'orbit',
    'braille-breathe': 'breathe',
    'braille-pulse': 'pulse',
    'braille-wave': 'wave',
  }
  return map[style] ?? null
}

function LoaderPreview({ style }: { style: LoaderStyle }) {
  if (style === 'dots') return <ThreeDotsSpinner />
  if (style === 'lobster')
    return <span className="inline-block text-sm animate-pulse">🦞</span>
  if (style === 'logo') return <LogoLoader />
  const preset = getPreset(style)
  return preset ? (
    <BrailleSpinner
      preset={preset}
      size={16}
      speed={120}
      className="text-primary-500"
    />
  ) : (
    <ThreeDotsSpinner />
  )
}

function LoaderStyleSection() {
  const { settings: chatSettings, updateSettings: updateChatSettings } =
    useChatSettingsStore()

  return (
    <SettingsSection
      title="Animación de carga"
      description="Elige la animación que se muestra mientras el asistente está respondiendo."
      icon={Settings02Icon}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOADER_STYLES.map((option) => {
          const active = chatSettings.loaderStyle === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => updateChatSettings({ loaderStyle: option.value })}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-2 transition-colors',
                active
                  ? 'border-primary-500 bg-primary-200/60 text-primary-900'
                  : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100',
              )}
              aria-pressed={active}
            >
              <span className="flex h-5 items-center justify-center">
                <LoaderPreview style={option.value} />
              </span>
              <span className="text-[11px] font-medium text-center leading-4">
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
    </SettingsSection>
  )
}
