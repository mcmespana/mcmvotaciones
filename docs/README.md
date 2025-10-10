# 📚 Documentación del Sistema de Cupos y Umbral Fijo

Bienvenido a la documentación del Sistema de Votaciones MCM versión 2.0.0.

## 🎉 ¿Qué hay de nuevo?

**[📝 Release Notes v2.0.0](../RELEASE_NOTES_v2.0.0.md)** - Características completas, breaking changes y guía de actualización

## 🚀 Inicio Rápido

**Para implementar inmediatamente**: Lee [`QUICK_START.md`](./QUICK_START.md)

**Tiempo estimado**: 60-90 minutos  
**Nivel**: Intermedio

---

## 📖 Índice de Documentación

### Para Desarrolladores

1. **[QUICK_START.md](./QUICK_START.md)** ⚡  
   Guía rápida para desplegar el sistema en 5 pasos.
   - Ejecutar migraciones SQL
   - Verificar archivos frontend
   - Implementar VotingPage.tsx
   - Testing básico
   - Deploy

2. **[EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)** 📊  
   Resumen ejecutivo completo del proyecto.
   - Descripción de cambios
   - Archivos creados/modificados
   - Plan de despliegue detallado
   - Métricas de éxito
   - Consideraciones de seguridad

3. **[MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md)** 🔧  
   Instrucciones detalladas para ejecutar migraciones SQL.
   - 4 migraciones con orden específico
   - Scripts de validación
   - Tests post-migración completos
   - Procedimientos de rollback
   - Configuración de jobs de mantenimiento

4. **[VOTING_PAGE_IMPLEMENTATION_GUIDE.md](./VOTING_PAGE_IMPLEMENTATION_GUIDE.md)** 💻  
   Código completo para implementar gestión de asientos en VotingPage.tsx.
   - Interfaces TypeScript
   - Funciones de join/verify seat
   - Heartbeat automático
   - Manejo de errores
   - Componentes UI

5. **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** 📝  
   Resumen técnico de toda la implementación.
   - Estado de cada tarea
   - Funciones SQL creadas
   - Criterios de aceptación
   - Notas importantes

6. **[CHANGELOG.md](./CHANGELOG.md)** 📋  
   Historial completo de cambios versión 2.0.0.
   - Nuevas características
   - Breaking changes
   - Migraciones necesarias
   - Métricas esperadas

### Release Notes

**[RELEASE_NOTES_v2.0.0.md](../RELEASE_NOTES_v2.0.0.md)** 🎉  
Release notes oficiales con formato visual.
- Características principales (antes/después)
- Breaking changes detallados
- Guía de actualización
- Tests de aceptación
- Archivos nuevos/modificados

### Fixes y Troubleshooting

7. **[FIX_REALTIME_ROUND_UPDATES.md](./FIX_REALTIME_ROUND_UPDATES.md)** 🔄  
   Fix: Actualizaciones en tiempo real de rondas.
   - Problema: Usuarios tenían que recargar para ver nuevas rondas
   - Solución: Suscripción a eventos INSERT + UPDATE
   - Testing y verificación
   - Logs de debug

8. **[RESUMEN_FIX_REALTIME.md](./RESUMEN_FIX_REALTIME.md)** ✅  
   Resumen ejecutivo del fix de real-time.
   - Comparación antes/después
   - Flujo de eventos
   - Experiencia de usuario mejorada
   - Métricas de éxito

---

## 🎯 ¿Qué documento leer según tu objetivo?

