import { useState, useEffect } from "react";
import { CheckCircle2, MousePointerClick, Shield, Send, HelpCircle, ChevronLeft, ChevronRight, X } from "lucide-react";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Selecciona candidatos",
    description:
      "Pulsa sobre las tarjetas de los candidatos que quieres votar. Puedes seleccionar hasta el máximo indicado.",
    accent: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-500/10",
    iconRing: "ring-red-500/25",
    dotActive: "bg-red-500",
    topBar: "linear-gradient(90deg, rgba(239,68,68,0.85), rgba(248,113,113,0.55), rgba(239,68,68,0.2))",
    color: "#ef4444",
    nextBg: "bg-red-500/10 hover:bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400",
  },
  {
    icon: CheckCircle2,
    title: "Revisa tu selección",
    description:
      "Puedes cambiar tu selección en cualquier momento antes de confirmar. Los candidatos seleccionados se marcan con un borde y un ✓.",
    accent: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-500/10",
    iconRing: "ring-emerald-500/25",
    dotActive: "bg-emerald-500",
    topBar: "linear-gradient(90deg, rgba(16,185,129,0.85), rgba(52,211,153,0.55), rgba(16,185,129,0.2))",
    color: "#10b981",
    nextBg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
  },
  {
    icon: Send,
    title: "Confirma tu voto",
    description:
      'Cuando estés seguro, pulsa el botón "Votar" para enviar tu selección. Una vez confirmado, no podrás cambiar tu voto.',
    accent: "text-yellow-600 dark:text-yellow-400",
    iconBg: "bg-yellow-500/10",
    iconRing: "ring-yellow-500/25",
    dotActive: "bg-yellow-500",
    topBar: "linear-gradient(90deg, rgba(234,179,8,0.85), rgba(250,204,21,0.55), rgba(234,179,8,0.2))",
    color: "#eab308",
    nextBg: "bg-yellow-500/10 hover:bg-yellow-500/15 border-yellow-500/30 text-yellow-700 dark:text-yellow-400",
  },
  {
    icon: Shield,
    title: "Voto seguro y anónimo",
    description:
      "Tu voto es completamente anónimo. Se encripta antes de enviarse y recibirás un código de verificación.",
    accent: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-500/10",
    iconRing: "ring-blue-500/25",
    dotActive: "bg-blue-500",
    topBar: "linear-gradient(90deg, rgba(59,130,246,0.85), rgba(96,165,250,0.55), rgba(59,130,246,0.2))",
    color: "#3b82f6",
    nextBg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400",
  },
];

interface VotingTutorialProps {
  forceOpen?: boolean;
  roundId?: string;
  compactTrigger?: boolean;
}

const TUTORIAL_KEY = "mcm_voting_tutorial_seen";

function hasSeenTutorial(): boolean {
  try { return localStorage.getItem(TUTORIAL_KEY) === "1"; } catch { return false; }
}
function markTutorialSeen(): void {
  try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch { /* ignore */ }
}

export function VotingTutorial({ forceOpen, roundId: _roundId, compactTrigger = false }: VotingTutorialProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [iconKey, setIconKey] = useState(0);

  useEffect(() => {
    if (forceOpen) { setOpen(true); setStep(0); return; }
    if (!hasSeenTutorial()) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setIconKey((k) => k + 1);
  }, [open, step]);

  const handleClose = () => { setOpen(false); setStep(0); markTutorialSeen(); };
  const handleNext  = () => { if (step < STEPS.length - 1) setStep(step + 1); else handleClose(); };
  const handlePrev  = () => { if (step > 0) setStep(step - 1); };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <>
      <button
        type="button"
        onClick={() => { setStep(0); setOpen(true); }}
        aria-label="Abrir guía de votación"
        title="¿Cómo votar?"
        className={`avd-btn avd-btn-icon${compactTrigger ? ' w-[42px] h-[42px]' : ' w-auto px-[10px] gap-[6px]'}`}
      >
        <HelpCircle className="w-[18px] h-[18px]" />
        {!compactTrigger && <span>¿Cómo votar?</span>}
      </button>

      {open && (
        <div
          className="avd-dialog-overlay z-[110]"
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <style>{`
            @keyframes vtu-pop {
              0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; }
              60%  { transform: scale(1.1) rotate(3deg); opacity: 1; }
              100% { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes vtu-ring {
              0%   { transform: scale(0.85); opacity: 0.55; }
              100% { transform: scale(1.5); opacity: 0; }
            }
            @keyframes vtu-float {
              0%,100% { transform: translateY(0) scale(1); opacity: 0.5; }
              50%     { transform: translateY(-7px) scale(1.15); opacity: 1; }
            }
            @keyframes vtu-shimmer {
              0%   { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
            .vtu-shimmer-bar {
              background-size: 200% 100%;
              animation: vtu-shimmer 1.8s linear infinite;
            }
          `}</style>
          <div
            className="avd-dialog max-w-[420px] p-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div
              className="vtu-shimmer-bar h-1 w-full transition-[background-image] duration-[450ms]"
              style={{ backgroundImage: current.topBar }}
            />

            {/* Icon area */}
            <div className="flex flex-col items-center gap-5 px-8 pt-8 pb-6">
              {/* Step dots */}
              <div className="flex items-center gap-2">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === step
                        ? `w-6 h-2 ${current.dotActive}`
                        : i < step
                        ? `w-2 h-2 ${current.dotActive} opacity-50`
                        : "w-2 h-2 bg-muted-foreground/25"
                    }`}
                  />
                ))}
              </div>

              {/* Icon bubble */}
              <div
                key={iconKey}
                className="relative w-[84px] h-[84px] [animation:vtu-pop_520ms_cubic-bezier(0.22,1,0.36,1)]"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl"
                  className="absolute inset-0 rounded-2xl [animation:vtu-ring_1.6s_ease-out_infinite]"
                  style={{ border: `2px solid ${current.color}` }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-2xl [animation:vtu-ring_1.6s_ease-out_infinite] [animation-delay:0.55s]"
                  style={{ border: `2px solid ${current.color}` }}
                />
                <div className={`w-20 h-20 rounded-2xl ${current.iconBg} ring-1 ${current.iconRing} flex items-center justify-center transition-all duration-300 m-[2px]`}>
                  <Icon className={`w-10 h-10 ${current.accent}`} strokeWidth={1.7} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-8 pb-6">
              <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--avd-fg)] mb-3 leading-[1.2]">
                {current.title}
              </h3>
              <p className="text-[14px] text-[var(--avd-fg-muted)] leading-[1.6] font-medium">
                {current.description}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--avd-border-soft)] flex items-center justify-between gap-2 bg-[var(--avd-bg-sunken)]">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="avd-btn"
              >
                <ChevronLeft className="w-[13px] h-[13px]" />
                Anterior
              </button>

              <button
                onClick={handleClose}
                className="avd-btn avd-btn-ghost"
              >
                <X className="w-3 h-3" />
                Saltar
              </button>

              <button
                onClick={handleNext}
                className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-[var(--avd-radius-sm)] border text-[13px] font-bold transition-all ${current.nextBg}`}
              >
                {isLast ? "¡Entendido!" : "Siguiente"}
                {!isLast && <ChevronRight className="w-[13px] h-[13px]" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
