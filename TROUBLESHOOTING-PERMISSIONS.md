# Guía de Resolución de Problemas de Permisos - MCM Votaciones

## ¿Sigues teniendo errores 42501 después de ejecutar los scripts?

Esta guía te ayudará a resolver los problemas de permisos de forma definitiva.

## Síntomas Comunes

- ✗ Error 42501 (permission denied) al crear votaciones
- ✗ Error 42501 al cargar votaciones en el panel de administración
- ✗ Error 401 Unauthorized en requests POST a Supabase
- ✗ Fallos al cambiar pestañas o navegar en el admin panel
- ✗ Mensaje: "Error de permisos: Para desarrollo, ejecuta reset-database.sql en Supabase"

## Soluciones Paso a Paso

### 🔧 Opción 1: Solución Completa (Recomendada para Desarrollo)

**⚠️ ADVERTENCIA**: Esta opción elimina TODOS los datos existentes. Solo usar en desarrollo.

1. **Accede a Supabase SQL Editor**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)
   - Navega a SQL Editor
   - Crea una nueva query

2. **Ejecuta el script completo**
   ```sql
   -- Copia TODO el contenido del archivo reset-database.sql
   -- y pégalo en el SQL Editor
   ```

3. **Ejecuta el script**
   - Haz clic en "RUN" 
   - Espera a que termine (puede tomar 30-60 segundos)
   - Debe aparecer un mensaje de éxito al final

4. **Verifica la instalación**
   - Usuario admin creado: `admin` / `Votaciones2025`
   - Tablas creadas correctamente
   - Políticas RLS configuradas

### 🔧 Opción 2: Verificación y Corrección Manual

Si sigues teniendo problemas después de la Opción 1:

#### Paso 1: Verifica el Estado de la Base de Datos

```sql
-- Ejecuta esta query para verificar las tablas existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_users', 'rounds', 'candidates', 'votes', 'round_results');
```

**Resultado esperado**: Debe mostrar las 5 tablas.

#### Paso 2: Verifica las Políticas RLS

```sql
-- Ejecuta esta query para verificar las políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

**Resultado esperado**: Debe mostrar múltiples políticas para cada tabla.

#### Paso 3: Verifica el Usuario Admin

```sql
-- Verifica que existe el usuario admin
SELECT username, role, created_at 
FROM public.admin_users 
WHERE username = 'admin';
```

**Resultado esperado**: Debe mostrar un usuario admin con role 'super_admin'.

### 🔧 Opción 3: Solución para Producción

Si estás en producción y no puedes eliminar datos:

#### Paso 1: Ejecuta Solo las Políticas RLS

```sql
-- Ejecuta SOLO el contenido del archivo fix-rls-policies.sql
-- (NO uses reset-database.sql en producción)
```

#### Paso 2: Verifica Permisos de Usuario

```sql
-- Verifica que tu usuario tiene los permisos correctos
SELECT current_user, session_user;

-- Verifica las políticas específicas
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'rounds' 
AND schemaname = 'public';
```

### 🔧 Opción 4: Problemas de Configuración de Supabase

#### Verifica las Variables de Entorno

1. **Revisa tu archivo `.env.local`**:
   ```
   VITE_SUPABASE_URL=https://tuproyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu_anon_key
   ```

2. **Verifica que las URLs son correctas**:
   - La URL debe terminar en `.supabase.co`
   - La anon key debe ser la clave pública (no la service key)

#### Revisa la Configuración de RLS en Supabase Dashboard

1. Ve a **Database > Tables** en Supabase
2. Para cada tabla (`rounds`, `candidates`, `votes`, etc.):
   - Verifica que "Enable RLS" esté activado
   - Revisa que existan políticas en la pestaña "Policies"

### 🔧 Opción 5: Problemas de Caché/Sesión

1. **Limpia el caché del navegador**:
   - Ctrl+Shift+R (o Cmd+Shift+R en Mac)
   - O abre en modo incógnito

2. **Reinicia el servidor de desarrollo**:
   ```bash
   # Detén el servidor (Ctrl+C)
   npm run dev
   ```

3. **Verifica la consola del navegador**:
   - Abre las DevTools (F12)
   - Ve a la pestaña Console
   - Busca errores específicos de Supabase

## Verificación Final

Después de aplicar cualquiera de las soluciones, verifica que todo funciona:

### ✅ Checklist de Funcionamiento

1. **Acceso al Admin**:
   - [ ] Puedes hacer login con `admin` / `Votaciones2025`
   - [ ] El dashboard carga sin errores 42501
   - [ ] Puedes navegar entre pestañas

2. **Gestión de Votaciones**:
   - [ ] Puedes ver la lista de votaciones existentes
   - [ ] Puedes crear una nueva votación sin error 42501
   - [ ] Puedes editar votaciones existentes

3. **Gestión de Candidatos**:
   - [ ] Puedes ver candidatos de las votaciones
   - [ ] Puedes agregar nuevos candidatos
   - [ ] Puedes editar información de candidatos

4. **Sin Errores en Consola**:
   - [ ] No hay errores 42501 en la consola del navegador
   - [ ] No hay errores 401 Unauthorized
   - [ ] Los requests a Supabase funcionan correctamente

## ¿Sigues Teniendo Problemas?

### Información para Diagnóstico

Si ninguna de las soluciones anteriores funciona, recopila esta información:

1. **Error exacto**:
   ```
   Copia el error completo de la consola del navegador
   ```

2. **Configuración**:
   - ¿Usas Supabase local o cloud?
   - ¿Es un proyecto nuevo o existente?
   - ¿Has modificado las políticas RLS manualmente?

3. **Scripts ejecutados**:
   - ¿Qué scripts has ejecutado y en qué orden?
   - ¿Hubo errores al ejecutar los scripts?

4. **Verificación de tablas**:
   ```sql
   -- Ejecuta esto y copia el resultado
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

### Solución de Emergencia

Como último recurso, puedes recrear completamente el proyecto Supabase:

1. Haz backup de tus datos importantes
2. Crea un nuevo proyecto en Supabase
3. Ejecuta `reset-database.sql` en el proyecto nuevo
4. Actualiza las variables de entorno con los nuevos valores

## Errores de Chrome Extensions

Los errores de `chrome-extension://...` que puedas ver en la consola son **completamente irrelevantes** para el funcionamiento de MCM Votaciones:

- ❌ NO afectan la funcionalidad de la aplicación
- ❌ NO causan errores 42501
- ❌ NO necesitan ser corregidos

Para reducir estos errores cosméticos:
- Desactiva extensiones innecesarias en modo desarrollo
- Usa modo incógnito para pruebas
- Simplemente ignóralos

## Resumen

La mayoría de problemas de permisos se resuelven con:

1. **Para desarrollo**: Ejecutar `reset-database.sql` completo
2. **Para producción**: Ejecutar `fix-rls-policies.sql` únicamente
3. **Verificar** variables de entorno y configuración de Supabase
4. **Limpiar caché** del navegador si es necesario

Estos pasos solucionan el 99% de los casos de errores 42501 en MCM Votaciones.