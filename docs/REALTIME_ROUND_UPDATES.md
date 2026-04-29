# 🔄 Actualizaciones en tiempo real de rondas

Este documento resume el cambio que permitió que la página de votación reaccione automáticamente a los eventos del panel de administración.

## 🧭 Resumen rápido
- Los votantes ya **no necesitan recargar** manualmente cuando se crea o actualiza una ronda activa.
- La suscripción a Supabase escucha los eventos `INSERT` y `UPDATE` de la tabla `rounds` filtrados por `is_active`.
- Se reutiliza la función `loadActiveRound` para refrescar el estado cuando llega un evento relevante.
- Las notificaciones toast informan al votante cuando hay una nueva ronda o cuando la actual cambia.

## ⚙️ Cambios clave en `VotingPage.tsx`
1. **Suscripción combinada** a eventos `INSERT` y `UPDATE`:
   ```ts
   channel
     .on('postgres_changes', { event: 'INSERT', filter: 'is_active=eq.true' }, handleRoundEvent)
     .on('postgres_changes', { event: 'UPDATE', table: 'rounds' }, handleRoundEvent);
   ```
2. **Manejo de eventos en una única función** que decide si la recarga es necesaria según el `round_id` y `current_round_number`.
3. **Mensajes toast** descriptivos para que el usuario entienda qué cambió.
4. Limpieza automática de la suscripción cuando el componente se desmonta.

## ✅ Casos cubiertos
| Evento en el panel | Tipo SQL | Resultado en votantes |
|--------------------|----------|------------------------|
| Crear nueva ronda activa | `INSERT` | Nueva ronda aparece y se muestra toast «🎉 Nueva votación disponible». |
| Activar otra ronda | `UPDATE` | Carga la nueva ronda y muestra toast «🔄 Votación actualizada». |
| Cerrar la ronda actual | `UPDATE` (`is_closed=true`) | La UI muestra «Sin votaciones activas». |
| Finalizar ronda | `UPDATE` (`round_finalized=true`) | Se refrescan resultados si están habilitados. |
| Mostrar/ocultar resultados | `UPDATE` (`show_results_to_voters`) | Se sincroniza el panel de resultados visible. |

## 🔬 Validación
1. Abrir la página de votación y el panel de administración en ventanas distintas.
2. Realizar cada uno de los eventos anteriores desde el panel.
3. Confirmar que la página de votación reacciona sin recargar.

## 📁 Referencia rápida
- Código fuente: [`src/pages/VotingPage.tsx`](../src/pages/VotingPage.tsx)
- Hooks relacionados: [`src/hooks/use-toast.ts`](../src/hooks/use-toast.ts)
- Supabase Realtime: [`src/lib/supabase.ts`](../src/lib/supabase.ts)

## 🧾 Historial
- Versión original distribuida en dos documentos (`FIX_REALTIME_ROUND_UPDATES.md` y `RESUMEN_FIX_REALTIME.md`).
- Esta versión consolida ambos textos en un único archivo y elimina duplicación de información.
