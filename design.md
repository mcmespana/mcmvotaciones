# design.md — Sistema de diseño MCM

> **Este archivo es para agentes.** Si vas a tocar una pantalla, un componente, un color, un
> texto de interfaz o una animación en cualquiera de las cuatro apps del Movimiento
> Consolación para el Mundo, léelo entero antes. No es un moodboard: es el conjunto de
> decisiones ya tomadas, con el porqué, para que no vuelvas a tomarlas mal.
>
> **Bloque compartido:** las secciones 1–6 son idénticas en los cuatro repos
> (`mcmbank`, `mcmrecursos`, `mcmshop`, `mcmvotaciones`). Si cambias algo ahí, cámbialo en
> los cuatro en el mismo commit, o no lo cambies. La sección 7 es de esta app y solo vive
> aquí. La 8 apunta al trabajo pendiente.

---

## 0. Cómo usar este archivo

1. **Antes de escribir CSS o JSX/Svelte/Vue nuevo**, busca en la §4 si el patrón ya tiene
   nombre y dueño. Casi siempre lo tiene. Reutilizar el componente canónico es la decisión
   por defecto; inventar uno paralelo necesita una razón escrita.
2. **Antes de elegir un color, un radio o una duración**, mira la §3. Todo sale de tokens.
   Un hex a mano en un componente es un bug, no una preferencia.
3. **Si lo que vas a hacer choca con la §5 (anti-defaults), no lo hagas.** Esa lista está
   escrita contra errores que ya cometimos.
4. **Si esto no cubre tu caso**, aplica la §6 y luego **añade la decisión aquí**, en los
   cuatro repos. Un sistema que no crece se convierte en folclore.
5. **Si detectas que el código y este archivo no coinciden**, el código no gana
   automáticamente: mira la §8, casi seguro está fichado como deuda. Si no lo está,
   añádelo a `design-plans/` en vez de "arreglarlo" de paso.

---

## 1. Quiénes somos y para quién diseñamos

El MCM es un movimiento educativo cristiano con delegaciones repartidas por España. Quien
usa nuestras apps **no es un usuario de producto**: es un voluntario, un tesorero de
delegación, un monitor, un miembro de la oficina técnica. Casi siempre:

- **va con prisa y no ha pedido estar ahí** — cuadra facturas un martes por la noche,
  busca una dinámica de Adviento para el sábado, pide camisetas para veinte chavales;
- **no va a leer un manual** ni a descubrir un atajo escondido;
- **usa el móvil más de lo que creemos**, y a veces una pantalla de sala compartida;
- **no puede permitirse un error silencioso**: un saldo mal, un voto perdido o un pedido
  duplicado tiene consecuencias reales para personas concretas.

De ahí salen los tres valores que ordenan cualquier discusión de diseño, **en este orden**:

| # | Valor | Qué significa en la práctica |
|---|---|---|
| 1 | **Claridad** | Se entiende lo que pasa y lo que va a pasar. Antes que bonito, antes que rápido de programar. |
| 2 | **Confianza** | Toda acción que sale de la pantalla se ve, se puede deshacer o, si no, se avisa. Nada se decide solo. |
| 3 | **Calidez** | Somos un movimiento educativo, no un banco. Sobrios sin ser fríos; la personalidad va en el lenguaje y en los momentos de bienvenida, no en el cromo. |

Cuando dos valores chocan, gana el de arriba. "Es más bonito" nunca gana a "se entiende".

**Regla de oro heredada de la IA en MCM Bank y válida para todo:** *el sistema sugiere, la
persona decide*. Ninguna pantalla completa, concilia, categoriza o publica algo por su
cuenta sin que alguien lo vea. Si algo se rellena solo, se rellena **solo donde está
vacío** y se marca como sugerencia.

---

## 2. Las cuatro apps

| App | Qué es | Quién la usa | Stack | Acento |
|---|---|---|---|---|
| **MCM Bank** (`mcmbank`) | Tesorería: movimientos, facturas, cuentas, informes | Tesoreros de delegación + oficina técnica | Next.js 16 · React 19 · Tailwind 3 · shadcn/Radix · Supabase | Azul institucional |
| **Banco de Recursos** (`mcmrecursos`) | Catálogo de recursos de tiempo libre | Monitores y animadores, público amplio | SvelteKit · Svelte 5 runes · Tailwind 4 · shadcn-svelte/Bits UI · Supabase | Teal + ámbar |
| **Tienda MCM** (`mcmshop`) | Venta de material (camisetas, pañuelos…) | Particulares (B2C) y delegaciones (B2B) | Nuxt 4 · Vue 3 · Tailwind 4 · Holded · Redsys | Verde (B2C) / azul (B2B) |
| **MCM Votaciones** (`mcmvotaciones`) | Votaciones de asamblea, proyección en sala | Votantes en sala + administración | Vite · React · Tailwind 4 · Supabase | Azul institucional |

