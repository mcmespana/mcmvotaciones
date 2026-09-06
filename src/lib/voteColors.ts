/**
 * Paleta oficial de opciones de voto.
 *
 * La fuente son los tokens `--vote-color-*` de `src/index.css`; aquí solo hay
 * referencias. Para CSS (estilos en línea, clases) usa `VOTE_COLOR_CSS`. El
 * canvas de `canvas-confetti` no entiende `var()`, así que para él hay que
 * resolver el token en tiempo de ejecución con `resolveVoteColors()`.
 */

export type VoteColorName = "red" | "green" | "yellow" | "blue";

export const VOTE_COLOR_NAMES: readonly VoteColorName[] = ["red", "green", "yellow", "blue"];

export const VOTE_COLOR_CSS: Record<VoteColorName, string> = {
  red: "hsl(var(--vote-color-red))",
  green: "hsl(var(--vote-color-green))",
  yellow: "hsl(var(--vote-color-yellow))",
  blue: "hsl(var(--vote-color-blue))",
};

/** Respaldo si `getComputedStyle` no devuelve nada (SSR, pruebas): los mismos
 *  valores que `:root` en `src/index.css`. */
const FALLBACK: Record<VoteColorName, string> = {
  red: "hsl(0 84% 60%)",
  green: "hsl(142 71% 45%)",
  yellow: "hsl(45 93% 58%)",
  blue: "hsl(217 91% 60%)",
};

/** Resuelve los tokens a color literal, para APIs que pintan en canvas. */
export function resolveVoteColors(names: readonly VoteColorName[] = VOTE_COLOR_NAMES): string[] {
  if (typeof window === "undefined") return names.map((n) => FALLBACK[n]);
  const styles = getComputedStyle(document.documentElement);
  return names.map((n) => {
    const triplet = styles.getPropertyValue(`--vote-color-${n}`).trim();
    return triplet ? `hsl(${triplet})` : FALLBACK[n];
  });
}
