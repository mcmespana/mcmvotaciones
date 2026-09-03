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