**Son cuatro productos, no uno.** No buscamos que parezcan la misma web: un catálogo
luminoso y una hoja de tesorería densa **deben** verse distintos. Lo que compartimos es la
**gramática**: el mismo modo de nombrar tokens, la misma escala, la misma manera de
confirmar una acción, el mismo tono al hablar. Una persona que salta de una a otra no debe
tener que reaprender **cómo funcionan las cosas**, aunque note que ha cambiado de sitio.

El logo institucional (azul/cian, `Consolación para el Mundo`) firma todas. Cada app puede
tener icono propio — la Tienda lo tiene — pero el institucional aparece al menos una vez.

---

## 3. Fundamentos

### 3.1 Color

**Formato: OKLCH, siempre.** Es el único espacio en el que subir o bajar un escalón de una
rampa da un salto perceptualmente igual, y en el que se puede aclarar un color para el modo
oscuro sin que cambie de tono. Los HSL que quedan en el código son legado (§8).

**Tres capas, en este orden. No te saltes ninguna:**

1. **Rampa cruda** — `--brand-50…900`, `--n-0…1000` (neutros), `--ok/--warn/--bad-100/500/600`.
   Números, sin significado. Nadie los usa directamente en un componente.
2. **Tokens semánticos aplicados** — `--background`, `--foreground`, `--card`, `--popover`,
   `--primary`, `--secondary`, `--muted`, `--muted-foreground`, `--accent`, `--destructive`,
   `--border`, `--input`, `--ring`, `--warm`. Apuntan a la rampa y **cambian en `.dark`**.
   Esto es lo que se usa.
3. **Clases de Tailwind** — `bg-background`, `text-muted-foreground`, `border-border`.
   Esto es lo que se escribe en el componente.

> **Nombres en inglés.** Convención MCM: código en inglés, base de datos en español. Los
> tokens son código. Tres de las cuatro apps ya llevan los nombres semánticos de
> shadcn/Tailwind y los componentes de terceros (Radix, Bits UI) los esperan tal cual.

**Reglas que no se negocian:**

- **Cero hex, cero `rgba()`, cero color de Tailwind por nombre** (`bg-blue-500`,
  `text-gray-400`) en componentes de producto. Para variantes con opacidad,
  `color-mix(in oklch, var(--primary) 12%, transparent)` o la sintaxis `/N` de Tailwind
  (`bg-primary/10`). Excepción única: un **logo**, que es un activo de marca y no debe
  cambiar de color con el tema (ver `LogoMCM.vue` en la Tienda, que lo documenta).
- **El acento es de la app, la semántica es de todos.** Cada app tiene su hue de marca; los
  tres colores de estado (`ok` verde, `warn` ámbar, `bad` rojo) son los mismos en las
  cuatro, porque significan lo mismo en las cuatro.
- **Los semánticos no se reciclan como color de serie.** El verde de "publicado" no es el
  verde de la tercera barra de una gráfica. Si necesitas colores categóricos, §3.9.
- **Los neutros llevan un sesgo de matiz hacia el acento**, elegido, no heredado. Gris puro
  al lado de un teal se ve sucio. Ese sesgo es lo que hace que una app se sienta "de un
  color" sin pintar nada.
- **El modo oscuro se diseña, no se invierte.** Fondo azul-noche o marrón-noche, nunca
  `#000`. El `--primary` **sube de luminosidad** en oscuro para mantener AA. Las sombras
  dejan de funcionar sobre fondo oscuro: en `.dark` la elevación se expresa con **borde y
  cambio de superficie**, no con `box-shadow`. Cada clase propia necesita su variante
  oscura en el mismo commit: dejarla para después significa no hacerla.
- **El color nunca es la única señal.** Un estado lleva color **y** texto o icono. Hay
  daltonismo en la asamblea y hay proyectores que mienten.
