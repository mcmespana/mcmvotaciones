# Auditoría de código — mcmvotaciones (2026-05-08)

Generado mediante análisis de grafo de conocimiento (graphify) sobre 845 nodos / 1421 aristas.
Los archivos auditados se priorizaron por grado de conectividad (god nodes y componentes con más dependencias).

---

## God Nodes (núcleo del sistema)

| Nodo | Conexiones | Archivo |
|------|-----------|---------|
| `cn()` | 62 | `src/lib/utils.ts` |
| `useToast()` | 22 | `src/hooks/use-toast.ts` |
| `APIClient` | 17 | PHP CRM |
| `formatCandidateName()` | 15 | `src/lib/candidateFormat.ts` |
| `useAuth()` | 13 | contextos |

---

## Problemas encontrados

### CRÍTICO-1: Tres versiones del RPC `process_round_results` sin orden garantizado

**Archivos:** `003-update-majority-to-fixed-threshold.sql`, `007-fix-results-percentage-by-round-voters.sql`, `009`, `fix-majority-calculation.sql`, `fix-majority-calculation-people.sql`

Cada archivo redefine `process_round_results` con un denominador diferente para el cálculo de mayoría:

- `007`: denominator = `COUNT(DISTINCT vote_hash)` (papeletas únicas emitidas)
- `fix-majority-calculation-people.sql`: denominator = `COUNT(DISTINCT device_hash)` (personas únicas)
- `003`: denominator = `max_votantes` (censo total registrado — **correcto según Canon 119**)

Sin migraciones numeradas y aplicadas secuencialmente, en producción puede estar activa la versión incorrecta. Si está activa la de papeletas emitidas, un candidato con 15 votos de 100 registrados parecería tener mayoría.

**Fix:** Usar Supabase CLI con migraciones numeradas. Verificar qué versión está activa ejecutando `\df process_round_results` en Supabase SQL Editor y comparando el cuerpo de la función.

---

### CRÍTICO-2: `invalidateVote` solo invalida el primer voto de la papeleta

**Archivo:** `src/components/voting/BallotReview.tsx`, línea ~338

```ts
// BUG: solo guarda el id del primer voto
setSelectedVoteId(deviceVotes[0].id);
setInvalidateDialogOpen(true);
```

El `update` posterior solo toca ese registro. Si la papeleta tiene 3 votos (votación a 3 candidatos), quedan 2 activos. El recuento y `process_round_results` los contarán aunque la papeleta se marque como "invalidada".

La restauración sí opera sobre todos los votos correctamente:
```ts
deviceVotes.forEach(v => restoreVote(v.id))  // correcto
```

**Fix:** Reemplazar `setSelectedVoteId(deviceVotes[0].id)` por la invalidación de todos los votos del device en esa ronda, igual que hace la restauración.

---

### CRÍTICO-3: Race condition en `cast_ballot` — sin bloqueo en el check de duplicados

**Archivo:** `supabase/sqls/012-atomic-ballot-and-selection.sql`, líneas ~35-43

```sql
-- Sin FOR UPDATE: dos llamadas concurrentes pueden pasar este check simultáneamente
SELECT COUNT(*) INTO v_existing
FROM public.votes
WHERE round_id = p_round_id
  AND device_hash = p_device_hash
  AND round_number = p_round_number;
IF v_existing > 0 THEN
  RETURN ... 'ALREADY_VOTED' ...
END IF;
```

Doble clic o reintento de red puede insertar dos papeletas antes de que la primera haga commit. La unique constraint `votes_round_device_candidate_unique` previene duplicar el mismo candidato, pero no previene votos parciales duplicados de una papeleta multi-candidato.

**Fix:** Cambiar a `INSERT ... ON CONFLICT DO NOTHING` para cada voto individual, o usar `SELECT ... FOR KEY SHARE` en el check previo.

---

### CRÍTICO-4: RLS con `USING (true)` — cualquier usuario anónimo puede modificar la BD

**Archivo:** `supabase/sqls/setup-database.sql`, líneas ~329-334

```sql
CREATE POLICY "Allow all rounds operations" ON public.rounds FOR ALL USING (true);
CREATE POLICY "Allow all votes operations" ON public.votes FOR ALL USING (true);
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
```

La clave `anon` de Supabase es pública (está en el JavaScript del cliente). Cualquier persona puede ejecutar desde la consola del navegador:

```js
supabase.from('rounds').update({ max_votantes: 1 }).eq('id', '...')
supabase.from('votes').delete().neq('id', '')
supabase.from('candidates').update({ is_selected: true }).eq('id', '...')
```

No hay separación de roles admin/votante a nivel de base de datos. Toda la seguridad depende de que el frontend no exponga esas operaciones, lo cual no es suficiente.

**Fix:** Implementar RLS real con `auth.uid()` y roles diferenciados. Las operaciones de escritura sobre `rounds`, `candidates` y `votes` deben requerir rol de administrador autenticado.

---

### GRAVE-5: `has_majority` calculado como `percentage > 50` — incorrecto para Canon 119

**Archivo:** `src/components/admin/voting-detail/hooks/useRoundDetail.ts`, línea ~114

```ts
has_majority: r.percentage > 50,
```

La regla del Canon 119 es `votos >= FLOOR(max_votantes / 2) + 1`, no `votos / max_votantes > 0.5`.

Ejemplos donde divergen:
- `max_votantes=5`: umbral correcto = 3 votos (60%). Con `> 50%` nunca se alcanza con número entero de votos entre 2 y 3.
- `max_votantes=4`: umbral correcto = 3 votos (75%). `percentage > 50` daría mayoría con 3 votos (75% > 50%) — este caso coincide, pero...
- `max_votantes=101`: umbral correcto = 51 votos (50.49%). `percentage > 50` requeriría 52 votos — **un voto de más**.

