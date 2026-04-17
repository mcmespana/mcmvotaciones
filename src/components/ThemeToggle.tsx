import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn(
        "group h-11 w-11 border-outline-variant/60 bg-surface-container-lowest/92 text-foreground shadow-tech backdrop-blur-md transition-all duration-200 hover:border-outline/70 hover:bg-surface-container-lowest dark:border-outline-variant/70 dark:bg-surface-container-low/90 dark:hover:bg-surface-container",
        buttonClassName,
      )}
    >
      {isDark ? <Sun className="h-5 w-5 transition-transform duration-200 group-hover:rotate-6" /> : <Moon className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-6" />}
    </Button>
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