- **Contraste AA como mínimo** (4.5:1 texto normal, 3:1 texto ≥24 px y elementos de
  interfaz) en **los dos temas**. Si no llega, cambia el token, no el texto.

**El contenido manda sobre el cromo.** En la Tienda las fotos de camisetas turquesa y
granate ya ponen todo el color; en el Banco de Recursos lo ponen las miniaturas. Por eso la
interfaz alrededor es deliberadamente sosa. Cuando dudes cuánto color poner: menos.

### 3.2 Tipografía

**Dos familias, autoalojadas vía Fontsource** (nada de `@import` a `fonts.googleapis.com`:
es una petición bloqueante a un tercero, un FOUT y un dato que se va fuera):

- **Texto e interfaz: Figtree Variable.** Legible en tamaños pequeños, redonda sin ser
  blanda, buena con diacríticos españoles. Todo lo que no sea un titular grande.
- **Display: Bricolage Grotesque Variable.** Solo `h1`/`h2`, números-héroe de estadísticas y
  portadas. **Solo a ≥24 px y pesos 600–800**; por debajo de eso pierde y se lee peor.
- **Mono: JetBrains Mono**, únicamente para códigos, IBAN, identificadores y logs. Los
  importes **no** son mono: son texto normal con `tabular-nums`.

**Escala fija en `rem`** — 0,75 · 0,875 · 1 · 1,125 · 1,5 · 2 · 2,75 · 3,5. Si necesitas un
tamaño intermedio, casi seguro lo que necesitas es otra jerarquía.

- `tabular-nums` **siempre** en importes, contadores, columnas de tabla, ticks de eje y
  cualquier número que cambie en el sitio. Sin eso, un contador que pasa de 9 a 10 mueve
  toda la fila. Cifras **proporcionales** en los números-héroe grandes, que no se alinean
  con nada.
- `text-wrap: balance` en titulares; `text-pretty` en párrafos.
- Línea de ~65 caracteres en texto corrido. En una tabla no aplica.
- **Mayúsculas solo en eyebrows y cabeceras de columna**, con `+0.04em` de tracking. Nunca
  en un botón, nunca en una frase.
- **Nada de texto por debajo de 12 px** salvo cabeceras de columna en escritorio. En móvil,
  los `input` van a **≥16 px** o iOS Safari hace zoom al enfocar y descoloca la página.

### 3.3 Espacio, radio, densidad y elevación

- **Rejilla de 4 px.** Todo espaciado es múltiplo de 4 (las utilidades de Tailwind ya lo son;
  el problema son los `px` arbitrarios).
- **Radio base `--radius: 0.625rem` (10 px).** Derivados: `sm` = 6 px, `md` = 8 px,
  `lg` = 10 px, `xl` = 14 px para tarjetas grandes y hojas. `rounded-full` solo en avatares,
  pills y puntos de estado. **Radios de 16 px o más en controles pequeños están prohibidos:**
  un botón de 32 px con radio 16 es una cápsula, y una cápsula ya significa otra cosa
  (pill de estado, chip de filtro).
- **Dos densidades y solo dos.** *Cómoda* para galerías, portadas y formularios; *compacta*
  (fila de 44 px, tipografía 0,875 rem) para tablas y listas de trabajo. Elegir por pantalla,
  no por componente.
- **Alturas de control:** `sm` 28 px · `default` 32 px · `lg` 36 px en escritorio. En móvil
  y tableta, la **zona sensible** de cualquier control interactivo llega a **44 px**, pero se
  amplía con un pseudo-elemento invisible, **no engordando el dibujo** (patrón `.toque` /
  `.toque-encima` de `mcmrecursos`, dentro de `@media (pointer: coarse)`). Con ratón, un
  icono de 32 px se acierta sin problema y agrandar la zona solo roba clics a lo de al lado.
- **Dos niveles de elevación, no cinco:** *reposo* (borde de 1 px, sombra apenas perceptible)
  y *elevado* (popover, hoja, diálogo). En `.dark`, borde en lugar de sombra.
- **Bordes antes que sombras.** Una lista de cuarenta filas con sombra cada una es ruido.

### 3.4 Movimiento

**Nada se mueve porque sí.** Una animación tiene que hacer una de estas tres cosas: explicar
de dónde viene o adónde va algo, confirmar que una acción se ha registrado, o mantener la
continuidad al reordenar. Si no hace ninguna, quítala.

