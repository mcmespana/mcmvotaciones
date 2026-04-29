# 🔐 Seguridad para un repo público

Este proyecto está pensado para poder publicarse y ser reutilizado por otras entidades. Eso es bueno, pero implica una regla sencilla: **el repo no debe contener secretos ni datos reales**.

---

## 🚫 No subir nunca

| No subir | Por qué |
|----------|---------|
| `.env`, `.env.local` | Contienen credenciales de entorno. |
| `service_role key` de Supabase | Da permisos elevados sobre la base de datos. |
| Passwords de administradores | Permiten acceso al panel. |
| Tokens personales o API keys | Pueden dar acceso a servicios externos. |
| Credenciales CRM | Exponen datos personales. |
| Datos reales de votantes | Riesgo legal y organizativo. |
| Exportaciones reales de papeletas | Pueden comprometer auditoría o privacidad. |
| Capturas con emails, DNIs o URLs internas | Filtran información sensible. |

---

## ✅ Sí se puede subir

- `.env.example` con valores ficticios.
- Ejemplos CSV/JSON/XML inventados.
- URLs tipo `https://crm.example.org`.
- Usuarios tipo `<CRM_USER>`.
- Documentación de estructura, no de secretos.
- Migraciones SQL sin datos reales.

---

## 🧩 Supabase

| Clave | ¿Puede estar en frontend? | Nota |
|-------|---------------------------|------|
| `anon key` | Sí | Es pública por diseño, pero debe ir acompañada de permisos correctos. |
| `service_role key` | No | Nunca en frontend ni documentación pública. |
| Project ref | Mejor evitar si no aporta | No siempre es secreto, pero identifica infraestructura real. |

### Revisa especialmente

- Políticas RLS.
- Funciones RPC expuestas a `anon`.
- Permisos sobre tablas de administración.
- Logs que puedan contener datos personales.
- Backups descargados localmente.

---

## 📥 SinergiaCRM

Si usas la integración CRM:

- Configura `SINERGIA_URL`, `SINERGIA_USER` y `SINERGIA_PASS` como secrets.
- Usa un usuario API con permisos mínimos.
- Rota cualquier password que haya aparecido en Git.
- Usa placeholders en ejemplos.
- Evita capturas con nombres, documentos, emails o URLs internas.

---

## 👤 Administradores

La instalación no debe depender de una password conocida.

| Recomendado | Evitar |
|-------------|--------|
| Crear un admin propio por despliegue. | Dejar `admin/admin` o passwords de ejemplo. |
| Usar contraseña fuerte. | Compartir la password por chats o commits. |
| Cambiar credenciales provisionales. | Mantener accesos temporales indefinidamente. |

---

## 🔎 Checklist antes de publicar

Busca en el repo palabras sospechosas:

```text
password
secret
token
service_role
api_user
SINERGIA_PASS
```

> ⚠️ Si encuentras una credencial real, no basta con borrarla del archivo: hay que **rotarla**.

---

## 🧯 Si se filtró un secreto

1. Revoca o rota la credencial.
2. Revisa logs de uso del servicio afectado.
3. Sustituye el valor por un placeholder.
4. Documenta el incidente internamente si afectaba a datos reales.
5. No confíes en que borrar un commit elimina el riesgo.

---

## 📚 Relacionado

- 📥 [Importación desde SinergiaCRM](./COMUNICA_IMPORT_GUIDE.md)
- 🔧 [Migraciones SQL](./MIGRATION_INSTRUCTIONS.md)
