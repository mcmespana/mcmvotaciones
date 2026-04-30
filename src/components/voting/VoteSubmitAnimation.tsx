import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Send, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

interface VoteSubmitAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
  voteHash?: string;
}

// Same 4 colors as VotingTutorial (red, emerald, yellow, blue)
const TUTORIAL_COLORS = {
  red: "#ef4444",
  emerald: "#10b981",
  yellow: "#eab308",
  blue: "#3b82f6",
} as const;

const CONFETTI_COLORS = [
  TUTORIAL_COLORS.red,
  TUTORIAL_COLORS.emerald,
  TUTORIAL_COLORS.yellow,
  TUTORIAL_COLORS.blue,
];

const STEPS = [
  {
    icon: Lock,
    text: "Cifrando tu voto...",
    subtext: "Protegemos tu selección antes de enviarla",
    duration: 1100,
    color: TUTORIAL_COLORS.red,
    iconColor: "text-red-600 dark:text-red-400",
    ringColor: "ring-red-500/25",
    bgColor: "bg-red-500/10",
    barColor: "bg-red-500",
    glow: "0 0 50px -12px rgba(239,68,68,0.55)",
    topBar: "linear-gradient(90deg, rgba(239,68,68,0.85), rgba(248,113,113,0.55), rgba(239,68,68,0.2))",
    dotActive: "bg-red-500",
    accentText: "text-red-600 dark:text-red-400",
  },
  {
    icon: Send,
    text: "Enviando voto de forma segura...",
    subtext: "Conexión verificada con el servidor",
    duration: 1300,
    color: TUTORIAL_COLORS.yellow,
    iconColor: "text-yellow-600 dark:text-yellow-400",
    ringColor: "ring-yellow-500/25",
    bgColor: "bg-yellow-500/10",
    barColor: "bg-yellow-500",
    glow: "0 0 50px -12px rgba(234,179,8,0.55)",
    topBar: "linear-gradient(90deg, rgba(234,179,8,0.85), rgba(250,204,21,0.55), rgba(234,179,8,0.2))",
    dotActive: "bg-yellow-500",
    accentText: "text-yellow-600 dark:text-yellow-400",
  },
  {
    icon: CheckCircle2,
    text: "¡Voto registrado!",
    subtext: "Tu participación quedó guardada correctamente",
    duration: 1900,
    color: TUTORIAL_COLORS.emerald,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    ringColor: "ring-emerald-500/25",
    bgColor: "bg-emerald-500/10",
    barColor: "bg-emerald-500",
    glow: "0 0 60px -10px rgba(16,185,129,0.6)",
    topBar: "linear-gradient(90deg, rgba(16,185,129,0.85), rgba(52,211,153,0.55), rgba(16,185,129,0.2))",
    dotActive: "bg-emerald-500",
    accentText: "text-emerald-600 dark:text-emerald-400",
  },
];

// Equal confetti per color: one burst per color, same particle count.
function fireBalancedConfetti() {
  const PER_COLOR = 28;

  const fireFromOrigin = (origin: { x: number; y: number }, angle: number, scalar = 1) => {
    CONFETTI_COLORS.forEach((c, i) => {
      setTimeout(() => {
        confetti({
          particleCount: PER_COLOR,
          angle,
          spread: 70,
          origin,
          colors: [c],
          gravity: 0.95,
          scalar,
          ticks: 230,
          startVelocity: 42,
        });
      }, i * 60);
    });
  };

  // Center burst
  fireFromOrigin({ x: 0.5, y: 0.55 }, 90, 1.05);
  // Side cannons (delayed)
  setTimeout(() => fireFromOrigin({ x: 0.05, y: 0.7 }, 60, 0.9), 250);
  setTimeout(() => fireFromOrigin({ x: 0.95, y: 0.7 }, 120, 0.9), 250);

  // Continuous trickle 1.2s, cycling colors evenly
  const end = Date.now() + 1200;
  let i = 0;
  const trickle = () => {
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    i++;
    confetti({
      particleCount: 3,
      angle: 60 + Math.random() * 60,
      spread: 60,
      origin: { x: Math.random(), y: 0.6 },
      colors: [color],
      gravity: 0.9,
      scalar: 0.85,
      ticks: 200,
    });
    if (Date.now() < end) setTimeout(trickle, 90);
  };
  setTimeout(trickle, 600);
}