- **Duraciones:** 120–200 ms para micro-interacciones (hover, foco, pulsado); 200–260 ms para
  entradas, salidas y paneles; **nada por encima de 300 ms** en una herramienta. Las
  excepciones son celebratorias y contadas (el tique de la Tienda, la papeleta de Votaciones)
  y están documentadas donde viven.
- **Curvas con nombre**, porque las de serie son flojas — `ease-out` de CSS apenas frena al
  final y una entrada con ella se lee como "se ha movido" en vez de "ha llegado":

  | Uso | Curva |
  |---|---|
  | Entrar o salir | `--ease-brio: cubic-bezier(0.23, 1, 0.32, 1)` |
  | Moverse por la pantalla, reordenarse | `--ease-vaiven: cubic-bezier(0.77, 0, 0.175, 1)` |
  | Panel u hoja que se desliza desde un borde | `--ease-cajon: cubic-bezier(0.32, 0.72, 0, 1)` |

  **Nunca `ease-in` en interfaz**: arranca lento y parece que la app va lenta.
- **Anima `transform` y `opacity`.** Animar `width`, `height`, `top` o `box-shadow` provoca
  layout en cada fotograma y se nota en un móvil de hace cuatro años, que es el que hay.
- **`prefers-reduced-motion: reduce` apaga el movimiento, no la información.** Un botón que
  confirma con un check lo sigue haciendo; lo que desaparece es el desplazamiento. Las cuatro
  apps ya llevan el bloque global; no lo quites y no lo dupliques por componente.
- **Nada de:** parallax, reveals por scroll dentro de la herramienta, bucles infinitos que no
  informen de nada, `hover:scale` en filas de lista, rebotes en elementos que no piden
  atención. La única animación en bucle aceptable es la que dice "esto sigue trabajando".

### 3.5 Estados de acción

**Toda acción que hable con el servidor tiene que verse.** El vocabulario es el mismo en las
cuatro apps, para que se aprenda una vez:

| Estado | Cómo se ve |
|---|---|
| **Reposo** | El control de siempre |
| **Cargando** | Spinner delante del texto, texto opcional en gerundio ("Guardando…"), `aria-busy`, **deja de aceptar clics** |
| **Hecho** | Check verde ~1,4 s que se apaga solo. Confirma sin robar sitio ni pedir un "Aceptar" |
| **Fila ocupada** | La fila entera al 60 % con pulso y `aria-busy` |
| **Navegando** | Barra de progreso de 2 px en el borde superior |
| **Error** | Ver abajo |

Que el control **deje de aceptar clics mientras carga** no es estética: es lo que impide
enviar la misma acción dos veces.

**Errores: enseña lo que ha pasado de verdad.** Un "Error al guardar" que deja el detalle en
la consola de otra persona no vale para nada. El patrón es el de `describirError()` de MCM
Bank: mensaje, detalle, pista y código, asumiendo que sale feo — **un texto feo que se puede
copiar en un WhatsApp vale más que uno bonito que no dice nada**. Y cuando se puede, el error
lleva la acción que lo arregla al lado.

**Estados vacíos con salida.** Un vacío nunca es solo un dibujo y una frase: dice por qué
está vacío y ofrece el siguiente paso. Cuando el vacío viene de filtros, el mejor patrón que
tenemos es el del catálogo de Recursos — prueba a quitar cada filtro por separado y ofrece
los que devuelven algo, el que más primero, con el número que desbloquea cada uno; y si
quitar uno solo no basta, lo dice, en vez de sugerir en falso.

**Esqueletos solo en la primera carga** de una vista, y con la forma real del contenido. Para
recargas y refiltrados, la vista anterior se queda y se atenúa: parpadear a esqueleto en cada
tecla es peor que esperar.

### 3.6 Lo destructivo: deshacer antes que confirmar

Un "¿estás seguro?" le cobra el peaje a todo el mundo para evitar el error de uno, y encima
no salva del error que de verdad se comete —pulsar en la fila de al lado— porque ese se
confirma igual de rápido. El patrón por defecto es el contrario:

