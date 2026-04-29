# ⚡ Inicio rápido

Guía corta para dejar el proyecto funcionando en local y preparado para una primera votación de prueba.

> 🎯 **Objetivo**: instalar dependencias, conectar Supabase, crear un admin y abrir la app.  
> ⏱️ **Tiempo estimado**: 15-30 minutos, según tengas ya preparado Supabase.

---

## ✅ Requisitos

| Necesitas | Para qué |
|-----------|----------|
| Node.js 20+ | Ejecutar Vite y el build frontend. |
| npm | Instalar dependencias. |
| Proyecto Supabase | Base de datos, RPC y realtime. |
| Acceso al SQL Editor | Ejecutar instalación y migraciones. |

---

## 1️⃣ Instalar dependencias

```bash
npm install
```

---

## 2️⃣ Configurar variables de entorno

Copia `.env.example` a `.env.local`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
```

> ⚠️ **Importante**  
> Solo las variables con prefijo `VITE_` llegan al navegador. No pongas claves privadas ni `service_role key` en el frontend.

---

## 3️⃣ Crear la base de datos

En Supabase:

1. Abre **SQL Editor**.
2. Ejecuta `supabase/sqls/setup-database.sql`.
3. Ejecuta las migraciones numeradas de `supabase/sqls/` en orden.
4. Consulta [../supabase/sqls/README.md](../supabase/sqls/README.md) si dudas con el orden.

### Validación rápida del umbral

```sql
SELECT calculate_selection_threshold(3);  -- 2
SELECT calculate_selection_threshold(4);  -- 3
SELECT calculate_selection_threshold(10); -- 6
```

---

## 4️⃣ Crear primer administrador

El repo **no crea un admin por defecto** con password conocida. Crea uno propio:

```sql
INSERT INTO public.admin_users (username, password_hash, name, email, role)
VALUES (
  'admin',
  'CAMBIA_ESTA_PASSWORD',
  'Administrador',
  'admin@example.org',
  'super_admin'
);
```

> 🔐 El trigger de base de datos convierte `password_hash` a bcrypt si recibe texto plano. Aun así, usa una contraseña fuerte y cámbiala si fue provisional.

---

## 5️⃣ Arrancar la aplicación

```bash
npm run dev
```

Abre:

```text
http://localhost:8080
```

---

## 🗳️ Primera prueba manual

| Paso | Qué hacer | Resultado esperado |
|------|-----------|--------------------|
| 1 | Entra en `/admin`. | Ves el panel de administración. |
| 2 | Crea una votación. | La votación aparece en el listado. |
| 3 | Añade candidatos o importa `files/candidates-example.csv`. | Hay candidatos disponibles. |
| 4 | Configura `max_votantes = 3`. | El umbral será 2. |
| 5 | Abre sala e inicia votación. | La pantalla `/` permite votar. |
| 6 | Emite una papeleta. | La ronda registra votos. |
| 7 | Finaliza ronda. | Se calculan resultados. |
| 8 | Si faltan elegidos, inicia otra ronda. | Los candidatos seleccionados ya no compiten. |

---

## 📦 Comandos útiles

```bash
npm run dev        # Desarrollo local
npm run build      # Build de producción
npm run preview    # Preview del build
npm run lint       # Revisión ESLint
```

---

## 🧯 Si algo falla

| Síntoma | Posible causa | Qué revisar |
|---------|---------------|-------------|
| “Supabase no configurado” | Falta `.env.local` o valores incorrectos. | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. |
| “function ... does not exist” | Falta una migración SQL. | Orden en `supabase/sqls/README.md`. |
| No entra ningún votante | Sala no abierta o votación no iniciada. | Estado desde `/admin`. |
| Umbral raro con números pares | Migración antigua de mayoría. | `calculate_selection_threshold(4)` debe devolver `3`. |

---

## 📚 Siguiente lectura

- 🗳️ [Guía funcional del sistema](./VOTING_SYSTEM_GUIDE.md)
- 🔧 [Migraciones SQL](./MIGRATION_INSTRUCTIONS.md)
- 🔐 [Seguridad](./SECURITY.md)
