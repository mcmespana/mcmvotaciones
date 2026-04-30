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
    topBar: "from-red-500/80 via-red-400/50 to-red-500/20",
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
    topBar: "from-emerald-500/80 via-emerald-400/50 to-emerald-500/20",
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
    topBar: "from-yellow-500/80 via-yellow-400/50 to-yellow-500/20",
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
    topBar: "from-blue-500/80 via-blue-400/50 to-blue-500/20",
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
        className="avd-btn avd-btn-icon"
        title="¿Cómo votar?"
        style={compactTrigger ? {} : { width: "auto", padding: "0 10px", gap: 6 }}
      >
        <HelpCircle style={{ width: 14, height: 14 }} />
        {!compactTrigger && <span>¿Cómo votar?</span>}
      </button>

      {open && (
        <div
          className="avd-dialog-overlay"
          style={{ zIndex: 110 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="avd-dialog"
            style={{ maxWidth: 420, padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className={`h-1 w-full bg-gradient-to-r ${current.topBar} transition-all duration-500`} />

            {/* Icon area */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "32px 32px 24px" }}>
              {/* Step dots */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                className={`w-20 h-20 rounded-2xl ${current.iconBg} ring-1 ${current.iconRing} flex items-center justify-center transition-all duration-300`}
              >
                <Icon className={`w-10 h-10 ${current.accent}`} strokeWidth={1.7} />
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: "0 32px 24px" }}>
              <h3
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: "var(--avd-fg)",
                  marginBottom: 12,
                  lineHeight: 1.2,
                }}
              >
                {current.title}
              </h3>
              <p style={{ fontSize: 14, color: "var(--avd-fg-muted)", lineHeight: 1.6, fontWeight: 500 }}>
                {current.description}
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 24px",
                borderTop: "1px solid var(--avd-border-soft)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                background: "var(--avd-bg-sunken)",
              }}
            >
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="avd-btn"
              >
                <ChevronLeft style={{ width: 13, height: 13 }} />
                Anterior
              </button>

              <button
                onClick={handleClose}
                className="avd-btn avd-btn-ghost"
              >
                <X style={{ width: 12, height: 12 }} />
                Saltar
              </button>

              <button
                onClick={handleNext}
                className={`inline-flex items-center gap-1.5 h-8 px-4 rounded-[var(--avd-radius-sm)] border text-[13px] font-bold transition-all ${current.nextBg}`}
              >
                {isLast ? "¡Entendido!" : "Siguiente"}
                {!isLast && <ChevronRight style={{ width: 13, height: 13 }} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
