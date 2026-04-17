import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Send, CheckCircle2 } from "lucide-react";

interface VoteSubmitAnimationProps {
  /** Whether the animation should be shown */
  isVisible: boolean;
  /** Called when the full animation has completed */
  onComplete: () => void;
  /** The vote hash code to display at the end (e.g. "VT-A3F2-8K1D") */
  voteHash?: string;
}

const STEPS = [
  {
    icon: Lock,
    text: "Encriptando tu voto...",
    subtext: "Protegiendo tu selección con cifrado",
    duration: 1200,
    color: "text-primary",
    glowColor: "shadow-[0_0_46px_-16px_rgba(0,74,198,0.6)]",
  },
  {
    icon: Send,
    text: "Enviando al servidor seguro...",
    subtext: "Transmisión segura en curso",
    duration: 1500,
    color: "text-sky-500 dark:text-sky-300",
    glowColor: "shadow-[0_0_46px_-16px_rgba(14,165,233,0.55)]",
  },
  {
    icon: CheckCircle2,
    text: "¡Voto registrado!",
    subtext: "",
    duration: 2000,
    color: "text-emerald-600 dark:text-emerald-300",
    glowColor: "shadow-[0_0_46px_-16px_rgba(16,185,129,0.55)]",
  },
];

export function VoteSubmitAnimation({
  isVisible,
  onComplete,
  voteHash,
}: VoteSubmitAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setProgress(0);
    setShowConfetti(false);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      reset();
      return;
    }

    let stepIndex = 0;
    let progressInterval: ReturnType<typeof setInterval>;

    const advanceStep = () => {
      if (stepIndex >= STEPS.length) {
        return;
      }

      setCurrentStep(stepIndex);
      setProgress(0);

      const duration = STEPS[stepIndex].duration;
      const increment = 100 / (duration / 30);
      let currentProgress = 0;

      progressInterval = setInterval(() => {
        currentProgress += increment;
        if (currentProgress >= 100) {
          currentProgress = 100;
          clearInterval(progressInterval);

          stepIndex++;
          if (stepIndex < STEPS.length) {
            setTimeout(() => advanceStep(), 200);
          } else {
            // Final step done
            setShowConfetti(true);
            setTimeout(() => onComplete(), 2000);
          }
        }
        setProgress(Math.min(currentProgress, 100));
      }, 30);
    };

    // Start after a tiny delay for the dialog to render
    const startTimeout = setTimeout(() => advanceStep(), 200);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(progressInterval);
    };
  }, [isVisible, onComplete, reset]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isVisible} modal>
      <DialogContent
        className="sm:max-w-sm rounded-[1.75rem] border border-outline-variant/60 bg-surface-container-lowest/96 backdrop-blur-xl dark:border-outline-variant/70 dark:bg-surface-container-low/94"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide the close button
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="py-6 text-center">
          {/* Animated icon */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            {/* Glow ring */}
            <div
              className={`absolute inset-0 rounded-full opacity-30 animate-ping ${step.glowColor}`}
              style={{ animationDuration: "1.5s" }}
            />
            {/* Icon container */}
            <div
              className={`relative w-24 h-24 rounded-full bg-muted flex items-center justify-center transition-all duration-500 ${
                showConfetti ? "scale-110" : "scale-100"
              }`}
            >
              <Icon
                className={`w-12 h-12 ${step.color} transition-all duration-500`}
              />
            </div>
          </div>

          {/* Text */}
          <h3
            className={`text-xl font-bold mb-2 transition-all duration-300 ${
              showConfetti ? "text-emerald-600 dark:text-emerald-300" : ""
            }`}
          >
            {step.text}
          </h3>
          {step.subtext && (
            <p className="text-sm text-muted-foreground mb-4">{step.subtext}</p>
          )}

          {/* Progress bar */}
          {!showConfetti && (
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-4">
              <div
                className={`h-full rounded-full transition-all duration-100 ${
                  currentStep === 0
                    ? "bg-primary"
                    : currentStep === 1
                    ? "bg-sky-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Vote hash display */}
          {showConfetti && voteHash && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="text-xs text-muted-foreground mb-1">
                Tu código de verificación:
              </p>
              <p className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-300">
                {voteHash}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Guarda este código para verificar tu voto
              </p>
            </div>
          )}

          {/* Confetti particles (CSS-only) */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-bounce"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    top: `${Math.random() * 60}%`,
                    backgroundColor: [
                      "#10B981",
                      "#3B82F6",
                      "#F59E0B",
                      "#EF4444",
                      "#8B5CF6",
                      "#EC4899",
                    ][i % 6],
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${0.5 + Math.random() * 1}s`,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
