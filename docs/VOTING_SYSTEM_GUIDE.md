# Sistema de Votación por Rondas - Guía de Uso

## 📋 Resumen del Sistema

Este sistema permite realizar votaciones por rondas con selección progresiva de candidatos mediante mayoría absoluta (>50%).

## 🎯 Cómo Funciona

### 1. **Configuración Inicial**
- Crear una votación con el número esperado de votantes por ronda
- Agregar o importar candidatos (CSV/XML/JSON)
- Activar la votación para iniciar la primera ronda

### 2. **Rondas de Votación**

#### **Meta de Votantes por Ronda**
- El `expected_voters` se mantiene **constante para cada ronda**
- El contador `votes_current_round` cuenta **votantes únicos** en la ronda actual
- Cuando `votes_current_round` alcanza `expected_voters`, se puede finalizar la ronda

#### **Número de Votos por Persona**
El sistema ajusta dinámicamente cuántos candidatos puede votar cada persona:
- **4+ candidatos pendientes**: 3 votos por persona
- **2-3 candidatos pendientes**: 2 votos por persona  
- **1 candidato pendiente**: 1 voto por persona

### 3. **Selección por Mayoría Absoluta**

Cuando finalizas una ronda:
1. El sistema calcula el porcentaje de votos de cada candidato
2. Los candidatos con **>50% de votos** son **seleccionados automáticamente**
3. Los candidatos seleccionados se marcan como "Seleccionado" y dejan de aparecer en siguientes rondas
4. El proceso continúa hasta completar todos los puestos necesarios

#### Ejemplo:
```
Ronda 1: 100 votantes esperados
- Candidato A: 55 votos (55%) → SELECCIONADO ✓
- Candidato B: 30 votos (30%)
- Candidato C: 15 votos (15%)

Ronda 2: 100 votantes esperados (contador se reinicia)
- Candidato B: Sigue en competencia
- Candidato C: Sigue en competencia
- Candidato A: Ya no aparece (seleccionado)
```

### 4. **Restricciones Importantes**

#### ❌ **No se pueden eliminar candidatos si hay votos**
Una vez que alguien ha votado en la votación:
- No se pueden eliminar candidatos individuales
- No se pueden eliminar candidatos seleccionados
- No se pueden eliminar todos los candidatos

Esto protege la integridad de los votos ya emitidos.

### 5. **Visualización de Candidatos**

En la sección de candidatos se muestran:
1. **Primero**: Candidatos seleccionados con badge "Seleccionado" y icono de premio
2. **Después**: Candidatos activos ordenados por `order_index`

### 6. **Monitoreo en Tiempo Real**

La pantalla de monitoreo muestra:
- **Votantes ronda actual**: Contador único de personas que han votado
- **Meta ronda**: Número esperado de votantes
- **Progreso ronda**: Porcentaje de meta alcanzada
- **Seleccionados**: Cuántos candidatos ya fueron seleccionados
- **Indicador verde**: Aparece cuando se alcanza la meta de votantes

### 7. **Finalizar Ronda y Pasar a la Siguiente**

#### Pasos:
1. **Finalizar Ronda**: Presionar "Finalizar Ronda X"
   - Calcula resultados
   - Selecciona candidatos con mayoría absoluta
   - Muestra resultados

2. **Publicar Resultados** (opcional):
   - Toggle "Mostrar resultados a usuarios"
   - Los usuarios ven los resultados en tiempo real

3. **Iniciar Siguiente Ronda**:
   - Presionar "Iniciar Ronda X+1"
   - Reinicia contador de votantes a 0
   - Ajusta máximo de votos por persona
   - Oculta candidatos ya seleccionados

## 🔧 Migración de Base de Datos

**IMPORTANTE**: Debes ejecutar el script de migración antes de usar el sistema actualizado.

### Pasos para migrar:

1. Ve a tu proyecto en Supabase
2. Abre el SQL Editor
3. Copia y pega el contenido de `migration-fix-voting-rounds.sql`
4. Ejecuta el script
5. Verifica que no haya errores

El script agrega:
- Campo `votes_current_round` en la tabla `rounds`
- Funciones SQL para cálculo de resultados con mayoría absoluta
- Funciones para iniciar nuevas rondas automáticamente
- Triggers para actualizar contadores en tiempo real

