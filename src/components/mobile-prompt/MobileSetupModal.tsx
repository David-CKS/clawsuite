'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, Tick01Icon, Sent02Icon } from '@hugeicons/core-free-icons';
import { OpenClawStudioIcon } from '@/components/icons/clawsuite';

const STORAGE_KEY_SEEN = 'clawsuite-mobile-setup-seen';

interface MobileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function TailscaleIcon() {
  return (
    <svg viewBox="0 0 100 100" className="size-5">
      <circle cx="50" cy="10" r="10" fill="#fff" opacity="0.9" />
      <circle cx="50" cy="50" r="10" fill="#fff" />
      <circle cx="50" cy="90" r="10" fill="#fff" opacity="0.9" />
      <circle cx="10" cy="30" r="10" fill="#fff" opacity="0.6" />
      <circle cx="90" cy="30" r="10" fill="#fff" opacity="0.6" />
      <circle cx="10" cy="70" r="10" fill="#fff" opacity="0.6" />
      <circle cx="90" cy="70" r="10" fill="#fff" opacity="0.6" />
      <circle cx="10" cy="50" r="10" fill="#fff" opacity="0.3" />
      <circle cx="90" cy="50" r="10" fill="#fff" opacity="0.3" />
    </svg>
  );
}

export function MobileSetupModal({ isOpen, onClose }: MobileSetupModalProps) {
  const [step, setStep] = useState(0);
  const [exposeSent, setExposeSent] = useState(false);
  const [exposeSending, setExposeSending] = useState(false);
  const [networkUrl, setNetworkUrl] = useState<{ url: string; source: 'tailscale' | 'lan' | 'localhost' } | null>(null);

  useEffect(() => {
    fetch(`/api/network-url?port=${window.location.port || 3000}`)
      .then((r) => r.json() as Promise<{ url: string; source: 'tailscale' | 'lan' | 'localhost' }>)
      .then((data) => setNetworkUrl(data))
      .catch(() => setNetworkUrl({ url: window.location.origin, source: 'localhost' }));
  }, []);

  const sendExpose = async () => {
    setExposeSending(true);
    try {
      // Get the active session key
      const sessionsRes = await fetch('/api/sessions');
      const sessionsData = await sessionsRes.json() as { sessions?: Array<{ key: string; kind?: string }> };
      const sessions = sessionsData.sessions ?? [];
      const mainSession = sessions.find((s) => s.kind === 'main') ?? sessions[0];
      if (!mainSession?.key) throw new Error('No active session');

      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionKey: mainSession.key,
          message: 'Exponte en la red para que pueda acceder desde mi móvil',
        }),
      });
      setExposeSent(true);
    } catch {
      setExposeSent(true); // still advance UX
    } finally {
      setExposeSending(false);
    }
  };

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const steps = [
    {
      title: 'Instala Tailscale en tu ordenador',
      body: 'Instala Tailscale en la máquina donde corre CKS Suite y luego inicia sesión.',
      showTailscaleIcon: true,
      action: (
        <a
          href="https://tailscale.com/download"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-400"
        >
          Abrir descargas de Tailscale
        </a>
      ),
    },
    {
      title: 'Haz que OpenClaw sea visible',
      body: 'Envía esto a tu agente OpenClaw para que se exponga en la red y tu móvil pueda encontrarlo.',
      showTailscaleIcon: false,
      action: (
        <div className="space-y-3">
          <p className="rounded-lg border border-primary-700 bg-primary-950 px-4 py-3 font-mono text-xs text-accent-300">
            Exponte en la red para que pueda acceder desde mi móvil
          </p>
          <button
            type="button"
            onClick={sendExpose}
            disabled={exposeSent || exposeSending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-400 disabled:cursor-default disabled:opacity-70"
          >
            {exposeSent ? (
              <>
                <HugeiconsIcon icon={Tick01Icon} size={16} strokeWidth={2} />
                Enviado — revisa tu chat
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Sent02Icon} size={16} strokeWidth={2} />
                {exposeSending ? 'Enviando…' : 'Enviar a OpenClaw'}
              </>
            )}
          </button>
        </div>
      ),
    },
    {
      title: 'Instala Tailscale en tu móvil',
      body: 'Instala Tailscale en iOS o Android e inicia sesión con la misma cuenta.',
      showTailscaleIcon: true,
      action: (
        <div className="flex gap-2">
          <a
            href="https://apps.apple.com/app/apple-store/id425072860"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-950 px-3 py-2 text-xs font-medium text-primary-100 transition-colors hover:bg-primary-800"
          >
            App iOS
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=com.tailscale.ipn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-primary-700 bg-primary-950 px-3 py-2 text-xs font-medium text-primary-100 transition-colors hover:bg-primary-800"
          >
            App Android
          </a>
        </div>
      ),
    },
    {
      title: 'Abre CKS Suite en tu móvil',
      body: networkUrl?.source === 'tailscale'
        ? 'Tu dirección de Tailscale — ábrela en el navegador del móvil.'
        : networkUrl?.source === 'lan'
        ? 'Tu dirección de red local — el móvil debe estar en la misma WiFi.'
        : 'Asegúrate de que Tailscale corre en esta máquina para tener un enlace compartible.',
      showTailscaleIcon: networkUrl?.source === 'tailscale',
      action: (
        <button
          type="button"
          onClick={() => networkUrl && navigator.clipboard.writeText(networkUrl.url).catch(() => {})}
          className="group flex w-full items-center justify-between rounded-lg border border-primary-700 bg-primary-950 px-4 py-3 transition-colors hover:border-accent-500/50"
        >
          <span className="break-all font-mono text-sm text-accent-300">
            {networkUrl?.url ?? '…'}
          </span>
          <span className="ml-3 shrink-0 text-primary-500 group-hover:text-accent-400">
            {networkUrl?.source === 'tailscale' && (
              <svg viewBox="0 0 100 100" className="size-4 opacity-60">
                <circle cx="50" cy="10" r="10" fill="currentColor" opacity="0.9" />
                <circle cx="50" cy="50" r="10" fill="currentColor" />
                <circle cx="50" cy="90" r="10" fill="currentColor" opacity="0.9" />
                <circle cx="10" cy="30" r="10" fill="currentColor" opacity="0.6" />
                <circle cx="90" cy="30" r="10" fill="currentColor" opacity="0.6" />
                <circle cx="10" cy="70" r="10" fill="currentColor" opacity="0.6" />
                <circle cx="90" cy="70" r="10" fill="currentColor" opacity="0.6" />
              </svg>
            )}
          </span>
        </button>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setStep((prev) => prev + 1);
      return;
    }

    localStorage.setItem(STORAGE_KEY_SEEN, 'true');
    localStorage.setItem('clawsuite-mobile-prompt-dismissed', 'true');
    onClose();
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        className="relative w-full max-w-md rounded-2xl border border-primary-800/60 bg-primary-950 p-5 text-white shadow-2xl shadow-black/40"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-primary-400 transition-colors hover:bg-primary-900 hover:text-primary-200"
          aria-label="Cerrar configuración móvil"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} />
        </button>

        <div className="mb-4 flex items-center gap-3 pr-10">
          <OpenClawStudioIcon className="size-9 overflow-hidden rounded-xl" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">Configuración móvil</h2>
            <div className="mt-1 flex items-center gap-1.5">
              {steps.map((_, index) => (
                <span
                  key={`step-indicator-${index}`}
                  className={`h-2 w-6 rounded-full transition-colors ${
                    index === step ? 'bg-accent-500' : 'bg-primary-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-primary-900 p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-2 flex items-center gap-2">
                {currentStep.showTailscaleIcon ? <TailscaleIcon /> : null}
                <h3 className="text-sm font-semibold text-primary-100">{currentStep.title}</h3>
              </div>
              <p className="mb-4 text-sm text-primary-300">{currentStep.body}</p>
              <div>{currentStep.action}</div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0}
            className="rounded-lg px-3 py-2 text-sm text-primary-400 transition-colors hover:text-primary-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Atrás
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-primary-400 transition-colors hover:text-primary-200"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-400"
            >
              {isLastStep ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
