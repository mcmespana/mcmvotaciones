# 🗳️ Guía funcional del sistema de votación

Esta guía explica cómo se usa el sistema en una votación real: qué configura la mesa, qué ve el votante y cómo se decide quién queda elegido.

> 👥 **Público**: personas de la mesa, equipo técnico y responsables de preparar la votación.  
> ⚖️ **Regla base**: Canon 119, mayoría de mitad + 1.

---

## 📋 Resumen rápido

| Concepto | Qué significa |
|----------|---------------|
| **Votación** | Proceso completo para elegir una o varias personas. |
| **Ronda** | Cada intento de votación dentro del proceso. |
| **Candidato** | Persona que puede recibir votos. |
| **Cupo / `max_votantes`** | Número máximo de votantes autorizados. También fija el umbral. |
| **Puestos a cubrir** | Número total de personas que se quieren seleccionar. |
| **Papeleta** | Conjunto de votos emitidos por una persona en una ronda. |
| **Asiento** | Reserva técnica que identifica a un votante/navegador durante la ronda. |

---

## ⚖️ Canon 119 en la aplicación

Una persona candidata queda elegida cuando alcanza:

```text
mitad de los votos + 1
```

En el sistema se calcula así:

```text
umbral = floor(max_votantes / 2) + 1
```

| `max_votantes` | Cálculo | Umbral |
|----------------|---------|--------|
| 3 | `floor(3 / 2) + 1` | 2 |
| 4 | `floor(4 / 2) + 1` | 3 |
| 5 | `floor(5 / 2) + 1` | 3 |
| 10 | `floor(10 / 2) + 1` | 6 |

> 💡 **Por qué importa**  
> El umbral no baja si vota menos gente. Así se evita que una participación baja seleccione candidatos con una mayoría demasiado débil.

---

## 🚀 Flujo completo

### 1. Configuración inicial

La mesa o admin:

1. Crea una votación.
2. Define `max_votantes`.
3. Define cuántas personas hay que seleccionar.
4. Configura cuántos candidatos puede marcar cada votante por ronda.
5. Añade o importa candidatos.
6. Comparte el código de acceso si la votación lo usa.

### 2. Sala de espera

Antes de votar, la mesa puede abrir sala:

- los votantes entran;
- el sistema reserva asientos;
- la mesa ve cuántos cupos están ocupados;
- todavía no se puede emitir papeleta.

### 3. Ronda abierta

Cuando la mesa inicia la votación:

- cada votante ve los candidatos disponibles;
- marca sus opciones;
- revisa la papeleta;
- confirma el voto;
- espera instrucciones o resultados.

### 4. Finalizar ronda

La mesa cierra la ronda y el sistema:

1. cuenta votos válidos;
2. calcula el umbral;
3. marca como seleccionados los candidatos que llegan al umbral;
4. guarda resultados en `round_results`;
5. permite proyectar resultados o papeletas.

### 5. Siguiente ronda

Si faltan puestos por cubrir:

- se inicia una nueva ronda;
- los candidatos ya seleccionados dejan de competir;
- los pendientes siguen disponibles;
- se repite el proceso.

---

## 🎯 Ejemplo práctico

```text
Votación: elección de 2 personas
max_votantes: 5
umbral: 3 votos
```

### Ronda 1

| Candidato | Votos | Resultado |
|-----------|-------|-----------|
| Ana | 4 | ✅ Seleccionada |
| Beatriz | 2 | Sigue |
| Carmen | 1 | Sigue |

Queda 1 puesto por cubrir.

### Ronda 2

| Candidato | Votos | Resultado |
|-----------|-------|-----------|
| Beatriz | 3 | ✅ Seleccionada |
| Carmen | 2 | No seleccionada |

La votación puede cerrarse porque ya hay 2 personas seleccionadas.

---

## 🎛️ Configuraciones importantes

### Modo de censo

| Modo | Cuándo usarlo | Comportamiento |
|------|---------------|----------------|
| **Máximo** | Caso habitual. | Se puede iniciar aunque no hayan entrado todos los cupos. |
| **Exacto** | Votaciones muy controladas. | Exige que conectados coincida con `max_votantes`. |

### Máximo de votos por ronda

| Valor | Comportamiento |
|-------|----------------|
| `0` | Lógica heredada: hasta 3 votos, bajando a 2 o 1 si quedan pocos puestos. |
| `1+` | Límite fijo por papeleta, sin superar puestos pendientes. |

---

## 🖥️ Pantallas

| Pantalla | Uso |
|----------|-----|
| `/` | Votar. |
| `/admin` | Gestionar votaciones, candidatos, sala, rondas y resultados. |
| `/proyeccion` | Proyectar resultados o papeletas. |
| `/candidatos/:votingId` | Galería pública de candidatos cuando está habilitada. |
| `/comunica` | Importar candidatos desde SinergiaCRM si está configurado. |

---

## 🔐 Integridad y límites

### Lo que protege el sistema

- ✅ Un votante no debería emitir varias papeletas en la misma ronda desde el mismo asiento.
- ✅ El cupo evita que entren más votantes de los previstos.
- ✅ Los resultados se calculan al cerrar la ronda, no mientras está abierta.
- ✅ Los candidatos seleccionados salen de rondas posteriores.

### Lo que debe cuidar la mesa

- ⚠️ No editar candidatos de forma sustancial cuando ya hay votos.
- ⚠️ No compartir resultados antes de cerrar la ronda.
- ⚠️ No confiar solo en fingerprinting como sustituto de un censo organizativo.
- ⚠️ No subir datos personales reales al repositorio.

---

## 📊 Qué revisar durante una votación

| Momento | Revisión |
|---------|----------|
| Antes de abrir sala | Candidatos, cupos, código de acceso y puestos a cubrir. |
| Sala abierta | Número de asientos ocupados. |
| Ronda en curso | Participación y estado de la sala. |
| Ronda cerrada | Resultados, papeletas y candidatos seleccionados. |
| Antes de siguiente ronda | Que los seleccionados ya no aparezcan como pendientes. |

---

## 🧪 Validación manual recomendada

Antes de usar el sistema en una votación real:

- [ ] Crear votación de prueba con `max_votantes = 3`.
- [ ] Confirmar que el umbral es 2.
- [ ] Votar con una sola papeleta y comprobar que nadie queda elegido.
- [ ] Votar con dos papeletas al mismo candidato y comprobar que queda elegido.
- [ ] Iniciar una segunda ronda.
- [ ] Revisar `/proyeccion`.
- [ ] Exportar resultados o papeletas si la mesa lo necesita.

---

## 🧯 Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| No aparecen candidatos en siguiente ronda | Todos quedaron seleccionados o eliminados. | Revisar estado de candidatos en admin. |
| No se puede votar | Sala pausada, cerrada o asiento inválido. | Revisar estado de la ronda. |
| Resultados no se ven | No se han publicado/proyectado. | Activar visualización desde admin. |
| Umbral incorrecto con número par | Migración antigua. | `calculate_selection_threshold(4)` debe devolver `3`. |

---

## 📚 Relacionado

- ⚡ [Inicio rápido](./QUICK_START.md)
- 🔧 [Migraciones](./MIGRATION_INSTRUCTIONS.md)
- 🔄 [Tiempo real](./REALTIME_ROUND_UPDATES.md)
