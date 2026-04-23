import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, MousePointerClick, Shield, Send, HelpCircle } from "lucide-react";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Selecciona candidatos",
    description:
      "Pulsa sobre las tarjetas de los candidatos que quieres votar. Puedes seleccionar hasta el máximo indicado.",
    color: "text-primary",
    bgColor: "bg-primary-fixed",
  },
  {
    icon: CheckCircle2,
    title: "Revisa tu selección",
    description:
      "Puedes cambiar tu selección en cualquier momento antes de confirmar. Los candidatos seleccionados se marcan con un borde y un ✓.",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Send,
    title: "Confirma tu voto",
    description:
      'Cuando estés seguro, pulsa el botón "Votar" para enviar tu selección. Una vez confirmado, no podrás cambiar tu voto.',
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    icon: Shield,
    title: "Voto seguro y anónimo",
    description:
      "Tu voto es completamente anónimo. Se encripta antes de enviarse y recibirás un código de verificación.",
    color: "text-primary-container",
    bgColor: "bg-primary-fixed",
  },
];

interface VotingTutorialProps {
  /** Force open even if already seen */
  forceOpen?: boolean;
  /** Round identifier to persist first-visit state per voting round */
  roundId?: string;
  /** Use compact icon-only trigger, useful in tight headers */
  compactTrigger?: boolean;
}

const TUTORIAL_KEY = "mcm_voting_tutorial_seen";

function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === "1";
  } catch {
    return false;
  }
}

function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, "1");
  } catch {
    // Ignore storage issues.
  }
}

export function VotingTutorial({ forceOpen, roundId, compactTrigger = false }: VotingTutorialProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    // Show tutorial on first visit (once per device)
    if (!hasSeenTutorial()) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    setOpen(false);
    setStep(0);
    markTutorialSeen();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <>
      {/* "¿Cómo votar?" button — always visible */}
      {compactTrigger ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 shrink-0 rounded-xl border border-outline-variant/55 bg-surface-container-low px-0 hover:bg-surface-container dark:border-outline-variant/65 dark:bg-surface-container"
          onClick={() => {
            setStep(0);
            setOpen(true);
          }}
          aria-label="Abrir guía de votación"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            setStep(0);
            setOpen(true);
          }}
        >
          <HelpCircle className="w-4 h-4 mr-1" />
          ¿Cómo votar?
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-md overflow-hidden rounded-[2rem] border border-outline-variant/60 bg-surface-container-lowest p-0 shadow-tech dark:border-outline-variant/70 dark:bg-surface-container-low">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-fixed via-surface-container-lowest to-primary-fixed/70 px-6 pb-5 pt-6 dark:from-primary-fixed/60 dark:via-surface-container-low dark:to-primary-fixed/45">
            <div className="absolute -left-10 -top-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
            <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-primary-container/20 blur-2xl" />

            {/* Progress dots */}
            <div className="relative z-10 flex justify-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-primary"
                    : i < step
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
            </div>

            <div className={`relative z-10 mx-auto mt-6 flex h-20 w-20 items-center justify-center rounded-3xl ${current.bgColor} shadow-[0_18px_26px_-18px_rgba(37,99,235,0.8)]`}>
              <Icon className={`h-10 w-10 ${current.color}`} />
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-6 text-center">
            <h3 className="font-headline text-4xl font-extrabold tracking-tight text-foreground sm:text-[2.4rem]">{current.title}</h3>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {current.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between border-t border-outline-variant/45 px-6 pb-6 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={step === 0}
              className="min-w-[80px]"
            >
              Anterior
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground"
            >
              Saltar
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleNext}
              className="min-w-[80px]"
            >
              {step === STEPS.length - 1 ? "¡Entendido!" : "Siguiente"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
