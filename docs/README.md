# 📚 Guía de documentación

La carpeta `docs/` ahora está organizada por objetivos concretos para facilitar el acceso a la información relevante del proyecto.

## 🧭 Vistas generales
| Documento | Para qué sirve | Tiempo estimado |
|-----------|----------------|-----------------|
| [`EXECUTIVE_SUMMARY.md`](./EXECUTIVE_SUMMARY.md) | Contexto de negocio y cambios principales introducidos en la versión 2.0.0. | 15 min |
| [`PROJECT_STRUCTURE.md`](./PROJECT_STRUCTURE.md) | Detalle de la arquitectura del repositorio y convenciones de carpetas. | 10 min |
| [`IMPLEMENTATION_SUMMARY.md`](./IMPLEMENTATION_SUMMARY.md) | Estado técnico de cada módulo y decisiones relevantes. | 10 min |

## 🚀 Puesta en marcha y operaciones
| Documento | Contenido clave |
|-----------|-----------------|
| [`QUICK_START.md`](./QUICK_START.md) | Pasos mínimos para levantar el entorno local y desplegar cambios. |
| [`MIGRATION_INSTRUCTIONS.md`](./MIGRATION_INSTRUCTIONS.md) | Procedimiento paso a paso para ejecutar las migraciones de base de datos. |
| [`REALTIME_ROUND_UPDATES.md`](./REALTIME_ROUND_UPDATES.md) | Detalles del fix que garantiza que los votantes reciben cambios en tiempo real. |

## 🛠️ Guías de características
| Documento | Descripción |
|-----------|-------------|
| [`VOTING_SYSTEM_GUIDE.md`](./VOTING_SYSTEM_GUIDE.md) | Conceptos funcionales del sistema de votación y roles. |
| [`VOTING_PAGE_IMPLEMENTATION_GUIDE.md`](./VOTING_PAGE_IMPLEMENTATION_GUIDE.md) | Implementación completa de la página de votación con gestión de asientos. |
| [`ROUND_FINALIZED_CHANGES.md`](./ROUND_FINALIZED_CHANGES.md) | Flujo completo para finalizar rondas y compartir resultados. |
| [`EPIC_RESULTS_DISPLAY.md`](./EPIC_RESULTS_DISPLAY.md) | Historia de usuario y UX de la visualización de resultados. |

## 🧪 Debug y soporte
| Documento | Uso |
|-----------|-----|
| [`DEBUGGING_REALTIME.md`](./DEBUGGING_REALTIME.md) | Checklist y comandos útiles cuando el realtime presenta problemas. |

## 📦 Versionado
| Documento | Qué encontrarás |
|-----------|-----------------|
| [`CHANGELOG.md`](./CHANGELOG.md) | Historial de cambios del proyecto. |
| [`RELEASE_NOTES_v2.0.0.md`](./RELEASE_NOTES_v2.0.0.md) | Release notes oficiales de la versión 2.0.0. |

## 📁 Archivos heredados
Los documentos antiguos que siguen siendo referencia puntual (por ejemplo, diseños previos o migraciones obsoletas) se conservan en esta misma carpeta. Cada archivo incluye una nota inicial indicando si la información está vigente o si debe considerarse histórica.

---

### Próximos pasos sugeridos
1. Revisa [`supabase/sqls/README.md`](../supabase/sqls/README.md) para ejecutar las migraciones en el orden correcto.
2. Consulta [`README.md`](../README.md) en la raíz del repositorio para comandos y scripts comunes.
3. Mantén esta estructura cuando agregues nuevos documentos: comienza por describir el objetivo del archivo y enlázalo desde esta guía.
