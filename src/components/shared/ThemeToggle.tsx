import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Monitor, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  mode?: "floating" | "inline";
  className?: string;
  buttonClassName?: string;
}

const NEXT: Record<string, string> = { light: "dark", dark: "system", system: "light" };
const LABELS: Record<string, string> = {
  light: "Cambiar a modo oscuro",
  dark: "Cambiar a modo automático (dispositivo)",
  system: "Cambiar a modo claro",
};

export function ThemeToggle({ mode = "floating", className, buttonClassName }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const current = theme ?? "light";
  const next = NEXT[current] ?? "dark";

  // Icon shows where you'll go on click
  const icon = current === "light"
    ? <Moon className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-6" />
    : current === "dark"
    ? <Monitor className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
    : <Sun className="h-5 w-5 transition-transform duration-200 group-hover:rotate-6" />;

  const toggleButton = (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={LABELS[current] ?? "Cambiar tema"}
      className={cn(
        "group avd-btn",
        mode === "inline"
          ? "avd-btn-icon w-[42px] h-[42px] shrink-0"
          : "h-11 w-11 rounded-xl shadow-[var(--avd-shadow-md)]",
        buttonClassName,
      )}
    >
      {icon}
    </button>
  );

  if (mode === "inline") {
    return <div className={cn("pointer-events-auto", className)}>{toggleButton}</div>;
  }

  return createPortal(
    <div
      className={cn("pointer-events-auto fixed right-4 z-[90] md:right-6", className)}
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}{/* dynamic: env() safe-area cannot be expressed in Tailwind */}
    >
      {toggleButton}
    </div>,
    document.body,
  );
}
