# 🔍 Guía de Depuración: Monitoreo en Tiempo Real

## Problema: El monitoreo no se actualiza cuando llegan votos

### ✅ Pasos de verificación completados:
1. ✅ Scripts SQL ejecutados (`migration-fix-voting-rounds.sql` y `fix-votes-constraint.sql`)
2. ✅ Campo `votes_current_round` existe en la base de datos
3. ✅ Código actualizado para usar suscripciones de Supabase

---

## 🔎 Pasos para depurar el problema:

### **1. Verificar que Supabase Realtime está habilitado**

Ve a tu proyecto en Supabase Dashboard:
1. Ve a **Database** → **Replication**
2. Busca las tablas `votes` y `round_results`
3. Asegúrate de que ambas tienen **Realtime** habilitado (toggle verde)

Si no están habilitadas:
```sql
-- Ejecuta esto en el SQL Editor de Supabase:
ALTER PUBLICATION supabase_realtime ADD TABLE votes;
ALTER PUBLICATION supabase_realtime ADD TABLE round_results;
```

---

### **2. Verificar logs en la consola del navegador**

Abre Chrome DevTools (F12) en la página de Admin y busca estos mensajes:

**Cuando se conecta:**
```
📡 Votes channel status: SUBSCRIBED
📡 Results channel status: SUBSCRIBED
```

**Cuando alguien vota:**
```
📊 Vote change detected: {eventType: "INSERT", ...}
```

Si NO ves estos mensajes:
- ❌ Las suscripciones no están funcionando
- ➡️ Verifica el paso 1 (Realtime habilitado)

---

### **3. Verificar el trigger en la base de datos**

Ejecuta este SQL en Supabase:

```sql
-- Ver si el trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'update_votes_current_round_trigger';

-- Probar manualmente el trigger
SELECT trigger_name, tgenabled 
FROM pg_trigger 
WHERE tgname = 'update_votes_current_round_trigger';
```

El resultado debe mostrar:
- `tgenabled = 'O'` (trigger habilitado)

---

### **4. Verificar que votes_current_round se actualiza**

**Antes de votar:**
```sql
SELECT id, title, votes_current_round, current_round_number 
FROM rounds 
WHERE is_active = true;
```
Anota el valor de `votes_current_round`.

**Después de que alguien vote:**
```sql
SELECT id, title, votes_current_round, current_round_number 
FROM rounds 
WHERE is_active = true;
```

¿El número incrementó? 
- ✅ Sí → El trigger funciona, el problema es en el frontend
- ❌ No → El trigger no está funcionando correctamente

---

### **5. Probar manualmente el trigger**

```sql
-- 1. Ver valor actual
SELECT id, votes_current_round FROM rounds WHERE is_active = true;

-- 2. Insertar un voto de prueba (reemplaza los UUIDs con tus valores reales)
INSERT INTO votes (round_id, candidate_id, device_hash, round_number, user_agent, ip_address)
VALUES (
  'TU-ROUND-ID-AQUI',           -- ID de la ronda activa
  'TU-CANDIDATE-ID-AQUI',       -- ID de un candidato
  'test-device-123',             -- Hash de prueba
  1,                             -- Número de ronda actual
  'Manual Test',                 -- User agent
  'test-ip'                      -- IP
);

-- 3. Ver si se actualizó
SELECT id, votes_current_round FROM rounds WHERE is_active = true;

-- 4. Limpiar el voto de prueba
DELETE FROM votes WHERE device_hash = 'test-device-123';
```

---

### **6. Verificar políticas RLS (Row Level Security)**

```sql
-- Ver políticas de la tabla rounds
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'rounds';

-- Ver políticas de la tabla votes
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'votes';
```

Las políticas RLS podrían estar bloqueando las lecturas en tiempo real.

---

### **7. Forzar recarga manual**

En el código de `VotingManagement.tsx`, temporalmente añade un botón de recarga manual:

```tsx
<Button onClick={() => loadRounds()}>
  🔄 Recargar Manualmente
</Button>
```

Si esto funciona pero el tiempo real no:
- ➡️ El problema está en las suscripciones de Supabase Realtime

---

## 🐛 Problemas comunes y soluciones:

### **Problema: "Votes channel status: CHANNEL_ERROR"**
**Solución:** Realtime no está habilitado. Ver paso 1.

### **Problema: El trigger existe pero no se ejecuta**
**Solución:** 
```sql
-- Deshabilitar y volver a habilitar el trigger
ALTER TABLE votes DISABLE TRIGGER update_votes_current_round_trigger;
ALTER TABLE votes ENABLE TRIGGER update_votes_current_round_trigger;
```

### **Problema: votes_current_round siempre es 0 o undefined**
**Solución:** Verificar que el SELECT en loadRounds() incluye el campo:
```typescript
// El * debería incluir votes_current_round
.select('*, candidates(*)')
```

### **Problema: Real-time funciona pero con retraso de varios segundos**
**Solución:** Esto es normal. Supabase Realtime puede tener latencia de 1-5 segundos.

---

## 📞 ¿Necesitas más ayuda?

Si ninguno de estos pasos funciona, proporciona:
1. ✅ Screenshots de Supabase → Database → Replication (Realtime settings)
2. ✅ Console logs del navegador cuando votas
3. ✅ Resultado del SQL de verificación del trigger
4. ✅ Resultado de la prueba manual del trigger (paso 5)

---

## 🎯 Checklist rápida:

- [ ] Realtime habilitado para `votes` y `round_results`
- [ ] Console muestra "SUBSCRIBED" para ambos canales
- [ ] Trigger `update_votes_current_round_trigger` existe y está habilitado
- [ ] Test manual del trigger incrementa `votes_current_round`
- [ ] `loadRounds()` manual carga el valor correcto
- [ ] No hay errores en la consola del navegador
