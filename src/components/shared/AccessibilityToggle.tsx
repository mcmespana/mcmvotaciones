import { createPortal } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { cn } from "@/lib/utils";

interface AccessibilityToggleProps {
  mode?: "floating" | "inline";
  className?: string;
  buttonClassName?: string;
}

export function AccessibilityToggle({ mode = "floating", className, buttonClassName }: AccessibilityToggleProps) {
  const { visionPlus, toggleVisionPlus } = useAccessibility();

  const label = visionPlus ? "Desactivar visión ampliada" : "Activar visión ampliada";

  const toggleButton = (
    <button
      type="button"
      onClick={toggleVisionPlus}
      aria-pressed={visionPlus}
      aria-label={label}
      className={cn(
        "group avd-btn",
        mode === "inline"
          ? "avd-btn-icon w-[42px] h-[42px] shrink-0"
          : "h-11 w-11 rounded-xl shadow-[var(--avd-shadow-md)]",
        visionPlus && "bg-[var(--avd-brand-bg)] border-[var(--avd-brand-border)] text-[var(--avd-brand)]",
        buttonClassName,
      )}
    >
      {visionPlus
        ? <EyeOff className="h-5 w-5 transition-transform duration-200 group-hover:scale-90" />
        : <Eye className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />}
    </button>
  );

  if (mode === "inline") {
    return <div className={cn("pointer-events-auto", className)}>{toggleButton}</div>;
  }

  return createPortal(
    <div
      className={cn(
        "pointer-events-auto fixed z-[90] right-[calc(1rem+52px)] md:right-[calc(1.5rem+52px)] bottom-[calc(1rem+env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {toggleButton}
    </div>,
    document.body,
  );
}
