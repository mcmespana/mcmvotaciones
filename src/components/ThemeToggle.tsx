import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
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

  return (
    <div className="fixed bottom-4 right-4 z-[60] md:bottom-6 md:right-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        className="h-11 w-11 border-blue-300/65 bg-white/85 text-slate-700 shadow-[0_18px_40px_-26px_rgba(37,99,235,0.75)] backdrop-blur-md transition-all duration-200 hover:border-blue-400/70 hover:bg-white dark:border-blue-500/30 dark:bg-slate-900/80 dark:text-blue-100 dark:hover:border-blue-400/45 dark:hover:bg-slate-900"
      >
        {isDark ? <Sun className="h-5 w-5 transition-transform duration-200 group-hover:rotate-6" /> : <Moon className="h-5 w-5 transition-transform duration-200 group-hover:-rotate-6" />}
      </Button>
    </div>
  );
}
