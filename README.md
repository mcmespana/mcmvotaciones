# 🗳️ MCM Votaciones

<div align="center">

![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6.svg?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg?logo=vite)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E.svg?logo=supabase)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Sistema de votaciones por rondas para Movimiento Consolación para el Mundo**  
*Pensado para votaciones que siguen el criterio del **Canon 119**: mitad + 1 para quedar elegido.*

[📚 Documentación](./docs/README.md) · [⚡ Inicio rápido](./docs/QUICK_START.md) · [🗳️ Guía funcional](./docs/VOTING_SYSTEM_GUIDE.md) · [🔐 Seguridad](./docs/SECURITY.md)

</div>

---

## 📖 Tabla de contenidos

- [✨ Qué permite hacer](#-qué-permite-hacer)
- [⚖️ Regla Canon 119](#️-regla-canon-119)
- [🚀 Inicio rápido](#-inicio-rápido)
- [🧭 Rutas principales](#-rutas-principales)
- [📚 Documentación](#-documentación)
- [📁 Estructura del proyecto](#-estructura-del-proyecto)
- [🛠️ Tecnologías](#️-tecnologías)
- [📝 Scripts disponibles](#-scripts-disponibles)
- [🔐 Seguridad para forks](#-seguridad-para-forks)
- [📄 Licencia](#-licencia)

---

## ✨ Qué permite hacer

### Para la mesa o equipo administrador
- 🔐 Acceder a un panel administrativo protegido.
- 🗳️ Crear votaciones con cupos, candidatos y puestos a cubrir.
- 👥 Añadir candidatos manualmente o importar desde CSV, JSON, XML o SinergiaCRM.
- 🚪 Abrir sala de espera antes de iniciar la ronda.
- ▶️ Iniciar, pausar, finalizar y encadenar rondas.
- 📊 Revisar resultados y papeletas por ronda.
- 📺 Proyectar resultados o papeletas en una pantalla pública.

### Para votantes
- 📱 Votar desde navegador móvil o escritorio.
- 🎫 Entrar con código de acceso cuando la votación lo requiere.
- ✅ Emitir una papeleta por ronda.
- 🔄 Recibir cambios de estado en tiempo real sin recargar la página.

### Para otras entidades que hagan fork
- 🧩 Cambiar textos, marca, tipos de votación y fuentes de candidatos.
- 🏗️ Desplegar con su propio proyecto Supabase.
- 🔌 Adaptar o quitar la integración CRM.
- 📘 Mantener una documentación clara sin depender del contexto interno de MCM.

---

## ⚖️ Regla Canon 119

El sistema selecciona candidatos por rondas. En cada ronda, una persona queda elegida si alcanza **la mitad + 1** de los votos previstos para esa ronda.

```text
umbral = floor(max_votantes / 2) + 1
```

| Cupos de votantes (`max_votantes`) | Umbral para quedar elegido |
|------------------------------------|----------------------------|
| 3 | 2 votos |
| 4 | 3 votos |
| 5 | 3 votos |
| 10 | 6 votos |
| 25 | 13 votos |

> 💡 **Idea clave**: el umbral se calcula sobre el cupo configurado, no sobre los votos emitidos.  
> Si hay 10 cupos y solo votan 7 personas, hacen falta 6 votos igualmente.

---

## 🚀 Inicio rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase

Crea `.env.local` a partir de `.env.example`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
```

### 3. Preparar base de datos

En Supabase SQL Editor:

1. Ejecuta `supabase/sqls/setup-database.sql`.
2. Aplica las migraciones numeradas de `supabase/sqls/` en orden.
3. Crea tu propio usuario administrador.

📌 Guía completa: [docs/QUICK_START.md](./docs/QUICK_START.md)  
🔧 Migraciones: [docs/MIGRATION_INSTRUCTIONS.md](./docs/MIGRATION_INSTRUCTIONS.md)

### 4. Arrancar en local

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:8080`.

---

## 🧭 Rutas principales

| Ruta | Para qué sirve | Público |
|------|----------------|---------|
| `/` | Pantalla de votación para participantes. | Sí |
| `/admin` | Panel de administración. | No |
| `/proyeccion` | Vista para proyectar resultados o papeletas. | Según despliegue |
| `/candidatos/:votingId` | Galería pública de candidatos, si se habilita. | Sí |
| `/comunica` | Importador opcional desde SinergiaCRM. | No |

### Preview local UI (sin Supabase)

Desde la ruta principal puedes forzar vistas de interfaz:

- `/?preview=tutorial` abre `VotingTutorial`.
- `/?preview=anim` abre `VoteSubmitAnimation`.
- `/?preview=ticket` abre el ticket de "Voto registrado" con papeleta demo.
- `/` vuelve al flujo normal.

---

## 📚 Documentación

| Documento | Descripción | Lectura |
|-----------|-------------|---------|
| [📚 docs/README.md](./docs/README.md) | Índice central de documentación. | 3 min |
| [⚡ QUICK_START.md](./docs/QUICK_START.md) | Pasos para levantar el proyecto. | 15 min |
| [🗳️ VOTING_SYSTEM_GUIDE.md](./docs/VOTING_SYSTEM_GUIDE.md) | Explicación funcional del sistema por rondas. | 15 min |
| [🔧 MIGRATION_INSTRUCTIONS.md](./docs/MIGRATION_INSTRUCTIONS.md) | Instalación y migraciones SQL. | 20 min |
| [📥 COMUNICA_IMPORT_GUIDE.md](./docs/COMUNICA_IMPORT_GUIDE.md) | Importación opcional desde SinergiaCRM. | 10 min |
| [🔐 SECURITY.md](./docs/SECURITY.md) | Qué no publicar en un repo público. | 5 min |
| [🔄 REALTIME_ROUND_UPDATES.md](./docs/REALTIME_ROUND_UPDATES.md) | Cómo se sincronizan los cambios en tiempo real. | 5 min |

---

## 📁 Estructura del proyecto

```text
mcmvotaciones/
├── docs/                    # 📚 Documentación del proyecto
├── files/                   # 📄 Ejemplos de importación de candidatos
├── public/                  # 🖼️ Iconos, manifest y assets públicos
├── src/
│   ├── components/          # 🧩 Componentes UI y features
│   │   ├── admin/           # Panel administrativo
│   │   ├── projection/      # Pantallas de proyección
│   │   ├── ui/              # Primitivas shadcn/ui
│   │   └── voting/          # Componentes de votación
│   ├── contexts/            # Estado global de auth
│   ├── hooks/               # Hooks compartidos
│   ├── lib/                 # Supabase, reglas, formatos y utilidades
│   ├── pages/               # Vistas de rutas
│   └── routes/              # Routers protegidos
└── supabase/
    ├── functions/           # Edge Functions opcionales
    └── sqls/                # Instalación y migraciones
```

---

## 🛠️ Tecnologías

| Área | Herramientas |
|------|--------------|
| Frontend | React, TypeScript, Vite |
| UI | Tailwind CSS, shadcn/ui, Radix UI, lucide-react |
| Estado remoto | TanStack Query |
| Backend | Supabase, PostgreSQL, RPC SQL |
| Tiempo real | Supabase Realtime |
| Despliegue | Vite build + hosting estático |

---

## 📝 Scripts disponibles

```bash
npm run dev        # Servidor local
npm run build      # Build de producción
npm run build:dev  # Build en modo development
npm run preview    # Preview del build
npm run lint       # ESLint
```

> 🧪 No hay suite formal de tests todavía. Para cambios funcionales, valida manualmente los flujos de login, creación de votación, emisión de voto, cierre de ronda, resultados y segunda ronda.

---

## 🔐 Seguridad para forks

Este repo es público. Eso está bien, pero exige cuidado:

- ❌ No subas `.env.local`, passwords, tokens ni claves `service_role`.
- ❌ No publiques datos reales de votantes o candidatos.
- ✅ Usa secrets de Supabase para credenciales CRM.
- ✅ Crea tu propio admin inicial; no uses passwords compartidas.
- ✅ Rota cualquier credencial que haya aparecido alguna vez en Git.

📌 Checklist completa: [docs/SECURITY.md](./docs/SECURITY.md)

---

## 📄 Licencia

MIT. Consulta [LICENSE](./LICENSE).

---

<div align="center">

**Desarrollado para Movimiento Consolación para el Mundo**

</div>
