# 007 · Verificar en uso el efecto del `@theme`

**Superficie:** votante, proyección, administración · **Riesgo:** ninguno (es mirar, no tocar)
**Depende de:** nada · **Hazlo ANTES que cualquier otro plan de esta carpeta**

## Contexto

El 2026-09-02 se arregló que `tailwind.config.ts` no se estuviera cargando (ver `001` y
`design.md` §8). El arreglo **encendió de golpe 334 aplicaciones de color** que llevaban
quién sabe cuánto tiempo sin aplicarse: `text-muted-foreground` 45 veces,
`border-outline-variant` 34, `text-foreground` 23, `text-avd-fg-muted` 34…

Está verificado por build y sobre el CSS que sirve Vercel: las clases existen y los valores
son los correctos. **Lo que no está verificado es cómo queda en pantalla**, porque quien lo
hizo no tenía credenciales de Supabase y solo alcanzaba la pantalla de carga.

Lo esperable es que se vea **mejor**: es lo que el código pretendía desde el principio, y lo
que estaba pasando es que los textos secundarios salían del mismo color que los principales.
Pero «lo esperable» no es «lo comprobado», y esta app se proyecta delante de una sala llena
de gente. Antes de construir nada encima conviene mirarlo.

## Qué hacer

Entrar con credenciales reales y recorrer las tres superficies, **en claro y en oscuro**,
buscando específicamente texto que ahora tenga un color distinto del que tenía:

| Superficie | Qué mirar |
|---|---|
| **Proyección** (`/proyeccion`) | La más importante y la más arriesgada: es siempre oscura y se ve a diez metros. Que nada haya perdido contraste, y que los colores de voto (`--vote-color-*`) sigan distinguiéndose entre sí desde el fondo de la sala |
| **Votante** (`/`, `/candidatos/:id`) | Que la jerarquía se lea: lo principal destaca sobre lo secundario. Y con **Visión+ activado**, que es donde más texto hay en pantalla |
| **Administración** (`/admin/*`) | La más densa: tablas, analíticas, importación desde el CRM. Es donde más `text-avd-fg-muted` y `border-outline-variant` hay |

Presta atención a dos cosas concretas:

1. **Bordes que antes no existían.** `border-outline-variant` aparece 34 veces y no pintaba
   nada. Ahora sí. Si alguna tarjeta o tabla se ve «más rayada» de lo que debería, es esto.
2. **Texto que antes era del color del padre.** `text-muted-foreground` y `text-foreground`
   sumaban 68 usos. Donde el padre ya tenía un color deliberado, el hijo ahora puede
   contrastar de forma no prevista.

## Qué hacer con lo que encuentres

- Si algo se ve **mejor o igual**: cierra este plan como DONE y sigue con el `002`.
- Si algo se ve **peor**: no revertir el `@theme` —eso devolvería el fallo—. Lo que hay que
  arreglar es el sitio concreto, quitando la clase que sobra o cambiándola por la que toca.
  Anótalo como plan nuevo si son más de dos o tres sitios.

## Qué NO tocar

No vuelvas a poner `@config` ni quites el `@theme`: son lo que hace que las clases existan.
Y no toques `--vote-color-*`: son los colores oficiales de las opciones de voto y no forman
parte del cromo.

## Validación

Que quede escrito aquí qué se ha mirado y con qué resultado, con la fecha. Si no se puede
entrar con credenciales, dilo en vez de marcarlo como hecho: un plan de verificación que se
cierra sin verificar es peor que uno abierto.

---

## Resultado (2026-09-04) — PARCIAL

**No se puede cerrar como hecho: siguen sin haber credenciales de Supabase en el entorno.**
Este plan dice explícitamente que un plan de verificación cerrado sin verificar es peor que
uno abierto, así que queda abierto.

### Lo que sí se ha podido mirar

`/test` (Test Kitchen) monta componentes de votante con datos falsos y **sin Supabase**. Eso
da acceso a `VoteTicket`, `SeatValidated`, `VotingTutorial`, `VoteSubmitAnimation` y
`ProjectionBallotAnimation`. Recorridos en Chromium, en claro y en oscuro, a 900 y 390 px:

- **La jerarquía se lee** en los dos temas: lo secundario (`text-avd-fg-muted`,
  `text-muted-foreground`) queda claramente por debajo de lo principal, que es justo lo que el
  `@theme` encendió. No se ha visto ningún texto que haya perdido contraste.
- **Ningún borde nuevo indeseado.** Las tarjetas y los separadores se ven como deben.
- **Los colores de voto se distinguen entre sí** en la animación de envío y en el tutorial.
- Cero errores de consola.

También se han mirado las dos gráficas de `ResultsAnalytics` montadas aparte (`006`), que es
donde más `text-avd-fg-muted` y `border-outline-variant` hay: correctas.

### Lo que sigue sin mirarse

- **Proyección** (`/proyeccion`) — la más importante y la más arriesgada, y la que necesita
  datos de una votación real.
- **Votante completo** (`/`, `/candidatos/:id`) — entrar con código, lista de candidatos,
  detalle, votar. Y con Visión+ activado, que además ahora hace algo por primera vez (`005`).
- **Administración** (`/admin/*`) — la más densa.

### Para quien lo retome

Con un `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` y una votación de
prueba, esto es media hora. La forma de mirarlo está montada: `npm run dev`, y las capturas
en claro/oscuro salen con Playwright y el Chromium de `/opt/pw-browsers/chromium`.

Ojo a un cambio nuevo que también hay que mirar en uso, del `001`: el `body` ya no lleva
degradado, el radio base pasa de 1 rem a 10 px y catorce tokens que no existían —entre ellos
`--overlay`, que es el velo de los modales— ahora sí pintan.
