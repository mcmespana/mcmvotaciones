# Backlog V3 Funcional (Solicitudes 2026-04-25)

## Objetivo
Consolidar mejoras funcionales del sistema de votaciones sin perder compatibilidad con la lógica actual, priorizando trazabilidad por dispositivo, flexibilidad de tipos de votación, experiencia de candidato y operación segura de salas/proyección.

## Prioridad Alta (P0)

### 1) Papeleta fija por dispositivo en toda la votación (no por ronda)
- Situación actual:
  La papeleta parece regenerarse por ronda.
- Objetivo:
  Mantener una identidad de papeleta estable por dispositivo durante toda la votación (todas las rondas de un mismo round_id).
- Reglas:
  - Clave estable por round_id + dispositivo (seat/browser_instance_id/fingerprint según política vigente).
  - Si el dispositivo reingresa, conserva misma papeleta.
  - Cambiar de ronda no debe cambiar la papeleta del dispositivo.
- Criterios de aceptación:
  - Mismo dispositivo, misma votación, distintas rondas => mismo identificador de papeleta.
  - Dispositivo nuevo => nueva papeleta.

### 2) Tipos de votación configurables y personalizados
- Objetivo:
  Poder editar tipos de votación y sus límites de forma flexible.
- Requisitos funcionales:
  - Configurar max_selected_candidates por tipo (ej.: ECL = 6 o 7).
  - Configurar límite por ronda (max_votes_per_round) por tipo.
  - Crear tipo personalizado.
  - Opción personalizada sin límite por ronda.
- Regla de seguridad obligatoria:
  Nunca permitir seleccionar más de max_selected_candidates totales.
- Regla de límite dinámico por ronda:
  max_permitido_ronda = min(max_votes_per_round, max_selected_candidates - selected_candidates_count)
  Ejemplo: máximo total 7, máximo por ronda 6, ya seleccionados 5 => en esta ronda máximo 2.
- Criterios de aceptación:
  - El sistema recalcula límite por ronda automáticamente según restantes.
  - El modo sin límite por ronda sigue respetando el máximo total.

### 3) Exclusividad de sala activa + transición con confirmación
- Objetivo:
  No permitir 2 salas activas a la vez.
- Flujo requerido:
  - Si se intenta iniciar sala Y y existe sala X activa, mostrar confirmación:
    "Pausar sala X y continuar con sala Y?"
  - Si se confirma:
    - Pausar/cerrar estado operativo de X según política.
    - Activar Y.
    - Cambiar proyección para reflejar la sala activa Y.
- Criterios de aceptación:
  - Nunca hay dos salas activas simultáneamente.
  - Proyección cambia automáticamente a la sala activa.

## Prioridad Media (P1)

### 4) Popup ampliado de candidato en /candidatos y votación
- Objetivo:
  Mejorar exploración de candidatos en escritorio y móvil.
- Requisitos:
  - Click (y opcional mantener pulsado en móvil) abre modal grande y estético.
  - Mostrar información ampliada: nombre completo, grupo, ubicación, edad, descripción, etc.
  - Zoom sobre imagen (gesto en móvil + controles en desktop).
- Criterios de aceptación:
  - Experiencia consistente en páginas de candidatos y de votación.
  - Zoom usable sin romper layout.

### 5) Fallback visual cuando no hay imagen de candidato
- Objetivo:
  Evitar avatares vacíos y mejorar legibilidad.
- Requisitos:
  - Si falta image_url, renderizar tarjeta/avatar con iniciales o nombre corto.
  - Paleta agradable y no agresiva (azul, rojo, amarillo, verde), con contraste accesible.
  - Estandar global obligatoria: sustituir morado por rojo y reutilizar estos 4 colores en toda la app (tutorial, confeti, estados visuales y placeholders).
  - Guardar la paleta como tokens globales para impedir desviaciones por pantalla/componente.
  - Color estable por candidato (hash del id o nombre) para consistencia.
- Criterios de aceptación:
  - Ningún candidato aparece “sin imagen” en blanco.
  - El color se mantiene estable entre recargas.

### 5.1) Paleta oficial global de votación
- Objetivo:
  Definir una única paleta oficial y forzar su uso en toda la UI de votación.
