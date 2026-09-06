# 008 · La paleta categórica que le falta al sistema

**Superficie:** votante, admin · **Riesgo:** medio · **Depende de:** `001` (hecho)
**Sale de:** el `002` y el `006`, que se quedaron a medias por esto

## Contexto

`design.md` §3.9 pide «paleta categórica validada» para colores de serie, y §3.1 prohíbe
reciclar los semánticos (`ok`/`warn`/`bad`) como color de categoría. **El sistema `--avd-*`
no tiene ninguna paleta categórica.** Por eso quedaron 33 hex a pelo tras el `002`, en tres
sitios que son el mismo agujero:

| Dónde | Qué es | Nº |
|---|---|---|
| `admin/ResultsAnalytics.tsx:48-56` | Colores de serie de las gráficas | 12 |
| `pages/PublicCandidates.tsx:55-56` | Color de avatar por inicial, más su versión clara de fondo | 8 + 8 |
| `voting/VotingTutorial.tsx:27,29` y `voting/GroupedCandidateList.tsx:296` | El ámbar de «favorito» | 3 |

Los dos primeros son categóricos. El tercero es otra cosa: un acento con significado propio
(«esto lo has marcado tú»), que no es marca, ni estado, ni color de voto.

**Y hay un problema vivo, no solo de higiene:** `PALETTE_LT` de `PublicCandidates` son ocho
tintes claros sin variante oscura. Hoy, en modo oscuro, esa pantalla tiene avatares con fondo
casi blanco. Está roto ahora mismo.

Nota aparte, del mismo tema: `projection/projection.css:1-21` define
`--proj-red/emerald/yellow/blue` con escalones `-50`/`-600`, que **duplican la paleta de
voto** con tonos distintos (`--proj-emerald` es hue 160; `--vote-color-green` es hue 142).

## Qué hacer

1. **Definir `--avd-cat-1…8` en OKLCH** en el bloque de rampa de `src/index.css`, con
   variante clara y oscura. Criterios, en este orden:
   - Distinguibles entre sí **también con daltonismo** (deuteranopía y protanopía son las que
     importan aquí: hay asamblea de por medio). Separar por luminosidad además de por tono, no
     solo por tono.
   - Contraste AA contra `--avd-bg` y contra `--avd-surface` **en los dos temas**.
   - Que no se confundan con `--avd-ok/warn/bad` ni con `--vote-color-*`, que ya significan
     otras cosas en esta app.
   - Luminosidades comprobadas par a par, como se hizo con `--avd-brand-*`.
2. **Añadir `--avd-cat-N-bg`** (el tinte claro de fondo) para el caso de los avatares, con su
   variante oscura de verdad, que es lo que hoy no existe.
3. Sustituir `CHART_COLORS` y `PALETTE`/`PALETTE_LT` por la paleta. En las gráficas, ojo a
   §3.9: **un tono por significado, no por posición**.
4. **Decidir el ámbar de «favorito»**: o un token propio (`--avd-star`, o como se llame) con
   sus dos variantes, o se acepta que es `--avd-warn` y se documenta por qué. Lo que no vale
   es dejarlo en hex.
5. Registrar la paleta en `design.md` §3.9, para que las cuatro apps la compartan. Esto es lo
   que convierte el plan en útil más allá de este repo.

## Qué NO tocar

`--vote-color-*`. Y `--proj-*` de `projection.css` solo si se hace a conciencia: unificarlo
mueve el color de la proyección, que es la superficie que se ve a diez metros, y eso quiere su
propia comprobación en sala.

## Validación

```bash
npm run build
grep -rn "#[0-9a-fA-F]\{6\}\b" src --include=*.tsx    # solo logos, con comentario
```

Y sobre el CSS compilado, no sobre el fuente. Recorrer en claro y oscuro la lista pública de
candidatos (que es donde está el fallo de hoy) y las analíticas con ≥8 candidatos. Comprobar
el contraste de cada color de la paleta contra fondo y superficie en los dos temas, y pasar
las gráficas por un simulador de daltonismo.
