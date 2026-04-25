import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Send, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

interface VoteSubmitAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  voteHash?: string;
}

const STEPS = [
  {
    icon: Lock,
    text: "Cifrando tu voto...",
    subtext: "Protegemos tu selección antes de enviarla",
    duration: 1100,
    iconColor: "text-primary",
    ringColor: "ring-primary/30",
    bgColor: "bg-primary/10",
    barColor: "bg-primary",
    glowColor: "0 0 38px -14px hsl(var(--primary) / 0.45)",
    topBarColor: "hsl(var(--primary))",
  },
  {
    icon: Send,
    text: "Enviando voto de forma segura...",
    subtext: "Conexión verificada con el servidor",
    duration: 1300,
    iconColor: "text-sky-500 dark:text-sky-300",
    ringColor: "ring-sky-500/30",
    bgColor: "bg-sky-500/10",
    barColor: "bg-sky-500",
    glowColor: "0 0 38px -14px rgba(14,165,233,0.45)",
    topBarColor: "#0ea5e9",
  },
  {
    icon: CheckCircle2,
    text: "Voto registrado",
    subtext: "Tu participación quedó guardada correctamente",
    duration: 1900,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    ringColor: "ring-emerald-500/30",
    bgColor: "bg-emerald-500/10",
    barColor: "bg-emerald-500",
    glowColor: "0 0 38px -14px rgba(16,185,129,0.45)",
    topBarColor: "#10b981",
  },
];

const CONFETTI_COLORS = [
  "#3b82f6", // azul
  "#ef4444", // rojo
  "#facc15", // amarillo
  "#22c55e", // verde
];

function fireCannonConfetti() {
  const duration = 1600;
  const end = Date.now() + duration;

  const burst = (origin: { x: number; y: number }, angle: number) =>
    confetti({
      particleCount: 2,
      angle,
      spread: 55,
      origin,
      colors: CONFETTI_COLORS,
      gravity: 0.92,
      scalar: 0.92,
      drift: angle > 90 ? -0.15 : 0.15,
      ticks: 190,
    });

  const frame = () => {
    burst({ x: 0, y: 0.7 }, 60);
    burst({ x: 1, y: 0.7 }, 120);
    if (Date.now() < end) requestAnimationFrame(frame);
  };

  confetti({
    particleCount: 38,
    spread: 72,
    origin: { x: 0.5, y: 0.55 },
    colors: CONFETTI_COLORS,
    gravity: 0.95,
    scalar: 1,
    ticks: 220,
  });

  setTimeout(() => frame(), 150);
}

export function VoteSubmitAnimation({ isVisible, onComplete }: VoteSubmitAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiFired = useRef(false);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setProgress(0);
    setShowConfetti(false);
    confettiFired.current = false;
  }, []);

  useEffect(() => {
    if (!isVisible) { reset(); return; }

    let stepIndex = 0;
    let progressInterval: ReturnType<typeof setInterval>;

    const advanceStep = () => {
      if (stepIndex >= STEPS.length) return;
      setCurrentStep(stepIndex);
      setProgress(0);

      const duration = STEPS[stepIndex].duration;
      const increment = 100 / (duration / 30);
      let cur = 0;

      progressInterval = setInterval(() => {
        cur += increment;
        if (cur >= 100) {
          cur = 100;
          clearInterval(progressInterval);
          stepIndex++;
          if (stepIndex < STEPS.length) {
            setTimeout(() => advanceStep(), 200);
          } else {
            setShowConfetti(true);
            setTimeout(() => onComplete(), 2200);
          }
        }
        setProgress(Math.min(cur, 100));
      }, 30);
    };

    const t = setTimeout(() => advanceStep(), 200);
    return () => { clearTimeout(t); clearInterval(progressInterval); };
  }, [isVisible, onComplete, reset]);

  useEffect(() => {
    if (showConfetti && !confettiFired.current) {
      confettiFired.current = true;
      fireCannonConfetti();
    }
  }, [showConfetti]);

  useEffect(() => {
    if (!isVisible) return;
    const block = (e: KeyboardEvent) => { if (e.key === "Escape") e.preventDefault(); };
    document.addEventListener("keydown", block, true);
    return () => document.removeEventListener("keydown", block, true);
  }, [isVisible]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  const topBarColor = showConfetti ? "#10b981" : step.topBarColor;

  return (
    <>
      {/* Solid dark overlay behind dialog */}
      <div
        className="pointer-events-none fixed inset-0 z-[49] backdrop-blur-[2px] transition-opacity duration-300"
        style={{ background: "rgba(2, 6, 23, 0.62)" }}
      />

      {/* Centered dialog */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <div
          style={{
            background: "var(--avd-surface)",
            border: "1px solid var(--avd-border)",
            borderRadius: "var(--avd-radius-lg)",
            boxShadow: "var(--avd-shadow-lg)",
            maxWidth: 384,
            width: "100%",
            overflow: "hidden",
          }}
        >
          {/* Top color bar */}
          <div
            style={{
              height: 4,
              width: "100%",
              background: topBarColor,
              transition: "background 500ms",
            }}
          />

          {/* Content */}
          <div style={{ background: "var(--avd-surface)" }}>
            <div style={{ padding: "32px", textAlign: "center" }}>
              {/* Icon bubble */}
              <div className="relative mx-auto mb-6 w-28 h-28">
                <div
                  className={`absolute inset-0 rounded-full ${step.ringColor} ring-1 animate-ping opacity-40`}
                  style={{ animationDuration: "1.4s" }}
                />
                <div
                  className={`relative w-28 h-28 rounded-full ${step.bgColor} ring-1 ${step.ringColor} flex items-center justify-center transition-all duration-500 ${showConfetti ? "scale-110" : "scale-100"}`}
                  style={{ boxShadow: step.glowColor }}
                >
                  <Icon
                    className={`w-14 h-14 ${step.iconColor} transition-all duration-500 ${showConfetti ? "scale-110" : ""}`}
                    strokeWidth={1.6}
                  />
                </div>
              </div>

              {/* Text */}
              <h3 className={`text-xl font-bold mb-2 tracking-tight transition-colors duration-300 ${showConfetti ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                {step.text}
              </h3>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 mb-2">
                Paso {Math.min(currentStep + 1, STEPS.length)} de {STEPS.length}
              </p>
              {step.subtext && <p className="text-sm text-muted-foreground mb-1">{step.subtext}</p>}

              {/* Progress bar */}
              <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {!showConfetti ? (
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${step.barColor}`}
                    style={{ width: `${progress}%` }}
                  />
                ) : (
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: "100%" }}
                  />
                )}
              </div>

              {/* Step dots */}
              <div className="flex items-center justify-center gap-2 mt-4">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i < currentStep || showConfetti
                        ? "w-4 h-1.5 bg-emerald-500"
                        : i === currentStep
                        ? "w-4 h-1.5 bg-primary"
                        : "w-1.5 h-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
