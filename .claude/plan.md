# Plan de Reestructuración y Optimización del Proyecto

## 1. Reorganización de Carpetas (Separación de Responsabilidades)
Actualmente hay vistas completas, enrutadores, componentes genéricos y archivos de diseño mezclados en `src/components/`.

**Acciones:**
*   **Mover "Páginas" a `src/pages/`**: Migrar las vistas principales como `LoginPage.tsx`, `RegisterPage.tsx`, `VotingPage.tsx`, `ProjectionPage.tsx`, `AdminDashboard.tsx`.
*   **Aislar Enrutamiento (`src/routes/` o `src/router/`)**: Mover `AppRouter.tsx`, `AdminRouter.tsx` y `ComunicaRouter.tsx` para centralizar la lógica de navegación.
*   **Agrupar Componentes por Feature**:
    *   `src/components/admin/` (ej. AdminVotingList, AdminVotingDetail, UserManagement)
    *   `src/components/voting/` (ej. BallotReview, CandidateCard, VoteSubmitAnimation)
    *   `src/components/auth/` (ej. AuthForm)
    *   `src/components/projection/` (ya existente, mantener y limpiar)
    *   `src/components/shared/` (ej. ThemeToggle)

## 2. Limpieza y Deuda Técnica
*   **Eliminar/Mover Archivos de Diseño**: Mover el contenido de `src/components/redesing-files/` (`dashboard.jsx`, `Prototipo.html`, `screens.jsx`) fuera del código fuente (ej. a una carpeta `docs/redesign/` en la raíz) o eliminarlos si están obsoletos.
*   **Unificar Hooks Duplicados**: Revisar la duplicidad de `use-toast.ts` entre `src/hooks/` y `src/components/ui/` (común con shadcn) y unificar los imports.
*   **Extracción de Tipos Globales**: Mover las interfaces extensas (modelos de rondas, usuarios, candidatos) a una nueva carpeta `src/types/` para compartir limpiamente entre componentes.

## 3. Optimización de Rendimiento (Code Splitting)
*   **Problema actual**: Carga monolítica. Los votantes en móviles descargan el panel de administración y las vistas de proyección.
*   **Acción**: Implementar Lazy Loading en los Routers (`AppRouter.tsx`).
    *   Envolver rutas pesadas con `React.lazy()` y `<Suspense>`.
    *   *Impacto*: Reducción drástica del tamaño del bundle inicial (TBT y LCP) para los votantes.

## 4. Limpieza de Estilos CSS
*   **Problema actual**: Abuso de estilos inline (`style={{ ... }}`) en componentes grandes como `AdminVotingList.tsx`.
*   **Acción**: Migrar progresivamente esos estilos a clases utilitarias de Tailwind o a variables/clases del archivo CSS principal (`avd-`).
    *   *Impacto*: Reducción de código JSX, DOM más ligero y soporte de temas más mantenible.

## Estructura Objetivo
```text
src/
 ├── assets/          (imágenes, svg, iconos)
 ├── components/      
 │    ├── ui/         (componentes de shadcn)
 │    ├── admin/      (AdminVotingList, etc.)
 │    ├── voting/     (BallotReview, CandidateCard, etc.)
 │    ├── projection/
 │    └── shared/     
 ├── contexts/        (AuthContext.tsx)
 ├── hooks/           (hooks unificados)
 ├── lib/             (supabase, utils, utilidades)
 ├── pages/           (VISTAS PRINCIPALES)
 ├── routes/          (AppRouter.tsx, AdminRouter.tsx)
 └── types/           (interfaces globales)
```