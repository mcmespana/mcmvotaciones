import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2, MousePointerClick, Shield, Send, HelpCircle } from "lucide-react";

const TUTORIAL_SEEN_KEY = "mcm_voting_tutorial_seen";

const STEPS = [
  {
    icon: MousePointerClick,
    title: "Selecciona candidatos",
    description:
      "Pulsa sobre las tarjetas de los candidatos que quieres votar. Puedes seleccionar hasta el máximo indicado.",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
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
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

interface VotingTutorialProps {
  /** Force open even if already seen */
  forceOpen?: boolean;
}

export function VotingTutorial({ forceOpen }: VotingTutorialProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (forceOpen) {
      setOpen(true);
      setStep(0);
      return;
    }
    // Show tutorial on first visit
    const seen = localStorage.getItem(TUTORIAL_SEEN_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, [forceOpen]);

  const handleClose = () => {
    setOpen(false);
    setStep(0);
    localStorage.setItem(TUTORIAL_SEEN_KEY, new Date().toISOString());
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

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 pt-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "bg-primary w-6"
                    : i < step
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className="px-8 py-6 text-center">
            <div
              className={`w-20 h-20 mx-auto mb-5 rounded-2xl ${current.bgColor} flex items-center justify-center transition-all duration-300`}
            >
              <Icon className={`w-10 h-10 ${current.color}`} />
            </div>
            <h3 className="text-xl font-bold mb-3">{current.title}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {current.description}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-8 pb-6">
            <Button
              variant="ghost"
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