| Caso | Patrón |
|---|---|
| **Irreversible** (borrar un recurso, una lista, un movimiento) | **Acción retardada**: la pantalla reacciona ya y la acción espera ~7–12 s con un "Deshacer" a la vista. Durante la cuenta atrás **la base de datos está intacta** |
| **Ya reversible** (quitar un favorito, archivar) | **Aviso deshacible**: se ejecuta al momento y "Deshacer" hace la contraria |
| **Con efecto fuera de la app** (enviar un correo, cobrar) | Se ejecuta y se avisa, **sin retardo** — no se puede desenviar un correo |

Se sigue confirmando **solo** cuando la acción no tiene marcha atrás *ni ventana*: lo que sale
de la app, y el borrado en lote de muchos elementos. Si te vas de la página con una cuenta
atrás en marcha, **se lanza**: dejarla morir haría que la pantalla y la base de datos contaran
cosas distintas.

Cuando toque confirmar de verdad: el título dice **qué** se va a borrar (no "¿Estás seguro?"),
el botón dice **el verbo** ("Eliminar factura", no "Aceptar"), el título va en color
destructivo, y **el botón peligroso nunca es el que tiene el foco por defecto**.

### 3.7 Accesibilidad

No es una capa opcional: hay gente mayor en las asambleas y hay delegaciones votando desde un
móvil viejo con el brillo a tope.

- **Contraste AA en los dos temas.** Sin excepciones para "texto decorativo".
- **Foco visible siempre**, con `--ring` y 2 px de offset. Nunca `outline: none` sin
  sustituto. Si un diseño se estropea con el anillo de foco, el diseño está mal.
- **Todo operable por teclado**, en orden lógico. Diálogos y hojas atrapan el foco y lo
  devuelven al cerrarse. **Enlace "Saltar al contenido"** al principio del layout en cuanto la
  cabecera tenga más de dos controles.
- **Nombres accesibles que distinguen.** En una rejilla, veinte botones "Guardar en
  favoritos" no sirven de nada: el botón dice de qué elemento es.
- **`aria-live="polite"` en los recuentos que cambian solos**, con el texto completo para
  quien escucha ("3 movimientos encontrados con el filtro actual", no "3").
- **Nada de `hover` como única vía.** Lo que solo aparece al pasar el ratón se muestra
  siempre por debajo de `sm`: en táctil el hover no existe.
- **Toda gráfica tiene su tabla** (§3.9). Ningún dato accesible solo por un tooltip.
- **Movimiento reducido respetado** (§3.4), y **texto ampliable** sin que se rompa el layout:
  usa `rem`, no `px`, en tamaños de texto y en los `max-width` de columnas de texto.

### 3.8 Voz y microcopia

**Todo lo que ve una persona va en español**, claro y sin jerga. Código en inglés
(variables, funciones, tokens); base de datos en español; interfaz en español.

- **Tuteo neutro y frases cortas.** "Sube la factura", no "Proceda a adjuntar el documento".
- **Los botones dicen el verbo de lo que va a pasar**: "Guardar cambios", "Enviar recurso",
  "Confirmar pedido". Nunca "Aceptar", nunca "OK", nunca "Enviar" a secas cuando hay dos
  cosas enviables en pantalla.
- **Los estados en palabras nuestras**: "Publicado", "Sin pagar", "Pendiente de revisar". No
  "Activo", no "OK", no un código.
- **Sin emojis como iconografía de interfaz.** Los iconos son Lucide. Un emoji en un encabezado
  de sección envejece mal, no tiene versión oscura y se lee distinto en cada sistema. (En
  documentación interna y mensajes de commit haz lo que quieras.)
- **Sin exclamaciones automáticas ni ánimo impostado.** "Pedido confirmado" está bien;
  "¡Genial! 🎉 ¡Ya casi está!" no. La calidez se nota en que el texto se entiende y en que
  la app no te trata como a un intruso, no en el signo de admiración.
- **Nunca culpes a quien usa la app.** "No hemos podido leer el archivo" antes que "Has
  subido un archivo inválido".
- **Números y fechas en formato español**: `1.234,56 €`, `31/08/2026`, y el mes en letra
  cuando cabe. Importes con el signo visible cuando el signo importa.

### 3.9 Dataviz

La forma primero, el color al final. Método completo en `docs/04-diseno.md` §6 de
`mcmrecursos`, que es la referencia; resumen operativo:

- **Elige la forma por la pregunta**, no por el catálogo: comparación entre categorías →
  barras horizontales (los nombres largos en español caben enteros); evolución en el tiempo →
  línea o área en *wash* (~12 % de opacidad, nunca un bloque saturado); parte de un todo con
  2–3 trozos → barra apilada. **Nunca un donut de ocho quesitos.** Nunca dos ejes Y.
