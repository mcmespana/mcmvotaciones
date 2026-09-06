import { useState, useEffect } from "react";
import { VOTE_COLOR_CSS } from "@/lib/voteColors";
import { CheckCircle2, MousePointerClick, Shield, Send, Star, HelpCircle, ChevronLeft, ChevronRight, X } from "lucide-react";

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
    topBar: "linear-gradient(90deg, color-mix(in oklch, hsl(var(--vote-color-red)) 85%, transparent), color-mix(in oklch, hsl(var(--vote-color-red)) 45%, transparent), color-mix(in oklch, hsl(var(--vote-color-red)) 20%, transparent))",
    color: VOTE_COLOR_CSS.red,
    nextBg: "bg-red-500/10 hover:bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400",
  },
  {
    icon: Star,
    title: "Marca tus favoritos",
    description: "Desliza cualquier tarjeta hacia la derecha para añadirla a favoritos ⭐. Los favoritos aparecen fijados al principio de la lista para encontrarlos fácilmente.",
    accent: "text-amber-500 dark:text-amber-400",
    iconBg: "bg-amber-500/10",
    iconRing: "ring-amber-500/25",
    dotActive: "bg-amber-500",
    topBar: "linear-gradient(90deg, color-mix(in oklch, #f59e0b 85%, transparent), color-mix(in oklch, #f59e0b 45%, transparent), color-mix(in oklch, #f59e0b 20%, transparent))",
    // Ámbar de «favorito»: sin token en el sistema todavía (design-plans/002)
    color: "#f59e0b",
    nextBg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
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
    topBar: "linear-gradient(90deg, color-mix(in oklch, hsl(var(--vote-color-green)) 85%, transparent), color-mix(in oklch, hsl(var(--vote-color-green)) 45%, transparent), color-mix(in oklch, hsl(var(--vote-color-green)) 20%, transparent))",
    color: VOTE_COLOR_CSS.green,
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
    topBar: "linear-gradient(90deg, color-mix(in oklch, hsl(var(--vote-color-yellow)) 85%, transparent), color-mix(in oklch, hsl(var(--vote-color-yellow)) 45%, transparent), color-mix(in oklch, hsl(var(--vote-color-yellow)) 20%, transparent))",
    color: VOTE_COLOR_CSS.yellow,
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
    topBar: "linear-gradient(90deg, color-mix(in oklch, hsl(var(--vote-color-blue)) 85%, transparent), color-mix(in oklch, hsl(var(--vote-color-blue)) 45%, transparent), color-mix(in oklch, hsl(var(--vote-color-blue)) 20%, transparent))",
    color: VOTE_COLOR_CSS.blue,
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
        className={compactTrigger ? 'avd-btn avd-btn-icon w-[2.625rem] h-[2.625rem]' : 'avd-btn px-[0.625rem] gap-[0.375rem]'}
      >
        <HelpCircle className="w-[1.125rem] h-[1.125rem]" />
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
              className="vtu-shimmer-bar shrink-0 h-1 w-full transition-[background-image] duration-[450ms]"
              style={{ backgroundImage: current.topBar }}
            />

            <div className="flex-1 overflow-y-auto">
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
                  className="relative w-[5.25rem] h-[5.25rem] [animation:vtu-pop_520ms_cubic-bezier(0.22,1,0.36,1)]"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl [animation:vtu-ring_1.6s_ease-out_infinite]"
                    style={{ border: `2px solid ${current.color}` }}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl [animation:vtu-ring_1.6s_ease-out_infinite] [animation-delay:0.55s]"
                    style={{ border: `2px solid ${current.color}` }}
                  />
                  <div className={`w-20 h-20 rounded-2xl ${current.iconBg} ring-1 ${current.iconRing} flex items-center justify-center transition-all duration-300 m-[0.125rem]`}>
                    <Icon className={`w-10 h-10 ${current.accent}`} strokeWidth={1.7} />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-8 pb-6">
                <h3 className="text-2xl font-extrabold tracking-[-0.02em] text-[var(--avd-fg)] mb-3 leading-[1.2]">
                  {current.title}
                </h3>
                <p className="text-sm text-[var(--avd-fg-muted)] leading-[1.6] font-medium">
                  {current.description}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--avd-border-soft)] flex items-center justify-between gap-2 bg-[var(--avd-bg-sunken)] shrink-0">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="avd-btn"
              >
                <ChevronLeft className="w-[0.8125rem] h-[0.8125rem]" />
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
                className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-[var(--avd-radius-sm)] border text-sm font-bold transition-all ${current.nextBg}`}
              >
                {isLast ? "¡Entendido!" : "Siguiente"}
                {!isLast && <ChevronRight className="w-[0.8125rem] h-[0.8125rem]" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