- Paleta oficial:
  - Azul
  - Rojo
  - Amarillo
  - Verde
- Reglas:
  - No usar morado en flujos de votación.
  - Componentes nuevos deben consumir tokens globales de color, no hex sueltos.
  - Confeti de confirmación limitado a estos 4 colores.
- Criterios de aceptación:
  - Tutorial sin morado.
  - Confeti con mezcla de los 4 colores oficiales.
  - Tokens globales definidos y reutilizados de forma consistente.

### 6) Validación de nombres y apellidos en flujos de UI y export
- Objetivo:
  Verificar que nombre y apellido siempre se muestran correctamente en:
  - listas,
  - papeletas,
  - monitoreo,
  - resultados,
  - exportaciones.
- Criterios de aceptación:
  - No hay campos invertidos, vacíos inesperados o truncados críticos.

## Prioridad Media-Baja (P2)

### 7) Privacidad: mitigar capturas de pantalla (limitaciones web)
- Requisito solicitado:
  Evitar capturas en páginas sensibles (excepto papeletas).
- Nota técnica importante:
  En web no existe bloqueo 100% fiable de screenshots a nivel de navegador/SO.
- Enfoque viable:
  - Disuasión visual en páginas sensibles (marca de agua dinámica con timestamp/rol).
  - Ocultar datos sensibles cuando la pestaña pierde foco o en miniatura de app-switch.
  - Política de privacidad y auditoría de acceso.
  - Si se requiere bloqueo real, evaluar app nativa/kiosk controlado.
- Criterios de aceptación:
  - Se aplican medidas de mitigación visibles y auditables.

### 8) Revisión de exportables (resultados, papeletas, votados)
- Objetivo:
  Definir formato final de exportación para operación y auditoría.
- Revisar y unificar:
  - Excel/CSV de resultados.
  - Excel/CSV de papeletas.
  - Excel/CSV de votados.
- Requisito clave:
  Mantener historial por rondas en personas seleccionadas/ganadoras.
- Propuesta de salida:
  - Un libro con hojas separadas o 3 exportes consistentes con claves comunes (round_id, round_number, candidate_id, seat/papeleta).
- Criterios de aceptación:
  - Trazabilidad completa por ronda y por candidato.
  - Consistencia de columnas y tipos entre exportes.

### 9) Revisión de resultados en admin (gráficos y paneles)
- Objetivo:
  Mejorar claridad analítica en el panel de administración.
- Revisar:
  - Exactitud de métricas por ronda.
  - Jerarquía visual de gráficos.
  - Comparativas entre rondas.
  - Estados (activa/finalizada/pausada) reflejados en analítica.
- Criterios de aceptación:
  - Un admin puede interpretar en menos de 1 minuto el estado de la votación y evolución por ronda.

## Dependencias técnicas sugeridas
- Migraciones DB:
  - Tabla/config para tipos de votación.
  - Ajustes para persistencia de papeleta por dispositivo y round_id.
  - Restricción/flujo de única sala activa.
- Backend/RPC:
  - Cálculo centralizado de límite dinámico por ronda.
  - Endpoint/función de transición segura entre salas con confirmación.
- Frontend:
  - Modal de candidato con zoom.
  - Fallback de avatar por color estable.
  - Ajustes en export UI + revisión de gráficos admin.

## Orden de implementación recomendado
1. Papeleta fija por dispositivo en toda votación.
2. Tipos de votación editables + límites dinámicos.
3. Exclusividad de sala activa + confirmación y cambio de proyección.
4. Popup ampliado de candidato + zoom.
5. Fallback sin imagen por colores.
6. Revisión de nombres/apellidos en todas las vistas.
7. Revisión y rediseño de exportables.
8. Revisión de resultados y gráficos del admin.
9. Medidas de mitigación de capturas en páginas sensibles.

## Riesgos y notas
- Bloqueo absoluto de capturas en web no es técnicamente garantizable.
- Cambiar lógica de límites por ronda impacta reglas de negocio, proyección y exportaciones.
- La transición entre salas requiere especial cuidado con realtime y estado de proyección para evitar inconsistencias.