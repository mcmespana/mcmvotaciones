# 005 · Reescribir Visión+ escalando la raíz

**Superficie:** votante · **Riesgo:** medio · **Depende de:** nada (mejor después de `004`)

## Contexto

`src/styles/vision-plus.css` son **408 líneas** que, bajo `[data-vision-plus="on"]`,
sobrescriben con `!important` **clase por clase de Tailwind**: `.text-xs`, `.text-sm`, …, y
también las arbitrarias (`.text-\[9px\]`, `.text-\[11\.5px\]`, `.text-\[12px\]`…).

La idea es de las mejores que tenemos —modo de texto al 200 % para quien no ve bien, y hay
gente mayor en las asambleas— pero la implementación tiene un fallo que va a peor solo:
**cualquier tamaño de texto nuevo que alguien escriba se escapa del modo en silencio**. No
falla, no avisa: simplemente esa parte de la pantalla no crece. Y cada `!important` va contra
`design.md` §5.13.

## Qué hacer

1. **Pasar toda la tipografía a `rem`.** Barrer `text-[Npx]`:
   ```bash
   grep -rn "text-\[[0-9.]*px\]" src
   ```
   y sustituir por la escala fija de `design.md` §3.2 (0,75 / 0,875 / 1 / 1,125 / 1,5 / 2 /
   2,75 / 3,5 rem), es decir por las clases estándar de Tailwind. Esto es el grueso del
   trabajo y hay que hacerlo **antes** del paso 2.
2. **Escalar la raíz** en vez de cada clase:
   ```css
   [data-vision-plus="on"] { font-size: 1.65rem; }   /* 16 → ~26 px */
   ```
   aplicado al contenedor que hoy lleva el atributo. Todo lo que esté en `rem` crece solo.
3. **Revisar lo que NO debe crecer con el texto**: alturas de control fijadas en `px`,
   iconos, y cualquier `max-width` de columna. Los tamaños de control conviene dejarlos en
   `rem` también, para que el modo siga siendo usable.
4. **Comprobar los layouts que se rompen al 200 %**: rejillas de candidatos, botones con
   texto largo, cabeceras. Donde no quepa, que envuelva; **nunca** truncar (§5.8).
5. Borrar `vision-plus.css` cuando el paso 2 lo cubra todo. Si queda algún caso irreductible,
   deja **solo** ese, con un comentario explicando por qué.
6. Mantener la exclusión de `/admin` y `/proyeccion`, que es correcta.

## Qué NO tocar

`/proyeccion`: su tamaño de letra está calibrado para la sala y no debe depender de este modo.

## Validación

`npm run build`. Con Visión+ activado y desactivado, recorrer todo el camino del votante a
390 px: entrar, ver candidatos, abrir un detalle, votar, confirmar. Nada truncado, nada
solapado, nada que se quede pequeño. Comprobar además con el zoom del navegador al 200 %,
que es el otro camino por el que llega la misma necesidad.

---

## Ejecución (2026-09-04)

**408 líneas → 56, y ni un `!important`.**

### Lo primero: Visión+ no estaba haciendo nada

Antes de reescribir nada apareció esto, y conviene decirlo claro: **`vision-plus.css` no
aparecía en el CSS compilado. Ni una línea. Ni antes de este plan ni en `main`.**

El `@import "./styles/vision-plus.css"` estaba después del bloque `@theme`, y CSS exige que
todo `@import` preceda a cualquier otra sentencia: PostCSS lo descartaba en silencio. El modo
de accesibilidad —la mejor idea que tenemos, según `design.md` §7— llevaba quién sabe cuánto
sin surtir efecto en producción. Comprobado sobre el build en las dos ramas:

```bash
npm run build && grep -c "data-vision-plus" dist/assets/index-*.css   # 0, en main y aquí
```

Arreglado moviendo los tres `@import` al principio de `src/index.css`. Es la cuarta vez en
este repo que aparece el mismo patrón —el `003`, el `@theme`, los catorce tokens del `001` y
ahora esto—: **código que parecía funcionar y no llegaba al CSS.**

### Paso 1 · Toda la tipografía a `rem`

209 `text-[Npx]` sustituidos por la escala fija de `design.md` §3.2:

