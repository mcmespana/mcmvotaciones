# 003 · Quitar el "glow" y las sombras de color

**Superficie:** global · **Riesgo:** bajo · **Depende de:** nada

## Contexto

`src/index.css` define `--primary-glow`, `--accent-glow`, `--shadow-primary`,
`--shadow-accent` y la animación `animate-pulse-glow` (`@keyframes pulse-glow`), que hace
latir una sombra de color en bucle.

`design.md` §5.4: una sombra de color no es elevación, es neón. Y §3.4: la única animación
en bucle aceptable es la que dice "esto sigue trabajando". Una que solo brilla, no.

## Qué hacer

1. Localizar los usos:
   ```bash
   grep -rn "primary-glow\|accent-glow\|shadow-primary\|shadow-accent\|pulse-glow" src
   ```
2. Para cada uso:
   - Si servía como **elevación** → `box-shadow: var(--avd-shadow-md)`.
   - Si servía para **señalar foco o selección** → anillo:
     `box-shadow: 0 0 0 2px var(--avd-brand)` o `outline: 2px solid var(--avd-brand)`.
   - Si servía para **decorar** → borrar sin sustituto.
   - Si `animate-pulse-glow` marcaba **"votación en curso"**, sustituir por un indicador que
     se lea: punto + texto ("Votación abierta"), no un brillo (§3.1: el color nunca es la
     única señal).
3. Borrar los tokens y el `@keyframes pulse-glow`.

## Qué NO tocar

`src/components/projection/` si el brillo ahí es lo que hace legible un elemento a diez
metros — la proyección es el único sitio donde el contraste puro manda sobre la sobriedad.
Si conservas alguno, deja un comentario de una línea diciendo por qué.

## Validación

`npm run build`. Recorrer en claro y oscuro; comprobar que nada que antes se distinguía por
el brillo ha quedado indistinguible.