- **Un tono por significado**, no por posición: si dos series miden lo mismo comparten tono.
  Rampa secuencial para magnitudes, escalones del acento para secuencias ordinales (un flujo
  editorial, un estado que avanza), paleta categórica validada para categorías. Los
  semánticos (`ok`/`warn`/`bad`) **no entran** en las paletas de serie.
- **Etiqueta directa antes que leyenda** cuando quepa. Una leyenda es un ejercicio de memoria.
- **`tabular-nums`** en ticks y valores; rejilla horizontal fina y sólida; crosshair sólido
  (una línea discontinua se lee como umbral, no como cursor).
- **Cada gráfica lleva su tabla** en un `<details>` "Ver datos".
- **Librerías:** Recharts en React (Bank, Votaciones), LayerChart en Svelte (Recursos). No
  introduzcas una tercera.

---

## 4. Vocabulario de componentes

Nombres compartidos por las cuatro apps. **Si el patrón está aquí, reutiliza el componente de
tu repo; no dupliques uno paralelo.** Cuando una app aún no lo tenga, créalo con este nombre
y esta semántica.

| Nombre | Qué es | Reglas |
|---|---|---|
| **PageHeader** | Cabecera de una vista: título y acciones | Un `h1` por pantalla. Sin párrafo descriptivo: eso va al manual |
| **FilterTabs** | Pestañas de filtro con contadores | **Scroll horizontal en móvil, nunca truncar ni abreviar la etiqueta**. Un icono *o* un punto de color, no los dos |
| **ListRow** / **ListHeaderRow** | Fila densa de lista, con cabecera de columnas | Radio `lg`, borde de 1 px, banda de estado como `border-l-4`. Sin sombra en reposo, sin `hover:scale` |
| **StatusPill** | Estado de una entidad | Punto de color o icono + texto. **Siempre texto**, nunca solo color. Sin emoji |
| **EntityAvatar** | Círculo de una entidad (cuenta, proveedor, persona) | Logo si lo hay, si no iniciales sobre color derivado del nombre. Nunca un hueco gris |
| **AmountDisplay** | Importe con signo | `tabular-nums`. Verde/rojo **por signo**. Un importe que no tiene signo (una factura por pagar) usa el componente de estado, no éste |
| **EmptyState** | Vacío | Icono, qué pasa, y **la salida** (§3.5) |
| **LoadingSpinner** / **PageSkeleton** | Carga | Esqueleto solo en primera carga, con la forma real |
| **ActionMenu** | Menú de acciones de una fila | Lo destructivo, abajo y separado |
| **ConfirmButton** | Acción destructiva | Lee la §3.6 antes de usarlo: casi siempre lo correcto es deshacer |
| **CommandPalette** | ⌘K / Ctrl+K / `/` | **Con disparador visible**: un atajo sin pista visible no existe |
| **Toaster** | Avisos efímeros | Sonner / svelte-sonner. Un toast no sustituye a un estado en la pantalla |
| **FileDropzone** / **FileThumbnail** | Subida y previsualización | Miniatura real (primera página del PDF rasterizada), nunca un iframe encogido |

**Iconos: Lucide**, tamaño 16 px dentro de controles, 20–24 px sueltos, `stroke-width` por
defecto. Un icono sin texto necesita `aria-label` **y**, si es una acción no obvia, tooltip.

---

## 5. Anti-defaults — lo que NO hacemos

Esta lista está escrita contra cosas que ya están en nuestro código y nos han costado.

1. **Nada de "glassmorphism"**: `backdrop-blur` decorativo, tarjetas semitransparentes,
   bordes blancos al 20 %. Sobre un fondo con contenido, ilegible; en un móvil normal, caro.
   El `backdrop-filter` se reserva a **una** barra pegajosa por app.
2. **Nada de gradientes como fondo de página, de tarjeta o de texto.** Un `bg-clip-text` con
   degradado en un `h1` es de 2022 y baja el contraste. El degradado se admite en una franja
   de acento fina o en un dato, no como material.
3. **Nada de `hover:scale`, `hover:rotate` ni `-translate-y` en filas de lista o tarjetas de
   catálogo.** En una lista de cuarenta filas es un temblor. Para señalar hover: cambio de
   fondo y de borde.
