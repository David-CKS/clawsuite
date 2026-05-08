import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '../components/prompt-kit/code-block'

export const Route = createFileRoute('/connect')({
  component: ConnectRoute,
})

function ConnectRoute() {
  return (
    <div className="min-h-screen bg-primary-50 text-primary-900">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-3">
          <h1 className="text-3xl font-medium tracking-[-0.02em] text-center mb-10">
            Conéctate a CKS Suite
          </h1>
          <p className="text-primary-700">
            Este cliente necesita acceso a tu gateway de OpenClaw antes de que
            puedas empezar a chatear.
          </p>
        </div>
        <div className="space-y-4 text-primary-700">
          <p>
            En la raíz del proyecto, crea un archivo nuevo llamado{' '}
            <code className="inline-code">.env.local</code>.
          </p>
          <div className="space-y-3">
            <p>Pega esto dentro:</p>
            <CodeBlock
              content={`CLAWDBOT_GATEWAY_URL=ws://127.0.0.1:18789\nCLAWDBOT_GATEWAY_TOKEN=YOUR_TOKEN_HERE`}
              ariaLabel="Copiar ejemplo de token del gateway"
              language="bash"
            />
            <p className="text-primary-600 text-sm">o:</p>
            <CodeBlock
              content="CLAWDBOT_GATEWAY_PASSWORD=YOUR_PASSWORD_HERE"
              ariaLabel="Copiar ejemplo de contraseña del gateway"
              language="bash"
            />
          </div>
          <p>
            Las variables de entorno se cargan al iniciar. Reinicia tu servidor
            de desarrollo:
          </p>
          <CodeBlock
            content="npm run dev"
            ariaLabel="Copiar npm run dev"
            language="bash"
          />
          <p>Recarga la página tras el reinicio y deberías quedar conectado.</p>
        </div>

        <div className="space-y-3 rounded-lg border border-primary-200 bg-primary-100 px-4 py-3 text-primary-700 text-sm">
          <p className="text-primary-900 font-medium">
            Dónde encontrar estos valores
          </p>
          <div className="space-y-3">
            <p>
              <code className="inline-code">CLAWDBOT_GATEWAY_URL</code>
              <br />
              El endpoint de tu gateway de OpenClaw (por defecto
              <code className="inline-code">ws://127.0.0.1:18789</code>).
            </p>
            <p>
              <code className="inline-code">CLAWDBOT_GATEWAY_TOKEN</code>{' '}
              (recomendado)
              <br />
              Coincide con el token de tu Gateway (
              <code className="inline-code">gateway.auth.token</code> o
              <code className="inline-code">OPENCLAW_GATEWAY_TOKEN</code>).
            </p>
            <p>
              <code className="inline-code">CLAWDBOT_GATEWAY_PASSWORD</code>{' '}
              (alternativa)
              <br />
              Coincide con la contraseña de tu Gateway (
              <code className="inline-code">gateway.auth.password</code>).
            </p>
          </div>
          <p>
            Documentación del gateway:{' '}
            <a
              className="text-primary-700 hover:text-primary-900 underline"
              href="https://docs.openclaw.ai/gateway"
              target="_blank"
              rel="noreferrer"
            >
              https://docs.openclaw.ai/gateway
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
