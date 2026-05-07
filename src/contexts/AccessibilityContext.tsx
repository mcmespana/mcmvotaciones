import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AccessibilityState {
  visionPlus: boolean;
  setVisionPlus: (v: boolean) => void;
  toggleVisionPlus: () => void;
}

const AccessibilityContext = createContext<AccessibilityState | null>(null);

export function useAccessibility(): AccessibilityState {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [visionPlus, setVisionPlusState] = useState(() => {
    try {
      return localStorage.getItem("mcm_vision_plus") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("mcm_vision_plus", visionPlus ? "1" : "0");
    } catch {}
  }, [visionPlus]);

  const setVisionPlus = (v: boolean) => setVisionPlusState(v);
  const toggleVisionPlus = () => setVisionPlusState((p) => !p);

  return (
    <AccessibilityContext.Provider value={{ visionPlus, setVisionPlus, toggleVisionPlus }}>
      <div data-vision-plus={visionPlus ? "on" : undefined} className="contents">
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
}
