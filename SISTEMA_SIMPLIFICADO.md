# Sistema de Autenticación Simplificado - MCM Votaciones

## 📋 Cambios Realizados

### 1. Nueva Estructura de Base de Datos Simplificada

Se ha creado un nuevo esquema de base de datos que **elimina la dependencia de Supabase Auth** para los administradores, usando autenticación simple con usuario y contraseña.

### 2. Tabla `admin_users` Simplificada

```sql
CREATE TABLE public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

**Características:**
- ✅ Username único para login simple
- ✅ Password hasheado automáticamente con bcrypt
- ✅ Email para contacto/notificaciones
- ✅ Roles: `admin` y `super_admin`
- ✅ Primera cuenta creada automáticamente es `super_admin`

### 3. Funciones de Autenticación

```sql
-- Función para autenticar usuarios
CREATE OR REPLACE FUNCTION authenticate_admin(input_username TEXT, input_password TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  name TEXT,
  role user_role,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)

-- Función para hashear contraseñas automáticamente
CREATE OR REPLACE FUNCTION hash_password_trigger()
RETURNS TRIGGER
```

## 🚀 Configuración Inicial

### Paso 1: Ejecutar el Nuevo Schema
1. Abre tu panel de Supabase
2. Ve a SQL Editor
3. Ejecuta el archivo `supabase-schema-simplified.sql`

### Paso 2: Crear Primer Administrador
1. Ve a `/admin` en tu aplicación
2. Haz clic en "Configurar primer administrador"
3. Llena el formulario:
   - **Nombre**: Tu nombre completo
   - **Usuario**: `admin` (o el que prefieras)
   - **Email**: Tu email
   - **Contraseña**: Mínimo 6 caracteres
4. El primer usuario creado será automáticamente `super_admin`

### Paso 3: Login Simplificado
- **Usuario**: El username que configuraste
- **Contraseña**: La contraseña que configuraste
- Ya no se necesita email complicado ni Supabase Auth

## 📊 Tablas de Base de Datos Actualizadas

### Tabla Principal: `admin_users`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | Identificador único |
| `username` | TEXT | Nombre de usuario para login |
| `password_hash` | TEXT | Contraseña hasheada (bcrypt) |
| `name` | TEXT | Nombre completo |
| `email` | TEXT | Email de contacto |
| `role` | ENUM | `admin` o `super_admin` |
| `created_at` | TIMESTAMP | Fecha de creación |
| `updated_at` | TIMESTAMP | Última actualización |

### Otras Tablas (Sin cambios)
- ✅ `rounds` - Rondas de votación
- ✅ `candidates` - Candidatos
- ✅ `votes` - Votos (sistema público sin auth)
- ✅ `vote_history` - Historial de exportaciones

### Referencias Actualizadas
- `vote_history.exported_by` ahora referencia `admin_users.id`
- Todas las políticas RLS simplificadas
- Solo las tablas de votación tienen RLS público

## 🔐 Flujo de Autenticación Nuevo

### Antes (Complejo)
1. Supabase Auth registro con email
2. Confirmar email
3. Insertar manualmente en `users` table
4. Manejar sesiones de Supabase
5. Sincronizar auth.users con public.users

### Ahora (Simple)
1. Formulario con username/password
2. Hash automático de contraseña
3. Login directo con username/password
4. Sesión guardada en localStorage
5. Todo en una sola tabla `admin_users`

## 🎯 Beneficios del Nuevo Sistema

### ✅ Para Administradores
- **Login simple**: Solo username y password
- **Creación desde interfaz**: Ya no necesitas ejecutar SQL manualmente
- **Sin emails**: No dependes de confirmación por email
- **Gestión visual**: Interfaz para crear nuevos admins

### ✅ Para Desarrolladores
- **Menos dependencias**: No necesitas Supabase Auth complejo
- **Código más simple**: AuthContext mucho más limpio
- **Menos bugs**: Sin sincronización entre auth.users y public.users
- **Fácil debug**: Todo en una tabla visible

### ✅ Para el Sistema
- **Más rápido**: Sin llamadas adicionales a auth
- **Más confiable**: Sin dependencia de servicios externos de auth
- **Más seguro**: Hashing automático, roles claros
- **Más escalable**: Fácil agregar campos a admin_users

## 🔄 Migración desde Sistema Anterior

Si ya tenías usuarios en el sistema anterior:

```sql
-- OPCIONAL: Migrar usuarios existentes (ajustar según necesidad)
INSERT INTO public.admin_users (username, password_hash, name, email, role)
SELECT 
  SPLIT_PART(email, '@', 1) as username,
  'cambiar123' as password_hash, -- Se hasheará automáticamente
  name,
  email,
  role
FROM public.users;

-- Luego eliminar tabla antigua si ya no la necesitas
-- DROP TABLE public.users;
```

## 📝 Nuevos Comandos SQL Útiles

```sql
-- Ver todos los administradores
SELECT username, name, email, role, created_at 
FROM public.admin_users 
ORDER BY created_at;

-- Crear admin desde SQL (si necesitas)
INSERT INTO public.admin_users (username, password_hash, name, email, role)
VALUES ('nuevo_admin', 'password123', 'Nombre Admin', 'admin@email.com', 'admin');

-- Cambiar rol de usuario
UPDATE public.admin_users 
SET role = 'super_admin' 
WHERE username = 'admin';

-- Ver estadísticas de votación
SELECT 
  r.title,
  COUNT(v.id) as total_votes,
  r.is_active
FROM rounds r
LEFT JOIN votes v ON r.id = v.round_id
GROUP BY r.id, r.title, r.is_active
ORDER BY r.created_at DESC;
```

## 🛡️ Seguridad

### Características de Seguridad Implementadas
- ✅ **Passwords hasheados** con bcrypt (salt automático)
- ✅ **Username único** (no duplicados)
- ✅ **Email único** (no duplicados)  
- ✅ **Roles claramente definidos** (admin vs super_admin)
- ✅ **Primer usuario es super_admin** automáticamente
- ✅ **Solo super_admins pueden crear otros admins**
- ✅ **Sesiones en localStorage** (puedes cambiar a cookies si prefieres)
- ✅ **RLS en tablas de votación** (acceso público controlado)

### Recomendaciones Adicionales
- Cambiar contraseñas predeterminadas inmediatamente
- Usar contraseñas fuertes (mínimo 8 caracteres)
- Revisar logs de acceso regularmente
- Respaldar tabla admin_users regularmente

---

**¡El sistema ahora es mucho más simple y fácil de usar! 🎉**