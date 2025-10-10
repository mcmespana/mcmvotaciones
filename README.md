# 🗳️ MCM Votaciones

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6.svg?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-Latest-646CFF.svg?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?logo=supabase)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Sistema de votación en línea para el Movimiento Cultural Misionero (MCM)**  
*Con soporte para múltiples rondas de votación, **cupos fijos** y **umbral de selección inteligente***

[📚 Documentación](./docs/README.md) • [🚀 Inicio Rápido](./docs/QUICK_START.md) • [🔧 Migración](./docs/MIGRATION_INSTRUCTIONS.md)

</div>

---

## 📖 Tabla de Contenidos

- [✨ Características](#-características)
- [📚 Documentación](#-documentación)
- [🚀 Inicio Rápido](#-inicio-rápido)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [🛠️ Tecnologías](#️-tecnologías)
- [📝 Scripts Disponibles](#-scripts-disponibles)
- [🔧 Configuración](#-configuración)
- [🧪 Testing](#-testing)
- [📄 Licencia](#-licencia)

---

## ✨ Características

### Core
- 🔐 Sistema de autenticación para administradores
- 📊 Panel de administración completo
- 🗳️ Votaciones con múltiples rondas eliminatorias
- 👥 Gestión de candidatos (agregar, editar, importar desde CSV/XML/JSON)
- 📱 Interfaz responsiva y moderna
- 🔄 Actualizaciones en tiempo real
- 📈 Estadísticas y monitoreo de votaciones

### Nuevas en v2.0.0 🎉
- 🎫 **Sistema de cupos fijos**: Control de número máximo de votantes por ronda
- 🔒 **Bloqueo por dispositivo**: Fingerprinting robusto con WebGL, Canvas, etc.
- 🔢 **Umbral de selección inteligente**: Basado en cupos, no en votos emitidos
- 🔄 **Reconexión automática**: Ventana de gracia de 10 minutos
- ⏰ **Expiración por inactividad**: Asientos se liberan automáticamente
- 🛡️ **Seguridad mejorada**: Browser instance ID persistente

## � Documentación

> **🎯 Toda la documentación está organizada en la carpeta [`docs/`](./docs/)**

| Documento | Descripción | Tiempo |
|-----------|-------------|---------|
| [**QUICK_START.md**](./docs/QUICK_START.md) | Pasos mínimos para levantar el entorno local. | ⏱️ 30 min |
| [**MIGRATION_INSTRUCTIONS.md**](./docs/MIGRATION_INSTRUCTIONS.md) | Procedimiento detallado de migraciones con validaciones. | 🔧 45 min |
| [**REALTIME_ROUND_UPDATES.md**](./docs/REALTIME_ROUND_UPDATES.md) | Cómo se asegura la sincronización automática de rondas. | 🔄 5 min |
| [**VOTING_PAGE_IMPLEMENTATION_GUIDE.md**](./docs/VOTING_PAGE_IMPLEMENTATION_GUIDE.md) | Implementación completa de la página de votación. | 💻 30 min |
| [**PROJECT_STRUCTURE.md**](./docs/PROJECT_STRUCTURE.md) | Convenciones de carpetas y módulos del repositorio. | 🗂️ 10 min |
| [**CHANGELOG.md**](./docs/CHANGELOG.md) | Historial resumido de cambios relevantes. | 📝 5 min |

> Para una visión ejecutiva consulta [`docs/EXECUTIVE_SUMMARY.md`](./docs/EXECUTIVE_SUMMARY.md).

**📖 Índice completo**: [`docs/README.md`](./docs/README.md)

## �🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

**⚠️ IMPORTANTE**: Antes de ejecutar la aplicación, debes configurar tu proyecto de Supabase.

#### Para proyectos nuevos:
1. Crea un proyecto en [https://app.supabase.com/](https://app.supabase.com/)
2. Copia las credenciales (URL y anon key)
3. Crea un archivo `.env.local` en la raíz del proyecto:
   ```bash
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```
4. Ejecuta el script `setup-database.sql` en el SQL Editor de Supabase.
5. **[NUEVO v2.0.0]** Ejecuta las migraciones:
   - **Opción A (recomendada)**: `supabase/sqls/upgrade-to-v2-0-0.sql` (incluye los pasos 001–004).
   - **Opción B**: Ejecuta los 4 archivos SQL individuales en orden (`001`, `002`, `003`, `004`).

#### Para actualizar proyectos existentes a v2.0.0:
📚 **Lee la documentación completa**: [`docs/README.md`](./docs/README.md)

**Resumen**:
1. Crear backup de base de datos.
2. Ejecutar migraciones SQL (`supabase/sqls/upgrade-to-v2-0-0.sql`).
3. Desplegar frontend actualizado
4. Validar con tests de aceptación

⏱️ **Tiempo estimado**: 60-90 minutos  
📖 **Guía rápida**: [`docs/QUICK_START.md`](./docs/QUICK_START.md)

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:8080`

## 📁 Estructura del Proyecto

```
mcmvotaciones/
├── docs/                    # 📚 Documentación completa
│   ├── README.md            # Índice de documentación
│   ├── QUICK_START.md
│   ├── EXECUTIVE_SUMMARY.md
│   ├── MIGRATION_INSTRUCTIONS.md
│   ├── REALTIME_ROUND_UPDATES.md
│   ├── VOTING_PAGE_IMPLEMENTATION_GUIDE.md
│   ├── PROJECT_STRUCTURE.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── CHANGELOG.md
├── src/
│   ├── components/          # Componentes React
│   │   ├── ui/              # Componentes shadcn/ui
│   │   ├── VotingPage.tsx   # Página de votación
│   │   ├── VotingManagement.tsx
│   │   └── AdminDashboard.tsx
│   ├── lib/
│   │   ├── device.ts        # 🆕 Fingerprinting robusto
│   │   └── supabase.ts
│   └── hooks/               # Custom React hooks
├── supabase/
│   └── sqls/                # Scripts SQL
│       ├── README.md                        # Orden y propósito de cada script
│       ├── upgrade-to-v2-0-0.sql            # ⭐ Migración combinada v2.0.0
│       ├── 001-rename-expected-voters-to-max-votantes.sql
│       ├── 002-create-seats-table.sql
│       ├── 003-update-majority-to-fixed-threshold.sql
│       ├── 004-seats-management-api.sql
│       └── … (scripts de soporte)
└── PROJECT_STRUCTURE.md     # Guía detallada de organización
```

**📖 Ver estructura completa**: [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md)

## 🛠️ Tecnologías

### Frontend
- ⚛️ **React 18+** - Biblioteca UI
- 📘 **TypeScript 5+** - Type safety
- ⚡ **Vite** - Build tool y dev server
- 🎨 **Tailwind CSS** - Estilos utility-first
- 🧩 **shadcn/ui** - Componentes reutilizables
- 🔄 **React Router DOM** - Enrutamiento

### Backend
- 🐘 **PostgreSQL 14+** - Base de datos (Supabase)
- 🔐 **Supabase Auth** - Autenticación
- 🔄 **Supabase Realtime** - Subscripciones en tiempo real
- 📡 **Supabase RPC** - Funciones remotas

### Seguridad y Fingerprinting
- 🖥️ **WebGL Fingerprinting** - GPU vendor/renderer
- 🎨 **Canvas Fingerprinting** - Identificación única
- 🍪 **LocalStorage + Cookies** - Persistencia browser instance ID
- 🔒 **Device Hash** - Combinación de múltiples atributos

## 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo (puerto 8080)
npm run dev:host         # Servidor con acceso desde red local

# Build
npm run build            # Build de producción
npm run build:dev        # Build en modo desarrollo (con sourcemaps)

# Preview
npm run preview          # Preview del build de producción

# Calidad de código
npm run lint             # Ejecuta ESLint
npm run type-check       # Verifica tipos TypeScript
```

## 🔧 Configuración

### Variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

**⚠️ Importante**: 
- Solo las variables prefijadas con `VITE_` son expuestas al cliente
- Nunca commitees el archivo `.env.local`
- El archivo `.env.example` sirve como plantilla

### Configuración de Vite

El proyecto usa el path alias `@` → `src/`. Ejemplo:

```typescript
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
```

Ver [`vite.config.ts`](./vite.config.ts) y [`tsconfig.json`](./tsconfig.json) para más detalles.

### Configuración de Tailwind

Los tokens de diseño están en [`tailwind.config.ts`](./tailwind.config.ts):
- Colores: `primary`, `secondary`, `accent`, etc.
- Espaciado: Sistema consistente de spacing
- Border radius: `--radius` personalizable

## 🧪 Testing

**Estado actual**: No hay suite de tests formal.

**Validación recomendada**:
1. Smoke test en desarrollo: `npm run dev`
2. Validar flujos clave manualmente
3. Preview de producción: `npm run preview`
4. Tests de aceptación v2.0.0: Ver [`docs/MIGRATION_INSTRUCTIONS.md`](./docs/MIGRATION_INSTRUCTIONS.md)

**Futuro**: Se recomienda Vitest + React Testing Library.

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Este proyecto sigue convenciones estándar de desarrollo.

**📖 Lee la guía completa**: [`CONTRIBUTING.md`](./CONTRIBUTING.md)

**Resumen rápido**:
- ✅ Fork el repositorio
- ✅ Crea una rama para tu feature/fix
- ✅ Sigue las convenciones de código y commits
- ✅ Ejecuta `npm run lint` antes de hacer PR
- ✅ Incluye descripción clara y tests

**Convenciones de commits**:
```bash
feat:     nueva funcionalidad
fix:      corrección de bug
refactor: refactorización sin cambios funcionales
docs:     cambios en documentación
style:    formato, espacios, etc.
test:     agregar o modificar tests
chore:    tareas de mantenimiento
```

**Recursos para desarrolladores**:
- � [CONTRIBUTING.md](./CONTRIBUTING.md) - Guía completa de contribución
- 🤖 [AGENTS.md](./AGENTS.md) - Guías para desarrollo con AI agents
- 🗂️ [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - Organización del proyecto

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [`LICENSE`](./LICENSE) para más detalles.

---

## 🔗 Enlaces Útiles

### Documentación
- 📖 [Índice de documentación](./docs/README.md) - Hub central
- 🚀 [Guía de inicio rápido](./docs/QUICK_START.md) - 5 pasos para deployment
- 📊 [Resumen ejecutivo v2.0.0](./docs/EXECUTIVE_SUMMARY.md) - Overview completo
- 🔧 [Instrucciones de migración](./docs/MIGRATION_INSTRUCTIONS.md) - Paso a paso con tests
- 💻 [Guía de implementación VotingPage](./docs/VOTING_PAGE_IMPLEMENTATION_GUIDE.md) - Código completo
- � [Historial de cambios](./docs/CHANGELOG.md) - What's new en v2.0.0

### Desarrollo
- 🤝 [Guía de contribución](./CONTRIBUTING.md) - Cómo contribuir al proyecto
- �🗂️ [Estructura del proyecto](./PROJECT_STRUCTURE.md) - Organización de archivos
- 🤖 [Guías para AI agents](./AGENTS.md) - Contexto para desarrollo asistido
- 🔍 [Debugging en tiempo real](./DEBUGGING_REALTIME.md) - Troubleshooting Supabase

---

**Desarrollado con ❤️ para el Movimiento Cultural Misionero**