| Tu objetivo | Documento recomendado | Tiempo |
|-------------|----------------------|---------|
| Desplegar rápidamente | [QUICK_START.md](./QUICK_START.md) | 10 min lectura |
| Entender cambios completos | [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md) | 15 min lectura |
| Ejecutar migraciones SQL | [MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md) | 20 min lectura + 15 min ejecución |
| Implementar frontend | [VOTING_PAGE_IMPLEMENTATION_GUIDE.md](./VOTING_PAGE_IMPLEMENTATION_GUIDE.md) | 30 min |
| Ver estado técnico | [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | 10 min lectura |
| Revisar historial | [CHANGELOG.md](./CHANGELOG.md) | 15 min lectura |

---

## 🔍 Resumen de Cambios Principales

### Necesidad 1: Umbral Fijo de Selección ✅
Un candidato ahora necesita **`ceil(0.5 * max_votantes)`** votos para ser seleccionado, independientemente de cuántos voten.

**Ejemplo**:
- `max_votantes = 3` → umbral = 2 votos necesarios
- Si solo 1 persona vota por 3 candidatos → **0 candidatos seleccionados**

### Necesidad 2: Sistema de Cupos con Bloqueo ✅
Cada ronda tiene un número fijo de "asientos" (`max_votantes`). Solo los dispositivos que obtienen un asiento pueden votar.

**Características**:
- Fingerprinting robusto (WebGL, Canvas, etc.)
- Bloqueo por cambio de dispositivo/navegador
- Ventana de gracia de 10 minutos para reconexión
- Expiración automática por inactividad

---

## 📁 Estructura de Archivos

```
docs/
├── README.md (este archivo)
├── QUICK_START.md
├── EXECUTIVE_SUMMARY.md
├── MIGRATION_INSTRUCTIONS.md
├── VOTING_PAGE_IMPLEMENTATION_GUIDE.md
├── IMPLEMENTATION_SUMMARY.md
└── CHANGELOG.md

supabase/sqls/
├── 001-rename-expected-voters-to-max-votantes.sql
├── 002-create-seats-table.sql
├── 003-update-majority-to-fixed-threshold.sql
└── 004-seats-management-api.sql

src/
├── lib/
│   └── device.ts (✅ modificado)
└── components/
    ├── VotingManagement.tsx (✅ modificado)
    └── VotingPage.tsx (⏳ pendiente - ver guía)
```

---

## ⚠️ Antes de Comenzar

### Requisitos Previos
- ✅ Acceso a Supabase SQL Editor
- ✅ Conocimientos básicos de PostgreSQL
- ✅ Conocimientos de React + TypeScript
- ✅ Entorno de desarrollo configurado

### ⚠️ Advertencias Importantes
1. **Breaking changes**: La columna `expected_voters` se renombra a `max_votantes`
2. **Downtime**: Las migraciones requieren ~15 min sin acceso a votaciones
3. **Sincronización**: DB y frontend deben desplegarse juntos
4. **Backup**: Crear backup completo antes de migrar

---

## 🆘 Soporte

### Errores Comunes

**"expected_voters does not exist"**
- Frontend desplegado sin ejecutar migraciones
- ✅ Solución: Ejecutar migraciones SQL primero

**"function join_round_seat does not exist"**
- Migración 004 no ejecutada correctamente
- ✅ Solución: Revisar SQL Editor History en Supabase

**Votantes bloqueados incorrectamente**
- Problema con localStorage/cookies
- ✅ Solución: Verificar consola del navegador (F12)

### Contacto
Para problemas no documentados:
1. Revisar logs de Supabase: Dashboard → SQL Editor → History
2. Consultar sección "Solución de Problemas" en cada documento
3. Ejecutar scripts de validación incluidos

---

## ✅ Checklist de Despliegue

- [ ] Leído QUICK_START.md
- [ ] Creado backup de base de datos
- [ ] Ejecutadas 4 migraciones SQL en orden
- [ ] Validadas migraciones con tests
- [ ] Desplegado frontend actualizado
- [ ] Configurado job de mantenimiento
- [ ] Ejecutados tests de aceptación (CA1-CA7)
- [ ] Verificadas métricas post-despliegue
- [ ] Actualizada documentación de usuario

---

## 📈 Métricas de Éxito

Después del despliegue, validar:
- ✅ 0% de candidatos seleccionados con votos < umbral
- ✅ 0% de votantes sobre cupo `max_votantes`
- ✅ <1% de errores SEAT_MISMATCH legítimos
- ✅ >95% de reingresos exitosos en ventana de gracia
- ✅ Tiempo de respuesta funciones SQL <100ms

---

## 🎓 Aprende Más

### Conceptos Clave

**Umbral Fijo**
```
umbral = CEIL(0.5 * max_votantes)

Ejemplos:
max_votantes=3 → umbral=2
max_votantes=5 → umbral=3
max_votantes=10 → umbral=5
```

**Fingerprinting**
```typescript
fingerprint = hash(
  userAgent + platform + vendor +
  screenResolution + timezone +
  deviceMemory + hardwareConcurrency +
  webGL + canvas + maxTouchPoints
)
```

**Asiento (Seat)**
```
Un "asiento" representa un cupo asignado a un
dispositivo+navegador específico para votar en
una ronda. Es único y no transferible.
```

---

## 🔜 Roadmap Futuro

- [ ] OTP por email/SMS para navegadores privados
- [ ] Dashboard de monitoreo en tiempo real
- [ ] Sistema de lista de espera para cupos llenos
- [ ] Notificaciones push de disponibilidad
- [ ] Exportación de auditoría de asientos
- [ ] Soporte multi-idioma en mensajes

---

**Versión**: 2.0.0  
**Fecha**: 2025-10-10  
**Estado**: ✅ Listo para despliegue

---

## 🚀 ¡Comienza Ahora!

👉 **Lee [QUICK_START.md](./QUICK_START.md) para empezar**
