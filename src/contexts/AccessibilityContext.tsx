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
    } catch { /* modo privado: el ajuste no se recuerda, pero funciona */ }
  }, [visionPlus]);

  /*
   * Visión+ escala la RAÍZ, no clase por clase.
   *
   * Tiene que ser `documentElement`: `rem` se mide siempre contra `html`,
   * así que poner `font-size` en un contenedor no movería ni un `text-sm`.
   * El tamaño vive en `src/styles/vision-plus.css` (`html.vision-plus`) y no
   * aquí, para que pueda tener su media query en pantallas estrechas; desde
   * JS solo se enciende y se apaga la clase.
   *
   * El div de abajo conserva el atributo porque quedan un par de reglas de
   * reflujo que cuelgan de él, y porque marca en el DOM qué parte de la app
   * está en este modo.
   *
   * Que solo lo envuelvan las rutas de votante es lo que mantiene fuera a
   * `/admin` y `/proyeccion`: allí no hay proveedor, así que nunca se llama.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("vision-plus", visionPlus);
    return () => root.classList.remove("vision-plus");
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