El campo `has_absolute_majority` calculado en el SQL de `003` no llega a `round_results`, por eso el frontend lo recalcula con lógica diferente.

**Fix:** Añadir `has_absolute_majority` a la tabla `round_results` y consumirlo en el frontend, o calcular en frontend con `voteCount >= Math.floor(maxVotantes / 2) + 1`.

---

### GRAVE-6: `startNextRound` bypasea validaciones del RPC `start_voting_round`

**Archivo:** `src/components/admin/voting-detail/hooks/useRoundActions.ts`, líneas ~162-169

```ts
const { data, error } = await supabase.rpc("start_new_round", { p_round_id: roundId });
if (error) { ... return; }

// UPDATE directo que sobreescribe lo que start_voting_round debería controlar:
await supabase.from("rounds").update({
  is_active: true,
  round_finalized: false,
  is_voting_open: true,
  join_locked: true,
  ...
}).eq("id", roundId);
```

El UPDATE posterior omite la validación de `start_voting_round` que verifica census_mode, candidatos activos y que el número de seats coincida con `max_votantes` en modo `exact`.

**Fix:** Mover ese UPDATE al interior del RPC `start_new_round` o crear un RPC que agrupe ambas operaciones atómicamente.

---

### GRAVE-7: `finalizeRound` no es atómica — ventana de votos aceptados con resultados ya calculados

**Archivo:** `src/components/admin/voting-detail/hooks/useRoundActions.ts`, líneas ~148-159

```ts
// 1. Calcula resultados y marca candidatos como is_selected=true
await supabase.rpc("process_round_results", ...);

// VENTANA: is_voting_open todavía es true aquí
// Un voto en tránsito se insertará, pero no se procesará

// 2. Cierra la votación
await supabase.from("rounds").update({
  round_finalized: true,
  is_voting_open: false,
  ...
}).eq("id", roundId);
```

Entre las dos llamadas existe una ventana donde `is_voting_open=true` pero los resultados ya están calculados. Votos en tránsito se insertan con éxito pero no afectan la selección. Los candidatos quedan con recuento incorrecto.

**Fix:** `process_round_results` debe hacer el UPDATE de `round_finalized` e `is_voting_open` dentro de la misma transacción.

---

### GRAVE-8: `cast_ballot` no valida que `p_round_number` coincida con el número de ronda actual

**Archivo:** `supabase/sqls/012-atomic-ballot-and-selection.sql`, línea ~31

```sql
IF NOT v_round.is_voting_open THEN
  RETURN ... 'VOTING_CLOSED' ...
END IF;
-- No verifica que p_round_number == v_round.current_round_number
```

Un atacante puede enviar `p_round_number=1` estando en la ronda 3 e insertar votos retroactivos en una ronda ya cerrada, alterando el recuento histórico.

**Fix:** Añadir `IF p_round_number != v_round.current_round_number THEN RETURN ... 'INVALID_ROUND' END IF;`

---

### MODERADO-9: Código de acceso verificado en el cliente — visible en DevTools

**Archivos:** `src/pages/voting/hooks/useVotingPage.ts`, línea ~237

```ts
// El access_code real se carga desde Supabase y se compara en cliente:
if (code.toUpperCase() === activeRound.access_code.toUpperCase()) {
```

La comparación se hace con el valor real del código. Cualquier usuario puede verlo en React DevTools inspeccionando el estado, o en la pestaña Network viendo la respuesta de la query de Supabase.

**Fix:** Mover la verificación al servidor. El RPC `verify_seat` debería aceptar el código y compararlo internamente, devolviendo solo éxito/fallo.

---

### MODERADO-10: Hash de fingerprint de 32 bits — colisiones predecibles en equipos idénticos

**Archivo:** `src/lib/device.ts`, función `simpleHash`

```ts
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;  // trunca a 32 bits
  }
  return Math.abs(hash).toString(36);  // ~7 caracteres, ≤2³² valores
}
```

En una sede con equipos idénticos (mismo navegador, misma versión, mismo timezone, misma GPU), el canvas fingerprint y el WebGL hash serán iguales para todos los dispositivos. La colisión hace que el segundo votante reciba `ALREADY_VOTED` sin haber votado.

**Fix:** Usar `crypto.randomUUID()` como componente del hash, persistido en localStorage por primera vez, para garantizar unicidad por instancia de navegador en lugar de por hardware.

---

## Anomalías estructurales (del grafo)

- **25 nodos aislados**: archivos de configuración (`tailwind.config.ts`, `vite.config.ts`, `eslint.config.js`) y ejemplos PHP del CRM sin conexión con el resto del sistema. Normal para config, pero los ejemplos PHP están duplicados respecto al `APIClient` principal.
- **`AdminVotingDetail/index.tsx` con 1820 LOC y 40 conexiones**: god component que mezcla lógica de negocio crítica con UI. Cualquier bug aquí afecta a casi toda la funcionalidad de administración.
- **`CAMPOS_SINERGIA_CRM.md` y `DOC_API_CRM_CAMPOS.md` semánticamente idénticos**: posible duplicación no intencionada de documentación de referencia del CRM.
- **`docs/redesign/Prototipo.html` (Community 11) completamente desconectado** del código de producción: es un prototipo en React 18 con CDN mientras producción usa React 19 + Vite. Riesgo de que decisiones de diseño del prototipo no estén implementadas.

---

## Resumen de riesgo

| Severidad | Cantidad | Impacto |
|-----------|---------|---------|
| Crítico | 4 | Resultados de votación incorrectos, seguridad comprometida |
| Grave | 4 | Inconsistencias de estado, bypass de validaciones |
| Moderado | 2 | Exposición de datos, falsos negativos en antiduplicación |
