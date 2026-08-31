# 004 · Cuatro familias por CDN → dos autoalojadas

**Superficie:** global · **Riesgo:** alto (cambia la cara de la app) · **Requiere visto bueno humano**

## Contexto

`src/index.css` empieza con:

```css
@import url('https://fonts.googleapis.com/css2?family=Catamaran:…&family=Inter:…&family=JetBrains+Mono:…&family=Plus+Jakarta+Sans:…&display=swap');
```

Cuatro familias, desde un CDN de terceros, en un `@import` de CSS —que es **bloqueante y en
serie**: el navegador tiene que descargar y parsear `index.css` antes de saber siquiera que
tiene que pedir las fuentes. Contra `design.md` §3.2, §5.10 y §5.11.

Peso extra: la app se usa en asambleas, a veces con la wifi del local saturada por cien
móviles a la vez. Es exactamente el escenario donde esto se nota.

**Este plan cambia la cara de la app. No lo ejecutes sin confirmación explícita.**

## Qué hacer

1. `npm i @fontsource-variable/figtree @fontsource-variable/bricolage-grotesque @fontsource-variable/jetbrains-mono`
2. Sustituir el `@import url(...)` de Google por los tres `@import` de Fontsource al
   principio de `src/index.css`.
3. `--avd-font-sans: 'Figtree Variable', system-ui, sans-serif`;
   añadir `--avd-font-display: 'Bricolage Grotesque Variable', var(--avd-font-sans)`;
   `--avd-font-mono` se queda con JetBrains Mono.
4. `body { font-family: var(--avd-font-sans) }` (hoy dice `'Inter', 'Segoe UI', sans-serif`).
5. `h1, h2 { font-family: var(--avd-font-display) }`, y **solo** en tamaños ≥24 px (§3.2).
6. Barrer los restos: `grep -rn "Catamaran\|Plus Jakarta\|'Inter'" src`.
7. **Revisar la proyección aparte.** Es la superficie donde la letra se lee a diez metros:
   comprueba con capturas a tamaño real que Figtree/Bricolage aguantan, y si no, deja
   documentado qué familia usa la proyección y por qué.

## Validación

`npm run build`. Comprobar en la pestaña de red que no sale ninguna petición a
`fonts.googleapis.com` ni a `fonts.gstatic.com`. Capturas antes/después de: página de voto en
móvil, tutorial, proyección a tamaño de sala, y panel de administración (densidad: las filas
no deben crecer). Comprobar el modo Visión+ con la tipografía nueva.
