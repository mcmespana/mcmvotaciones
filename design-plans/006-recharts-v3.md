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