export function VoteSubmitAnimation({ isVisible, onComplete }: VoteSubmitAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [iconKey, setIconKey] = useState(0); // re-mount to retrigger anim
  const confettiFired = useRef(false);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setProgress(0);
    setShowConfetti(false);
    setIconKey(0);
    confettiFired.current = false;
  }, []);

  useEffect(() => {
    if (!isVisible) { reset(); return; }

    let stepIndex = 0;
    let progressInterval: ReturnType<typeof setInterval>;

    const advanceStep = () => {
      if (stepIndex >= STEPS.length) return;
      setCurrentStep(stepIndex);
      setIconKey((k) => k + 1);
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
            setTimeout(() => advanceStep(), 220);
          } else {
            setShowConfetti(true);
            setTimeout(() => onComplete(), 2400);
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
      fireBalancedConfetti();
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
  const isFinal = showConfetti;

  return (
    <>
      {/* Inline keyframes (scoped, one-shot dialog) */}
      <style>{`
        @keyframes vsa-pop {
          0%   { transform: scale(0.5) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(1.12) rotate(4deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes vsa-fade-up {
          0%   { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0);   opacity: 1; }
        }
        @keyframes vsa-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes vsa-float {
          0%,100% { transform: translateY(0) scale(1);   opacity: 0.6; }
          50%     { transform: translateY(-8px) scale(1.15); opacity: 1; }
        }
        @keyframes vsa-ring {
          0%   { transform: scale(0.85); opacity: 0.55; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes vsa-success-burst {
          0%   { transform: scale(0.4); opacity: 0; }
          50%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes vsa-dialog-in {
          0%   { transform: translateY(14px) scale(0.96); opacity: 0; }
          100% { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        .vsa-shimmer-bar {
          background-size: 200% 100%;
          animation: vsa-shimmer 1.6s linear infinite;
        }
      `}</style>

      {/* Overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[49] backdrop-blur-[3px] transition-opacity duration-300"
        style={{ background: "rgba(2, 6, 23, 0.66)" }}
      />

      {/* Dialog wrapper */}
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
            maxWidth: 420,
            width: "100%",
            overflow: "hidden",
            animation: "vsa-dialog-in 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {/* Top accent bar — gradient + shimmer */}
          <div
            className="vsa-shimmer-bar"
            style={{
              height: 4,
              width: "100%",
              backgroundImage: step.topBar,
              transition: "background-image 500ms",
            }}
          />

          <div style={{ padding: "32px", textAlign: "center" }}>
            {/* Step dots (tutorial style) */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 22 }}>
              {STEPS.map((s, i) => {
                const active = i === currentStep && !isFinal;
                const done = i < currentStep || isFinal;
                return (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      active
                        ? `w-6 h-2 ${s.dotActive}`
                        : done
                        ? `w-2 h-2 ${s.dotActive} opacity-60`
                        : "w-2 h-2 bg-muted-foreground/25"
                    }`}
                  />
                );
              })}
            </div>

            {/* Icon bubble — tutorial-style rounded-2xl + extras */}
            <div
              key={iconKey}
              className="relative mx-auto mb-6"
              style={{ width: 112, height: 112, animation: "vsa-pop 520ms cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              {/* Pulsing rings */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl"
                style={{
                  border: `2px solid ${step.color}`,
                  animation: "vsa-ring 1.6s ease-out infinite",
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-2xl"
                style={{
                  border: `2px solid ${step.color}`,
                  animation: "vsa-ring 1.6s ease-out infinite",
                  animationDelay: "0.55s",
                }}
              />

              {/* Bubble */}
              <div
                className={`relative w-28 h-28 rounded-2xl ${step.bgColor} ring-1 ${step.ringColor} flex items-center justify-center`}
                style={{
                  boxShadow: step.glow,
                  transition: "box-shadow 500ms, transform 500ms",
                  transform: isFinal ? "scale(1.06)" : "scale(1)",
                }}
              >
                <Icon
                  className={`w-14 h-14 ${step.iconColor}`}
                  strokeWidth={1.7}
                  style={{
                    animation: isFinal
                      ? "vsa-success-burst 600ms cubic-bezier(0.22, 1, 0.36, 1)"
                      : undefined,
                  }}
                />
              </div>
            </div>

            {/* Text — re-mount per step to fade-up */}
            <div key={`txt-${iconKey}`} style={{ animation: "vsa-fade-up 360ms ease-out" }}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 mb-2">
                Paso {Math.min(currentStep + 1, STEPS.length)} de {STEPS.length}
              </p>
              <h3
                className={`text-xl font-extrabold mb-2 tracking-tight ${step.accentText}`}
                style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
              >
                {step.text}
              </h3>
              {step.subtext && (
                <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.55 }}>
                  {step.subtext}
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${step.barColor} transition-all duration-75`}
                style={{
                  width: isFinal ? "100%" : `${progress}%`,
                  boxShadow: `0 0 10px ${step.color}`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