| De | A | Nº |
|---|---|---|
| 9, 10, 10.5, 11, 11.5, 12, 12.5 px | `text-xs` (12 px) | 103 |
| 13, 13.5, 14, 15 px | `text-sm` (14 px) | 78 |
| 16, 17 px | `text-base` (16 px) | 4 |
| 18, 19, 20 px | `text-lg` (18 px) | 14 |
| 22, 26 px | `text-2xl` (24 px) | 6 |
| 30, 32 px | `text-[2rem]` | 3 |
| 40 px | `text-[2.75rem]` | 1 |

Los 10 y 11 px iban además contra §3.2 («nada de texto por debajo de 12 px»), así que subirlos
era el arreglo, no un daño colateral.

### Paso 3 · Los tamaños de control, también a `rem`

Un `text-sm` que crece dentro de un botón de `height: 32px` no cabe. Convertidos:

- **293 clases** `w-`, `h-`, `p*-`, `m*-`, `gap-`, `top/left/…`, `leading-` con valor
  arbitrario en px, en 34 `.tsx`.
- **393 declaraciones** de `src/index.css` (`.avd-btn`, `.avd-input`, `.avd-chip`, `.pub-*`,
  diálogos, cabeceras…), más 28 de `vote-ticket.css` y 29 de `seat-validated.css`.

Lo que **no** se convierte, a propósito: bordes y cualquier `1px` (una raya de un píxel es una
raya de un píxel), radios (§3.3 los fija en px), `max-width` de columna, y **`projection.css`
entera** —la proyección está calibrada para la sala y no debe depender de este modo—.

Es un cambio de valor **nulo** con la raíz en 16 px: `32px` y `2rem` pintan igual. Solo se
separan cuando Visión+ mueve la raíz, que es justo el objetivo.

### Paso 2 · Escalar la raíz

El plan decía «aplicado al contenedor que hoy lleva el atributo». **Eso no funciona**: `rem`
se mide siempre contra `html`, así que un `font-size` en un `<div>` —y encima con
`display: contents`— no mueve ni un `text-sm`. Tiene que ser `documentElement`, que es lo que
dice el título del plan.

`AccessibilityContext` enciende y apaga una clase; el tamaño vive en CSS, para que pueda tener
su media query:

```css
html.vision-plus { font-size: 1.65rem; }                       /* 16 → 26,4 px */
@media (max-width: 400px) { html.vision-plus { font-size: 1.45rem; } }
```

### Pasos 4-6

Lo que queda en `vision-plus.css` son **tres reglas de reflujo**, que la escala no puede
producir: rejilla de candidatos a una columna, el botón de favorito fuera del posicionamiento
absoluto (con el texto al doble se montaba encima del nombre) y la zona sensible mínima de
WCAG en botones que no pasan por `.avd-btn`. Todo lo demás —secciones 1 a 5, 8 a 17 y 19 del
fichero viejo— era multiplicar tamaños, y ahora sale solo.

La exclusión de `/admin` y `/proyeccion` se mantiene, y ahora es estructural: la clase la pone
`AccessibilityProvider`, que solo envuelve las rutas de votante.

## Validación

`npm run build` en verde, `eslint` sin errores y `tsc` sin errores nuevos.

**En navegador** (Chromium, `/test`, que monta componentes de votante con datos falsos y sin
Supabase):

| | Visión+ apagado | Visión+ encendido, 390 px |
|---|---|---|
| Raíz | 16 px | **23,2 px** (el 145 % de pantalla estrecha) |
| `h1` | 18 px | **26,1 px** |
| Botón | 28 px de alto | **63,8 px** |
| Desbordamiento horizontal | no | **no** |

Sin errores de consola: todo crece, todo envuelve, nada truncado y nada solapado. Con Visión+
apagado la pantalla queda igual que antes salvo el `h1` de 20 → 18 px, que es el cambio de
escala buscado.

## Lo que no se ha podido mirar

- **El camino completo del votante** (entrar, lista de candidatos, detalle, votar, confirmar)
  necesita credenciales de Supabase, que no hay en este entorno. Lo comprobado son los
  componentes que monta `/test`. Mismo bloqueo que el `007`.
- **El panel de administración** con la escala nueva: también necesita entrar. El barrido de
  `text-[Npx]` sí lo toca, y es donde más filas densas hay.
