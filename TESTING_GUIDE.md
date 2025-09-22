# Guía de Pruebas - Sistema Simplificado de Autenticación

## Configuración Inicial

### 1. Configurar Supabase

1. **Crear proyecto**: Ve a [Supabase](https://supabase.com) y crea un nuevo proyecto
2. **Ejecutar schema**: En el SQL Editor, ejecuta `supabase-schema.sql`
3. **Obtener credenciales**: Ve a Settings > API y copia:
   - Project URL
   - anon/public key

### 2. Configurar Variables de Entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anonima
```

### 3. Iniciar Aplicación

```bash
npm install
npm run dev
```

## Flujo de Autenticación Simplificado

### Primer Uso (Sin Usuarios)

1. **Acceder**: Ve a `http://localhost:8080/admin`
2. **Configuración inicial**: Verás el formulario de "Configuración Inicial"
3. **Crear super admin**: 
   - Email: admin@ejemplo.com
   - Contraseña: admin123
   - Nombre: Administrador Principal
4. **Login automático**: El sistema te dirigirá al login automáticamente

### Login Normal

1. **Acceder**: `http://localhost:8080/admin`
2. **Iniciar sesión**: Usa las credenciales creadas
3. **Dashboard**: Acceso completo al panel de administración

### Gestión de Usuarios (Solo Super Admin)

1. **Acceder a gestión**: En el dashboard, ve a la pestaña "Usuarios"
2. **Crear usuario**: Haz clic en "Nuevo Usuario"
3. **Configurar**:
   - Nombre completo
   - Email
   - Contraseña
   - Rol: Admin o Super Admin
4. **Crear**: El usuario podrá acceder inmediatamente

## Características del Sistema Simplificado

### ✅ Ventajas

- **Configuración automática**: El primer usuario se vuelve super admin automáticamente
- **Interfaz simple**: Solo email/contraseña, sin complejidades
- **Gestión integrada**: Crear usuarios desde el panel, sin SQL manual
- **Roles claros**: Admin y Super Admin con permisos diferenciados
- **Reset fácil**: Script de limpieza completa de base de datos

### 🔧 Funcionalidades

1. **Autenticación**: Email/contraseña estándar
2. **Primer usuario**: Auto-promoción a super admin (trigger de BD)
3. **Gestión de usuarios**: Interfaz para crear admins adicionales
4. **Roles**: Super Admin (gestión completa) y Admin (operaciones)
5. **Reset de BD**: Script `database-reset.sql` para limpiar todo

### 📋 Roles y Permisos

#### Super Administrador
- ✅ Gestión completa de votaciones
- ✅ Crear/editar/eliminar otros usuarios
- ✅ Asignar roles (admin/super_admin)
- ✅ Acceso a todas las secciones

#### Administrador
- ✅ Gestión de votaciones
- ✅ Ver estadísticas
- ❌ No puede gestionar usuarios

## Resetear Sistema

Si necesitas empezar de cero:

1. **Ejecutar reset**: En Supabase SQL Editor, ejecuta `database-reset.sql`
2. **Recrear schema**: Ejecuta `supabase-schema.sql`
3. **Nuevo primer admin**: Ve a `/admin` y configura nuevamente

## Troubleshooting

### Error de Registro
- Verificar que Supabase esté configurado correctamente
- Comprobar políticas RLS en la base de datos
- Verificar que el schema esté completo

### Error de Login
- Confirmar que el usuario existe en `auth.users`
- Verificar que el perfil existe en `public.users`
- Comprobar las credenciales

### Sin Permisos de Gestión
- Verificar que el usuario tenga rol `super_admin`
- Comprobar políticas de la tabla `users`

## Diferencias con Sistema Anterior

### ❌ Eliminado
- Registro complejo con validaciones manuales
- Asignación manual de roles
- Configuración SQL manual del primer admin
- Múltiples rutas de registro

### ✅ Mejorado
- Registro automático de super admin
- Interfaz única para gestión de usuarios
- Trigger de base de datos para roles
- UX simplificada
- Documentación clara

## Próximos Pasos

Una vez configurado el sistema:
1. Crear usuarios administradores necesarios
2. Configurar las primeras votaciones
3. Probar el flujo completo de votación
4. Configurar despliegue en producción