# 🗂️ Organización de Archivos del Proyecto

## 📚 Documentación (`/docs/`)

Toda la documentación técnica está organizada en la carpeta `/docs/`:

- **[README.md](./docs/README.md)** - Índice principal de documentación
- **[QUICK_START.md](./docs/QUICK_START.md)** - Guía rápida de despliegue
- **[EXECUTIVE_SUMMARY.md](./docs/EXECUTIVE_SUMMARY.md)** - Resumen ejecutivo
- **[MIGRATION_INSTRUCTIONS.md](./docs/MIGRATION_INSTRUCTIONS.md)** - Instrucciones de migraciones SQL
- **[VOTING_PAGE_IMPLEMENTATION_GUIDE.md](./docs/VOTING_PAGE_IMPLEMENTATION_GUIDE.md)** - Guía de implementación frontend
- **[REALTIME_ROUND_UPDATES.md](./docs/REALTIME_ROUND_UPDATES.md)** - Cambios clave del realtime consolidado
- **[IMPLEMENTATION_SUMMARY.md](./docs/IMPLEMENTATION_SUMMARY.md)** - Resumen técnico
- **[CHANGELOG.md](./docs/CHANGELOG.md)** - Historial de cambios v2.0.0

## 🗄️ Migraciones SQL (`/supabase/sqls/`)

### Archivo único (recomendado)
- **`upgrade-to-v2-0-0.sql`** ⭐
  Script combinado que ejecuta las migraciones 001–004 con avisos y validaciones básicas.
  **Uso**: Copiar y pegar completo en Supabase SQL Editor.

### Archivos Individuales (Para ejecución por pasos)
1. **`001-rename-expected-voters-to-max-votantes.sql`**
2. **`002-create-seats-table.sql`**
3. **`003-update-majority-to-fixed-threshold.sql`**
4. **`004-seats-management-api.sql`**

## 💻 Código Frontend

### Modificados ✅
- **`src/lib/device.ts`** - Fingerprinting mejorado
- **`src/components/VotingManagement.tsx`** - UI actualizada con max_votantes

### Pendientes ⏳
- **`src/components/VotingPage.tsx`** - Ver guía en `/docs/`
- **`src/components/DemoAdminDashboard.tsx`** - Actualizar max_votantes

## 🚀 Inicio Rápido

1. **Leer documentación**: `docs/QUICK_START.md`
2. **Ejecutar SQL**: `supabase/sqls/upgrade-to-v2-0-0.sql` (o seguir los pasos 001–004 del `README.md` de la carpeta `sqls/`).
3. **Implementar frontend**: Seguir `docs/VOTING_PAGE_IMPLEMENTATION_GUIDE.md`
4. **Desplegar**: Build y deploy normal

## 📊 Estado del Proyecto

- ✅ Migraciones SQL: Listas y probadas
- ✅ Fingerprinting: Implementado
- ✅ VotingManagement: Actualizado
- ⏳ VotingPage: Documentado (pendiente implementación)
- ⏳ DemoAdmin: Pendiente actualización

**Versión**: 2.0.0  
**Fecha**: 2025-10-10
