# ⚡ QUICK START - Despliegue del Sistema de Cupos

## 🎯 Para empezar inmediatamente

### Paso 1: Ejecutar Migraciones SQL (15 min)
```bash
# Ir al dashboard de Supabase
# Dashboard → SQL Editor → New Query

# Ejecutar EN ORDEN:
# 1. supabase/sqls/001-rename-expected-voters-to-max-votantes.sql
# 2. supabase/sqls/002-create-seats-table.sql
# 3. supabase/sqls/003-update-majority-to-fixed-threshold.sql
# 4. supabase/sqls/004-seats-management-api.sql
```

**Validación rápida**:
```sql
SELECT calculate_selection_threshold(3); -- Debe retornar: 2
SELECT calculate_selection_threshold(5); -- Debe retornar: 3
```

---

### Paso 2: Verificar Archivos Frontend ✅
Estos archivos YA están actualizados:
- ✅ `src/lib/device.ts`
- ✅ `src/components/VotingManagement.tsx`

---

### Paso 3: Implementar VotingPage.tsx (30 min)
📄 **Abrir**: `VOTING_PAGE_IMPLEMENTATION_GUIDE.md`

**Resumen de cambios necesarios**:
1. Añadir estados: `seatId`, `seatStatus`, `browserInstanceId`
2. Crear función `joinRoundSeat()`
3. Crear función `verifySeat()`
4. Añadir heartbeat con useEffect
5. Modificar `handleVote()` para incluir `seat_id`
6. Añadir UI de estado de cupos

**Copiar código de la guía** → Pegar en VotingPage.tsx → Ajustar imports

---

### Paso 4: Test Rápido 🧪

**Test 1: Umbral** (2 min)
```
1. Crear ronda con max_votantes=3
2. Entrar con 1 navegador
3. Marcar 3 candidatos y votar
4. Calcular resultados
✅ Ningún candidato debe ser seleccionado
```

**Test 2: Cupos** (3 min)
```
1. Ronda con max_votantes=3
2. Abrir en Chrome, Firefox, Safari
3. Intentar abrir en 4to navegador
✅ Debe mostrar "Cupo completo"
```

---

### Paso 5: Desplegar 🚀
```bash
# Commit y push
git add .
git commit -m "feat: sistema de cupos con umbral fijo"
git push origin main

# Deploy automático (Vercel/Netlify)
# O build manual:
npm run build
```

---

## 📊 Validación Final

**Después del despliegue, verificar**:
- [ ] Nueva ronda muestra "Cupo máximo" en lugar de "Votantes esperados"
- [ ] Formulario muestra mensaje de umbral calculado
- [ ] VotingPage muestra estado de asientos (X/Y ocupados)
- [ ] 4to dispositivo recibe error al unirse
- [ ] Cambiar de navegador genera error al votar
- [ ] Cerrar y reabrir navegador recupera asiento

---

## ⚠️ Si algo falla

**Error: "expected_voters does not exist"**
→ Frontend desplegado sin ejecutar migraciones  
→ Ejecutar migraciones SQL primero

**Error: "function join_round_seat does not exist"**
→ Migración 004 no se ejecutó  
→ Verificar en Supabase SQL Editor History

**Votantes bloqueados incorrectamente**
→ Problema con localStorage/cookies  
→ Revisar consola del navegador (F12)

**Rollback completo**:
```sql
-- Restaurar desde backup
TRUNCATE TABLE rounds;
INSERT INTO rounds SELECT * FROM rounds_backup;
-- Eliminar columna seat_id
ALTER TABLE votes DROP COLUMN seat_id;
-- Eliminar tabla seats
DROP TABLE seats CASCADE;
```

---

## 🎓 Ejemplos Prácticos

### Crear ronda con cupos
```typescript
// max_votantes = 5
// Umbral automático = ceil(0.5 * 5) = 3 votos
const newRound = {
  title: "Votación MCM 2025",
  max_votantes: 5,
  max_selected_candidates: 6
};
```

### Consultar cupos (admin)
```sql
SELECT get_round_seats_status('uuid-ronda');
-- { occupied_seats: 3, max_votantes: 5, available_seats: 2 }
```

---

## 📞 Ayuda Rápida

**Documentación completa**:
- 📘 `EXECUTIVE_SUMMARY.md` - Resumen ejecutivo
- 🔧 `MIGRATION_INSTRUCTIONS.md` - Migraciones detalladas
- 💻 `VOTING_PAGE_IMPLEMENTATION_GUIDE.md` - Código frontend
- 📊 `IMPLEMENTATION_SUMMARY.md` - Resumen técnico

**Tiempo estimado total**: 60-90 minutos
**Complejidad**: Media
**Reversibilidad**: Alta (backups disponibles)

---

¡Listo para desplegar! 🚀
