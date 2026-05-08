import type { HugeiconsIcon } from '@hugeicons/react'
import {
  Home01Icon,
  Message01Icon,
  DashboardSquare01Icon,
  BrowserIcon,
  Rocket01Icon,
  Folder01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'
import type * as React from 'react'

type IconType = React.ComponentProps<typeof HugeiconsIcon>['icon']

export type OnboardingStep = {
  id: string
  title: string
  description: string
  icon: IconType
  iconBg: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Te damos la bienvenida a CKS Suite',
    description:
      'Tu workspace inteligente para automatización con IA. Vamos a echar un vistazo rápido a lo que puedes hacer.',
    icon: Home01Icon,
    iconBg: 'bg-orange-500',
  },
  {
    id: 'chat',
    title: 'Interfaz de chat con IA',
    description:
      'Conversa de forma natural con modelos de IA potentes. Crea varias sesiones, busca con ⌘K y deja que la IA gestione tareas complejas.',
    icon: Message01Icon,
    iconBg: 'bg-blue-500',
  },
  {
    id: 'dashboard',
    title: 'Panel y widgets',
    description:
      'Sigue tu uso, monitoriza tareas activas y personaliza tu workspace con widgets interactivos.',
    icon: DashboardSquare01Icon,
    iconBg: 'bg-emerald-500',
  },
  {
    id: 'browser-terminal',
    title: 'Navegador y terminal',
    description:
      'Automatización de navegador y acceso a terminal integrados. Deja que la IA navegue por la web y ejecute comandos por ti.',
    icon: BrowserIcon,
    iconBg: 'bg-purple-500',
  },
  {
    id: 'agent-swarm',
    title: 'Agent Swarm',
    description:
      'Orquestación multi-agente para flujos complejos. Lanza agentes especializados que trabajan juntos. Próximamente.',
    icon: Rocket01Icon,
    iconBg: 'bg-pink-500',
  },
  {
    id: 'files-memory',
    title: 'Archivos y memoria',
    description:
      'Explora archivos del workspace y accede a la memoria del agente. Tu asistente IA recuerda el contexto entre sesiones.',
    icon: Folder01Icon,
    iconBg: 'bg-amber-500',
  },
  {
    id: 'providers',
    title: 'Modelos y proveedores',
    description:
      'Configura proveedores de IA como OpenAI, Anthropic y más. Elige el modelo perfecto para cada tarea.',
    icon: Settings01Icon,
    iconBg: 'bg-cyan-500',
  },
]

export const STORAGE_KEY = 'openclaw-onboarding-complete'