4. **Nada de sombras de colores ni "glow".** `shadow-primary/30` no es elevación, es neón.
5. **Nada de radios de cápsula en controles pequeños** (§3.3).
6. **Nada de modo oscuro por inversión**, ni clase sin su variante oscura.
7. **Nada de emojis como iconografía de interfaz** (§3.8).
8. **Nada de etiquetas truncadas o abreviadas en móvil** (`hidden sm:inline`,
   `label.slice(0,3)`). Si no cabe, se hace scroll horizontal.
9. **Nada de "tubo centrado" de 700 px en escritorio** para vistas de datos: excelente en
   escritorio significa **usar el ancho**. El `max-width` es para texto corrido.
10. **Nada de cuatro familias tipográficas.** Dos y una mono (§3.2).
11. **Nada de fuentes desde CDN de terceros** (§3.2).
12. **Nada de esqueletos eternos** ni parpadeo a esqueleto en cada refiltrado (§3.5).
13. **Nada de `!important` para pelearse con el propio sistema.** Si hay que forzar, el token
    está mal. (Excepción tolerada y ya fichada: el modo Visión+ de Votaciones, §8.)
14. **Nada de dos sistemas de tokens vivos en el mismo repo.** Si migras, migra; una migración
    a medias es peor que cualquiera de los dos estados.

---

## 6. Cómo decidir cuando esto no lo cubre

En orden. Baja un escalón solo si el anterior no responde:

1. **¿Lo hace ya otra de las cuatro apps?** Cópialo, con su porqué. Prioridad de referencia:
   Recursos para catálogo/portada/motion, Bank para densidad de datos/tablas/formularios,
   Tienda para compra y confirmaciones, Votaciones para pantallas de sala y proyección.
2. **¿Qué es lo que menos sorprende?** Elige lo aburrido. La originalidad se gasta en el
   contenido, no en el selector de fechas.
3. **¿Se entiende sin explicación en un móvil, con prisa, a la primera?** Si necesita un
   tooltip para entenderse, todavía no está.
4. **¿Aguanta el caso feo?** Un nombre de proveedor de 60 caracteres, un importe de siete
   cifras, cero resultados, la red caída, la pantalla a 320 px, la fuente al 200 %.
5. **¿Y en oscuro? ¿Y con teclado? ¿Y con `reduced-motion`?** Los tres, antes de dar por
   hecho el componente.
6. Si sigues sin respuesta: **haz lo mínimo que funcione, déjalo documentado en
   `design-plans/` y pregunta.** No inventes un patrón nuevo a las 11 de la noche.

**Y cuando decidas algo que no estaba: escríbelo aquí, en los cuatro repos, en el mismo
commit.**

---

## 7. Esta app: MCM Votaciones

**Qué es visualmente:** tres interfaces muy distintas conviviendo, y hay que tenerlas
separadas en la cabeza:

| Superficie | Quién la ve | Cómo se diseña |
|---|---|---|
| **Votante** (`src/components/voting/`) | Una persona en una asamblea, con su móvil, a veces mayor, a veces con mala cobertura | Lo más grande, lo más claro y lo más lento de todas nuestras apps. Un solo objetivo por pantalla |
| **Proyección** (`src/components/projection/`) | Toda la sala, a diez metros, con un proyector que apaga los contrastes | **Siempre oscura**, sin variante clara. Tipografía enorme, cero elementos decorativos, cero texto que haya que leer para entender |
| **Administración** (`src/components/admin/`) | Una o dos personas conduciendo la votación | Densa y sobria, como MCM Bank. Aquí manda la información por segundo |

Es **la app donde un error de diseño se ve en directo delante de cien personas**. La §1 valor
1 (*claridad*) no admite ninguna concesión: un botón ambiguo en la pantalla de voto es un
voto perdido.

**Dónde está cada cosa**

| Qué | Dónde |
|---|---|
| Tokens y estilos globales | `src/index.css` (**contiene dos sistemas a la vez**, ver abajo) |
| Modo Visión+ (texto al 200 %) | `src/styles/vision-plus.css` |
| Grafo de dependencias | `graphify-out/` — **consúltalo antes de refactorizar**, y actualízalo (`/graphify . --update`) al terminar |
| Migraciones | `supabase/migrations/` (append-only) |
| Planes de diseño pendientes | `design-plans/` |

**Decisiones propias de esta app, que se respetan:**

