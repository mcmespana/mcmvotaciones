# 📚 Guía de documentación

Bienvenido/a a la documentación de **MCM Votaciones**. La idea de esta carpeta es que una persona técnica pueda desplegar el sistema, y una persona no tan técnica pueda entender cómo se usa en una votación real.

---

## 🧭 Lectura recomendada

| Si quieres... | Empieza por | Después mira |
|---------------|-------------|--------------|
| Levantar el proyecto en local | [⚡ QUICK_START.md](./QUICK_START.md) | [🔧 MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md) |
| Entender cómo se vota | [🗳️ VOTING_SYSTEM_GUIDE.md](./VOTING_SYSTEM_GUIDE.md) | [🔄 REALTIME_ROUND_UPDATES.md](./REALTIME_ROUND_UPDATES.md) |
| Preparar Supabase | [🔧 MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md) | [../supabase/sqls/README.md](../supabase/sqls/README.md) |
| Importar candidatos desde CRM | [📥 COMUNICA_IMPORT_GUIDE.md](./COMUNICA_IMPORT_GUIDE.md) | [crm-reference/CAMPOS_SINERGIA_CRM.md](./crm-reference/CAMPOS_SINERGIA_CRM.md) |
| Revisar riesgos de repo público | [🔐 SECURITY.md](./SECURITY.md) | [📥 COMUNICA_IMPORT_GUIDE.md](./COMUNICA_IMPORT_GUIDE.md) |

---

## 🚀 Puesta en marcha y operación

| Documento | Contenido | Tiempo |
|-----------|-----------|--------|
| [⚡ QUICK_START.md](./QUICK_START.md) | Instalación local, `.env.local`, Supabase y primer admin. | 15 min |
| [🔧 MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md) | Orden de scripts SQL, backups, umbral Canon 119 y validaciones. | 20 min |
| [🔄 REALTIME_ROUND_UPDATES.md](./REALTIME_ROUND_UPDATES.md) | Cómo se actualizan votantes, admin y proyección sin recargar. | 5 min |
| [🐛 DEBUGGING_REALTIME.md](./DEBUGGING_REALTIME.md) | Checklist cuando el tiempo real no responde. | 10 min |

---

## 🗳️ Guías funcionales

| Documento | Para qué sirve |
|-----------|----------------|
| [🗳️ VOTING_SYSTEM_GUIDE.md](./VOTING_SYSTEM_GUIDE.md) | Explica el flujo de votación por rondas y el Canon 119. |
| [📥 COMUNICA_IMPORT_GUIDE.md](./COMUNICA_IMPORT_GUIDE.md) | Explica la importación opcional desde SinergiaCRM. |
| [📜 CHANGELOG.md](./CHANGELOG.md) | Historial resumido de cambios relevantes. |
| [🏷️ RELEASE_NOTES_v2.0.0.md](./RELEASE_NOTES_v2.0.0.md) | Notas históricas de la versión 2.0.0. |

---

## 🧩 Material técnico y heredado

| Carpeta / archivo | Estado | Nota |
|-------------------|--------|------|
| `docs/crm/` | Referencia técnica | Ejemplos heredados del CRM. Deben usar placeholders, nunca credenciales reales. |
| `docs/crm-reference/` | Referencia útil | Campos conocidos de SinergiaCRM. |
| `docs/redesign/` | Histórico | Prototipos de interfaz. No son necesarios para desplegar. |
| `VOTING_PAGE_IMPLEMENTATION_GUIDE.md` | Histórico/técnico | Útil para contexto, pero la página de voto ya existe en `src/pages/VotingPage.tsx`. |

---

## ✅ Criterio editorial

Para mantener la documentación agradable y útil:

- 🎯 Empieza cada documento explicando **para qué sirve**.
- 🧾 Usa tablas cuando ayuden a comparar opciones.
- 🧪 Separa validación manual de instrucciones de instalación.
- 🔐 No publiques secretos, endpoints internos, project refs privados ni datos personales.
- 🪶 Mantén el tono claro: suficiente para técnicos, amable para quien no vive dentro del código.
- 🔗 Si enlazas un archivo, comprueba que existe.

---

## 🧹 Cosas que se evitaron a propósito

- Una guía de contribución larga: no es un proyecto orientado a recibir contribuciones externas.
- Credenciales de ejemplo realistas: en un repo público son una mala idea.
- Documentación demasiado interna de decisiones antiguas en la portada.

---

## 📌 Próximos pasos sugeridos

1. Lee [⚡ QUICK_START.md](./QUICK_START.md) si vas a levantar el proyecto.
2. Lee [🗳️ VOTING_SYSTEM_GUIDE.md](./VOTING_SYSTEM_GUIDE.md) si vas a usarlo en una votación.
3. Lee [🔐 SECURITY.md](./SECURITY.md) antes de publicar cambios o hacer un fork.
