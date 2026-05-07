import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { AccessibilityToggle } from "@/components/shared/AccessibilityToggle";
import { cn } from "@/lib/utils";

interface HeaderControlsProps {
  mode?: "floating" | "inline";
  className?: string;
}

export function HeaderControls({ mode = "inline", className }: HeaderControlsProps) {
  if (mode === "floating") {
    return (
      <>
        <AccessibilityToggle mode="floating" />
        <ThemeToggle mode="floating" />
      </>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 pointer-events-auto", className)}>
      <AccessibilityToggle mode="inline" />
      <ThemeToggle mode="inline" />
    </div>
  );
}