- **`--avd-*` es el sistema bueno.** La paleta OKLCH del "Consolación Design System"
  (`--avd-bg`, `--avd-surface`, `--avd-border`, `--avd-fg`, `--avd-fg-muted`, `--avd-brand`,
  `--avd-ok/warn/bad`, `--avd-n-{50…1000}`, radios de 4–14 px, sombras de cuatro pasos) es la
  que cumple la §3.1. Todo lo nuevo va con ella.
- **Toda clase propia lleva sus dos variantes**: por defecto = claro, y `.dark .mi-clase`
  para oscuro. Sin excepciones salvo proyección y `graphify-out/graph.html`, que son siempre
  oscuras por diseño.
- **Proyección siempre oscura, y punto.** No le añadas un modo claro "por coherencia": la
  coherencia aquí es con la sala, no con el resto de la app.
- **Paleta oficial de votación** (`--vote-color-blue/red/yellow/green`): son los colores de
  las opciones y **se usan en toda la app**, incluida la proyección. No inventes otros y no
  los reutilices para nada que no sea una opción de voto.
- **En táctil, los `input` van a ≥16 px** — ya lo cubre la regla
  `@media (hover: none) and (pointer: coarse)` de `index.css`. No añadas controles por debajo
  de eso.
- **Modo Visión+** (`[data-vision-plus="on"]`, texto al 200 %, sin afectar a `/admin` ni a
  `/proyeccion`) es **la mejor idea de accesibilidad que tenemos en las cuatro apps** y
  merece propagarse. Su implementación actual, en cambio, es deuda (§8).

**Lo que hay que saber para no tropezar:**

- **`src/index.css` tiene dos sistemas de color vivos a la vez** y esto es la incoherencia
  más grande de los cuatro repos:
  1. el legado *Soft Oceanic* — tokens HSL de shadcn más `--gradient-primary`,
     `--gradient-canvas`, `--primary-glow`, `--shadow-primary`… que además pinta un degradado
     de fondo en el `body`;
  2. el actual *`--avd-*`* — OKLCH, sobrio, el que manda según `CLAUDE.md`.

  Hoy conviven: **43 de los 91 `.tsx`** usan `--avd-*` y quedan **54 hex a pelo** repartidos
  por votación, proyección y analíticas. **Escribe siempre con `--avd-*`**, no toques el
  legado salvo para retirarlo, y no metas nada nuevo en él (§5.14).
- Cuatro familias tipográficas cargadas desde el CDN de Google (`Catamaran`, `Inter`,
  `JetBrains Mono`, `Plus Jakarta Sans`), contra la §3.2 y la §5.10–5.11.
- Recharts está en `^2.15.4` aquí y en `^3.7.0` en MCM Bank: las gráficas de las dos apps no
  se pueden copiar tal cual entre repos.

## 8. Deuda de diseño conocida

Los planes ejecutables viven en **`design-plans/`**, numerados y autocontenidos, con su tabla
de estado en `design-plans/README.md`. Un agente que venga a "arreglar diseño" empieza ahí.

| Plan | Qué |
|---|---|
| `001` | **Un solo sistema de color**: dejar `--avd-*` como única fuente y exponer los nombres semánticos (`--background`, `--primary`…) como alias sobre él, para que los componentes de shadcn sigan funcionando. Después borrar los tokens *Soft Oceanic* y el `--gradient-canvas` del `body` |
| `002` | **Los 54 hex a pelo** de `src/**/*.tsx` → tokens. Empezar por `voting/` y `projection/`, que es donde más se ven |
| `003` | **Quitar `--primary-glow`, `--shadow-primary`, `--shadow-accent` y `animate-pulse-glow`** (§5.4) |
| `004` | **Tipografías**: de cuatro familias por CDN a dos autoalojadas por Fontsource (§3.2). Mantener JetBrains Mono para códigos de papeleta |
| `005` | **Reescribir Visión+ sin `!important`**: hoy son 408 líneas que sobrescriben clase por clase de Tailwind (incluidas las arbitrarias tipo `text-[11.5px]`), así que **cualquier tamaño nuevo se escapa del modo en silencio**. La forma correcta es escalar la raíz y tener toda la tipografía en `rem` (§3.2, §3.7) |
| `006` | **Subir Recharts a `^3` para igualar con MCM Bank** y poder compartir componentes de gráfica |
