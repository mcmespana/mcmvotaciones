# 006 · Subir Recharts a `^3`

**Superficie:** admin · **Riesgo:** medio · **Depende de:** nada

## Contexto

`mcmvotaciones` tiene `recharts: ^2.15.4` y `mcmbank` `^3.7.0`. Son las dos únicas apps
React de las cuatro y las dos hacen gráficas de resultados y analíticas, pero hoy **un
componente de gráfica no se puede copiar de una a otra**: la v3 cambió la API de varios
componentes y el sistema de temas.

`design.md` §3.9 fija Recharts como librería de las apps React; que estén en mayores
distintas convierte "reutiliza lo que ya existe" (§6.1) en una mentira.

## Qué hacer

1. Leer las notas de migración de Recharts 2 → 3 antes de tocar nada.
2. `npm i recharts@^3`
3. Localizar las gráficas: `grep -rln "recharts" src`
4. Ajustar cada una. Lo que más suele romper: `ResponsiveContainer`, las props de
   `Tooltip`/`Legend` personalizados, y los tipos de los `formatter`.
5. Aprovechar para aplicar `design.md` §3.9 a las gráficas tocadas: un tono por significado,
   etiqueta directa antes que leyenda, `tabular-nums` en ticks y valores, crosshair sólido, y
   **una tabla `<details>` "Ver datos"** en cada gráfica que no la tenga.
6. Comprobar que los colores salen de tokens y no de hex (plan `002`).

## Qué NO tocar

Las animaciones de papeleta y proyección, que no son Recharts.

## Validación

`npm run build`. Abrir el panel de resultados y las analíticas con datos reales (o una
votación de prueba con ≥3 opciones y ≥2 rondas), en claro y oscuro, a 390 y 1440 px.
Comprobar tooltips, leyendas y que ningún eje sale con etiquetas solapadas.

---

## Ejecución (2026-09-04)

`recharts` de `^2.15.4` a **`^3.10.1`**, igual que MCM Bank.

**Hace falta `react-is` explícito.** Recharts 3 lo importa
(`recharts/es6/util/ReactUtils.js` → `import { isFragment } from 'react-is'`) pero **no lo
declara** en sus dependencias, y en este árbol no lo traía nadie: el build fallaba con
`Rollup failed to resolve import "react-is"`. Añadido `react-is@^19` como dependencia
directa. Si algún día recharts lo declara, se puede quitar.

**`src/components/ui/chart.tsx`, borrado.** Era el envoltorio de shadcn para Recharts 2, con
la forma vieja de `TooltipProps`/`LegendProps`; contra v3 no compila (5 errores de tipos).
**No lo importaba nadie**: cero usos en toda la app. Si alguna vez hace falta, se vuelve a
traer del registro de shadcn en su versión para v3, no se resucita esta.

**`admin/ResultsAnalytics.tsx`** es la única gráfica real. Lo que cambió con v3:

- `label={({ name, percent }) => …}`: `percent` ahora puede ser `undefined` y `name` es
  `unknown`. Guardado con `percent ?? 0` y `String(name)`.
- El `formatter` del `Tooltip` ya no fija el tipo del valor: `Number(value)` antes del
  `toFixed`.
- `ResponsiveContainer`, `Cell`, `CartesianGrid` y `Pie` no han necesitado cambios.

Y de paso, `design.md` §3.9 sobre las dos gráficas tocadas:

- **`tabular-nums`** en ticks de eje, en el tooltip y en las tablas.
- **Rejilla sólida**, sin `strokeDasharray`: una discontinua se lee como umbral.
- **Cursor sólido** en el tooltip de barras, con `color-mix` sobre `--avd-fg`.
- **Etiqueta directa antes que leyenda**: fuera el `<Legend>` del pie, que repetía lo que ya
  dicen las etiquetas de cada porción.
- **Tabla `<details>` «Ver datos»** en las dos gráficas (componente `ChartData`), para que
  ningún dato dependa de pasar el ratón por encima.
- Tooltip con tokens `--avd-*` en vez de los semánticos.

## Validación

`npm run build` en verde y `tsc` sin errores nuevos (los que quedan en el repo son previos y
de otros ficheros: `voteHash`, `PublicCandidates`, `ProjectionBallotAnimation`…).

**Comprobado en navegador**, no solo compilado: montadas las dos gráficas con los mismos
props sobre Chromium con Playwright. Renderizan 3 barras, 3 porciones con sus etiquetas
directas y línea guía, 3 ticks en el eje Y, y el tooltip sale con el `formatter`
personalizado («Votos : 12 votos»). Sin errores de consola.

## Lo que queda pendiente

- **`CHART_COLORS` sigue en hex** (paso 6 del plan). Depende de que el sistema tenga una
  paleta categórica; es el mismo bloqueo que anota el `002` y que debería resolver un `008`.
- **El pie con muchos candidatos va contra §3.9** («nunca un donut de ocho quesitos»). Con
  diez candidatos en la ronda es exactamente eso. Cambiar la forma de la gráfica no está en
  la lista de este plan, así que se deja anotado: la comparación entre categorías quiere
  barras horizontales, que ya están al lado.
