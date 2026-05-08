import { Step } from 'react-joyride'
import { OpenClawStudioIcon } from '@/components/icons/clawsuite'

export const tourSteps: Step[] = [
  // Step 1: Welcome
  {
    target: 'body',
    placement: 'center',
    title: 'Te damos la bienvenida a CKS Suite 👋',
    content: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <OpenClawStudioIcon className="size-12 rounded-xl shadow-sm" />
        <p style={{ textAlign: 'center', margin: 0 }}>
          Tu centro de mando con IA para gestionar agentes, chats, archivos y más. Vamos a echar un vistazo rápido.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  // Step 2: Sidebar
  {
    target: '[data-tour="sidebar-container"]',
    placement: 'right',
    title: 'Navegación lateral',
    content:
      'Navega entre todas tus herramientas aquí. Colapsa o expande secciones para personalizar tu workspace.',
  },
  // Step 3: New Session
  {
    target: '[data-tour="new-session"]',
    placement: 'right',
    title: 'Iniciar un nuevo chat',
    content:
      'Pulsa aquí para iniciar una nueva sesión de chat con IA. Cada conversación se guarda automáticamente.',
  },
  // Step 4: Dashboard
  {
    target: '[data-tour="dashboard"]',
    placement: 'right',
    title: 'Tu panel',
    content:
      'Resumen de sesiones, uso y actividad. Lo ves todo de un vistazo.',
  },
  // Step 5: Agent Hub
  {
    target: '[data-tour="agent-hub"]',
    placement: 'right',
    title: 'Agent Hub',
    content:
      'Gestiona tus agentes IA y sus configuraciones. Crea agentes personalizados con comportamientos especializados.',
  },
  // Step 7: Skills
  {
    target: '[data-tour="skills"]',
    placement: 'right',
    title: 'Biblioteca de skills',
    content:
      'Explora e instala skills de agente para ampliar capacidades. Añade nuevas herramientas y habilidades a tus agentes.',
  },
  // Step 8: Terminal
  {
    target: '[data-tour="terminal"]',
    placement: 'right',
    title: 'Terminal integrado',
    content:
      'Terminal integrado para comandos rápidos. Ejecuta comandos shell sin salir de CKS Suite.',
  },
  // Step 9: Usage Meter (in header)
  {
    target: '[data-tour="usage-meter"]',
    placement: 'bottom',
    title: 'Monitor de uso',
    content:
      'Monitoriza el uso de tu proveedor de IA en tiempo real. Lleva el control de costes y consumo de API.',
  },
  // Step 10: Settings
  {
    target: '[data-tour="settings"]',
    placement: 'right',
    title: 'Ajustes y personalización',
    content:
      'Configura proveedores, temas, colores de acento y más. Haz tuyo CKS Suite.',
  },
  // Step 11: Finish
  {
    target: 'body',
    placement: 'center',
    title: '¡Todo listo! 🎉',
    content:
      'Empieza a chatear con tu IA, explora las herramientas y adapta CKS Suite a tu flujo de trabajo. ¿Necesitas ayuda? Pulsa ? para ver todos los atajos de teclado.',
  },
]
