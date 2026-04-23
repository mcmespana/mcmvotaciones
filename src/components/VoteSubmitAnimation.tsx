import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Lock, Send, CheckCircle2 } from "lucide-react";
import confetti from "canvas-confetti";

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

function fireCannonConfetti() {
  const duration = 1400;
  const end = Date.now() + duration;

  const colors = ["#10B981", "#34D399", "#6EE7B7", "#3B82F6", "#F59E0B", "#EC4899", "#8B5CF6", "#ffffff"];

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
      gravity: 0.9,
      scalar: 1.1,
      drift: 0.1,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
      gravity: 0.9,
      scalar: 1.1,
      drift: -0.1,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

export function VoteSubmitAnimation({
  isVisible,
  onComplete,
}: VoteSubmitAnimationProps) {
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
            setShowConfetti(true);
            setTimeout(() => onComplete(), 2000);
          }
        }
        setProgress(Math.min(currentProgress, 100));
      }, 30);
    };

    const startTimeout = setTimeout(() => advanceStep(), 200);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(progressInterval);
    };
  }, [isVisible, onComplete, reset]);

  useEffect(() => {
    if (showConfetti && !confettiFired.current) {
      confettiFired.current = true;
      fireCannonConfetti();
    }
  }, [showConfetti]);

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isVisible} modal>
      <DialogContent
        className="sm:max-w-sm rounded-[1.75rem] border border-outline-variant/60 bg-surface-container-lowest dark:border-outline-variant/70 dark:bg-surface-container-low"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="py-6 text-center">
          {/* Animated icon */}
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div
              className={`absolute inset-0 rounded-full opacity-30 animate-ping ${step.glowColor}`}
              style={{ animationDuration: "1.5s" }}
            />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
