import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  mode?: "floating" | "inline";
  className?: string;
  buttonClassName?: string;
}

export function ThemeToggle({ mode = "floating", className, buttonClassName }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = useMemo(() => resolvedTheme ?? theme ?? "dark", [resolvedTheme, theme]);

  if (!mounted) {
    return null;
  }

  const isDark = activeTheme === "dark";

  const toggleButton = (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn(
        "group avd-btn p-0",
        mode === "inline"
          ? "avd-btn-icon h-8 w-8 rounded-md shadow-none"
          : "h-11 w-11 rounded-xl shadow-[var(--avd-shadow-md)]",
        buttonClassName,
      )}
    >
      {isDark ? <Sun className="h-4 w-4 transition-transform duration-200 group-hover:rotate-6" /> : <Moon className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-6" />}
    </button>
  );

  if (mode === "inline") {
    return <div className={cn("pointer-events-auto", className)}>{toggleButton}</div>;
  }

  return createPortal(
    <div 
      className={cn("pointer-events-auto fixed right-4 z-[90] md:right-6", className)}
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      {toggleButton}
    </div>,
    document.body,
  );
}