## 📊 Funciones SQL Disponibles

### `process_round_results(p_round_id, p_round_number)`
Procesa los resultados de una ronda:
- Calcula votos y porcentajes
- Detecta mayoría absoluta (>50%)
- Marca candidatos seleccionados
- Guarda resultados en `round_results`

### `start_new_round(p_round_id)`
Inicia una nueva ronda:
- Incrementa `current_round_number`
- Calcula nuevo `max_votes_per_round`
- Reinicia `votes_current_round` a 0

### `calculate_max_votes(p_round_id)`
Calcula dinámicamente el máximo de votos:
- Basado en candidatos pendientes de seleccionar
- Retorna 3, 2, o 1

### `get_unique_voters_count(p_round_id, p_round_number)`
Cuenta votantes únicos en una ronda específica:
- Usa `device_hash` para identificar votantes
- Retorna número entero

## 🚀 Flujo Completo de Uso

1. **Setup**:
   ```
   - Ejecutar migración SQL
   - Crear votación
   - Importar 25 candidatos
   - Configurar expected_voters (ej: 100)
   - Activar votación
   ```

2. **Ronda 1**:
   ```
   - Usuarios votan (máx 3 candidatos)
   - Monitorear progreso (votes_current_round)
   - Al alcanzar meta → Finalizar ronda
   - Ver resultados
   - Candidatos con >50% → Seleccionados
   - Iniciar Ronda 2
   ```

3. **Ronda 2**:
   ```
   - votes_current_round reinicia a 0
   - Candidatos seleccionados no aparecen
   - max_votes ajustado según pendientes
   - Repetir proceso
   ```

4. **Rondas Sucesivas**:
   ```
   - Continuar hasta completar todos los puestos
   - Sistema ajusta votos automáticamente
   - Cada ronda independiente con su meta
   ```

## 🎨 Características de UI

### Selección Múltiple de Candidatos
- Hover sobre tarjeta → aparece checkbox
- Clic en checkbox → selecciona candidato
- Botón "Eliminar X seleccionados" → elimina en lote

### Botones con Colores
- **Editar**: Azul suave
- **Eliminar**: Rojo suave
- **Eliminar Todos**: Rojo outline (solo sin votos)

### Indicadores Visuales
- Badge "Seleccionado" con icono de premio
- Ring azul en candidatos seleccionados
- Alert verde cuando meta alcanzada

## ⚠️ Notas Importantes

1. **No editar candidatos con votos**: Aunque se puede editar, no es recomendable cambiar datos de candidatos después de que haya votos.

2. **Expected voters por ronda**: Ajusta este valor según tu caso de uso. Es la meta de participación esperada en cada ronda.

3. **Mayoría absoluta es estricta**: Solo >50% selecciona un candidato. Si ninguno alcanza mayoría, todos continúan a la siguiente ronda.

4. **Tiempo real**: Los resultados se actualizan automáticamente en todas las pantallas cuando se publican.

5. **Los contadores son independientes**: `vote_count` es total de votos históricos, `votes_current_round` es votantes únicos de la ronda actual.

## 🐛 Troubleshooting

### "No aparecen candidatos en la segunda ronda"
- **Causa**: Todos fueron seleccionados en ronda anterior
- **Solución**: Verificar que no todos tengan `is_selected = true`

### "No se pueden eliminar candidatos"
- **Causa**: Ya hay votos en la votación
- **Solución**: Esto es intencional para proteger integridad

### "votes_current_round no se actualiza"
- **Causa**: Migración SQL no ejecutada
- **Solución**: Ejecutar `migration-fix-voting-rounds.sql`

### "Resultados no se muestran"
- **Causa**: No se activó toggle "Mostrar resultados"
- **Solución**: En monitoreo, activar el switch después de finalizar ronda

## 📝 Changelog

### v2.0 - Sistema de Rondas Mejorado
- ✅ Contador de votos por ronda independiente
- ✅ Selección por mayoría absoluta (>50%)
- ✅ Ajuste dinámico de votos por persona
- ✅ Bloqueo de eliminación con votos existentes
- ✅ Indicador de meta alcanzada
- ✅ Mejoras en UI de monitoreo
- ✅ Candidatos seleccionados mostrados primero

