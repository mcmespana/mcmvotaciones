# Inventario de Pantallas, Menus y Modales

## Alcance

Este inventario resume las superficies de UI detectadas en la app React actual:

- Pantallas por ruta.
- Pantallas por estado/flujo dentro de componentes principales.
- Menus o navegacion interna (tabs, selectores de seccion, acciones de cabecera).
- Modales/dialogos activos.

## 1) Pantallas

### 1.1 Pantallas por rutas principales

| Ruta | Pantalla / Componente | Notas |
|---|---|---|
| `/` | `VotingPage` | Flujo principal de votacion para usuarios. |
| `/proyeccion` | `ProjectionPage` | Pantalla de proyeccion en vivo (espera, votacion, resultados). |
| `/admin/*` | `AdminRouter` | Router protegido para admin (auth, dashboard, detalle, demo). |
| `/comunica/*` | `ComunicaRouter` | Router protegido para importacion desde SinergiaCRM. |
| `*` | `NotFound` | Pantalla 404. |

### 1.2 Subpantallas por rutas anidadas (Admin)

| Ruta anidada | Pantalla / Componente | Condicion |
|---|---|---|
| `/admin/` y `/admin/dashboard` | `AdminDashboard` | Usuario admin autenticado. |
| `/admin/votaciones/:roundId` | `AdminVotingDetail` | Usuario admin autenticado. |
| `/admin/demo` | `DemoAdminDashboard` | Cuando Supabase no esta configurado. |
| `/admin/*` | `DemoPage` | Fallback en modo demo (sin Supabase). |
| `/admin/*` | `AuthForm` | Si no hay sesion admin. |

### 1.3 Subpantallas por rutas anidadas (Comunica)

| Ruta anidada | Pantalla / Componente | Condicion |
|---|---|---|
| `/comunica/*` | `ComunicaImport` | Admin autenticado y Supabase configurado. |
| `/comunica/*` | `AuthForm` | Si no hay sesion admin. |
| `/comunica/*` | Vista de estado | Pantallas de `loading`, `acceso denegado` o `supabase no configurado`. |

### 1.4 Pantallas por estado en VotingPage

Dentro de `/` (`VotingPage`) hay multiples vistas condicionales:

- Cargando votacion.
- Navegador no disponible para votar (`isVotingAvailable`).
- Sin votacion activa.
- Verificacion de codigo de acceso (`AccessCodeInput`).
- Cargando/validando asiento de sala.
- Error de asiento.
- Sin candidatos disponibles para la ronda.
- Esperando apertura de votacion (`is_voting_open = false`).
- Ronda cerrada/finalizada sin resultados visibles.
- Vista de resultados para votantes cuando aplica (`show_results_to_voters && round_finalized`).
- Confirmacion post-voto (resumen de papeleta y codigo de verificacion).
- Vista normal de emision de voto (seleccion + barra fija inferior).

### 1.5 Pantallas por estado en ProjectionPage

`ProjectionPage` alterna 3 superficies:

- `ProjectionWaiting`.
- `ProjectionVoting`.
- `ProjectionResults`.

## 2) Menus y navegacion interna

### 2.1 Menus principales

- Navegacion por rutas definida en `App.tsx`.
- Enrutado protegido con `AdminRouter` y `ComunicaRouter`.

### 2.2 Menus por tabs

| Componente | Menu tipo tabs | Secciones |
|---|---|---|
| `AdminDashboard` | Tabs principal | `Dashboard`, `Votaciones`, `Usuarios` (solo super admin). |
| `DemoAdminDashboard` | Tabs principal demo | `Dashboard`, `Votaciones`, `Usuarios`. |
| `DemoAdminDashboard` | Tabs secundario en Votaciones | `Votaciones`, `Candidatos`, `Monitoreo`. |

### 2.3 Menus/selectores de contexto

- `BallotReview`:
  - Selector de votacion (`Select`), cuando no esta bloqueado por `lockedRoundId`.
  - Selector de numero de ronda (`Select`), cuando hay mas de una ronda.
- `ComunicaImport`:
  - Selector de votacion destino.
  - Filtro de tipos de relacion (checkbox + chips + input para agregar tipo).
  - Navegacion de wizard por pasos (`select-round` -> `confirm-fetch` -> `review` -> `importing` -> `done`).

### 2.4 Acciones tipo menu (sin componente Menu explicito)

- `AdminDashboard`: acciones de cabecera y tarjetas de accion rapida.
- `AdminVotingDetail`: acciones de gestion (configuracion, candidatos, importaciones, analitica, papeletas).
- `VotingPage`: boton de ayuda `Como votar?` y barra fija con acciones `Limpiar` / `Votar`.

## 3) Modales y dialogos

### 3.1 Modales en flujo de votacion publico

| Componente | Tipo | Modal / Dialogo |
|---|---|---|
| `VotingPage` | `AlertDialog` | Confirmar voto antes de enviar. |
| `VoteSubmitAnimation` | `Dialog` | Animacion bloqueante de envio seguro de voto. |
| `VotingTutorial` | `Dialog` | Tutorial paso a paso de como votar. |

### 3.2 Modales en Admin (gestion de votaciones)

| Componente | Tipo | Modal / Dialogo |
|---|---|---|
| `AdminVotingList` | `Dialog` | Crear nueva votacion. |
| `AdminVotingDetail` | `Dialog` | Configuracion de votacion. |
| `AdminVotingDetail` | `Dialog` | Anadir candidato. |
| `AdminVotingDetail` | `Dialog` | Editar candidato. |
| `AdminVotingDetail` | `Dialog` | Importar candidatos desde archivo. |
| `AdminVotingDetail` | `Dialog` | Cargar dataset de ejemplo. |
| `AdminVotingDetail` | Overlay custom | Analisis de resultados (modal fullscreen custom). |
| `AdminVotingDetail` | Overlay custom | Revision de papeletas (modal fullscreen custom). |

### 3.3 Modales en revision de papeletas

| Componente | Tipo | Modal / Dialogo |
|---|---|---|
| `BallotReview` | `Dialog` | Invalidar papeleta (motivo). |
| `BallotReview` | `Dialog` | Detalle de papeleta por dispositivo. |
| `BallotReview` | `AlertDialog` | Restaurar papeleta invalidada. |

### 3.4 Modales en Comunica

| Componente | Tipo | Modal / Dialogo |
|---|---|---|
| `ComunicaImport` | `AlertDialog` | Confirmar importacion de candidatos. |

## 4) Componentes detectados pero no enroutados actualmente

- `VotingManagement` contiene varios `Dialog` y tabs, pero no aparece conectado al enrutado activo.
- Se recomienda tratarlo como modulo legado o en desarrollo, fuera del flujo actual de usuario.

## 5) Archivos base usados para este inventario

- `src/App.tsx`
- `src/components/AdminRouter.tsx`
- `src/components/ComunicaRouter.tsx`
- `src/components/VotingPage.tsx`
- `src/components/ProjectionPage.tsx`
- `src/components/projection/ProjectionResults.tsx`
- `src/components/AdminDashboard.tsx`
- `src/components/AdminVotingList.tsx`
- `src/components/AdminVotingDetail.tsx`
- `src/components/BallotReview.tsx`
- `src/components/VotingTutorial.tsx`
- `src/components/VoteSubmitAnimation.tsx`
- `src/components/ComunicaImport.tsx`
- `src/components/AuthForm.tsx`
- `src/components/DemoPage.tsx`
- `src/components/DemoAdminDashboard.tsx`
- `src/pages/NotFound.tsx`
