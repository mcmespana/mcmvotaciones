# Database Reset Script - MCM Votaciones

## Overview

Este script `reset-database.sql` está diseñado para solucionar completamente los problemas de permisos 42501 que aparecen en el panel de administración de MCM Votaciones.

## Cuándo usar este script

**SIEMPRE** ejecuta este script después de cada commit en desarrollo, ya que proporciona una base de datos completamente limpia y funcional.

### Síntomas que indica que necesitas este script:

1. Error 42501 (permission denied) al intentar crear votaciones desde el admin
2. Error 42501 al cargar votaciones en el panel de administración
3. Errores de permisos al cambiar pestañas o crear nueva votación
4. POST requests a Supabase que retornan 401 Unauthorized

## Qué hace el script

### Fase 1: Limpieza total
- Elimina todos los triggers existentes
- Elimina todas las funciones
- Elimina todas las tablas (CASCADE para dependencies)
- Elimina todos los tipos personalizados
- Elimina todas las políticas RLS

### Fase 2: Recreación completa
- Crea tipos personalizados (user_role, team_type)
- Crea todas las tablas con las relaciones correctas
- Establece índices para rendimiento óptimo

### Fase 3: RLS simplificado y funcional
- Políticas separadas para usuarios públicos vs administradores
- **Usuarios públicos**: Solo ven rondas activas para votar
- **Administradores**: Acceso completo a todas las operaciones CRUD
- Sin conflictos entre políticas

### Fase 4: Funciones y triggers
- Autenticación bcrypt para admins
- Hash automático de contraseñas
- Funciones para cálculo de resultados
- Triggers para timestamps automáticos

### Fase 5: Usuario admin por defecto
- **Username**: `admin`
- **Password**: `Votaciones2025`
- **Role**: `super_admin`

## Cómo usar

### Opción 1: En Supabase Dashboard
1. Ve a SQL Editor en tu proyecto Supabase
2. Copia y pega todo el contenido de `reset-database.sql`
3. Ejecuta el script completo
4. Verifica que aparezca el mensaje de éxito

### Opción 2: Desde línea de comandos (si tienes psql)
```bash
psql -h your-supabase-host -U postgres -d postgres -f reset-database.sql
```

## Después de ejecutar el script

1. ✅ Podrás acceder al admin con `admin`/`Votaciones2025`
2. ✅ Crear votaciones sin errores 42501
3. ✅ Navegar entre pestañas sin problemas
4. ✅ Gestionar candidatos y votos
5. ✅ Ver todas las estadísticas en el dashboard

## Para desarrollo continuo

**Recomendación**: Ejecuta este script después de cada commit importante o cuando detectes problemas de permisos. Al ser un reset completo, garantiza que la base de datos esté en un estado consistente y funcional.

## Diferencias con scripts anteriores

### `complete-setup.sql` vs `reset-database.sql`
- **complete-setup.sql**: Para instalaciones nuevas, no elimina datos existentes
- **reset-database.sql**: Para desarrollo, elimina TODO y empieza desde cero

### Ventajas del reset script:
- ✅ Elimina cualquier política RLS conflictiva
- ✅ No hay problemas de dependencias entre objetos
- ✅ Garantiza un estado limpio y predecible
- ✅ Soluciona todos los errores 42501 conocidos

## Notas importantes

⚠️ **ADVERTENCIA**: Este script elimina TODOS los datos existentes. Úsalo solo en desarrollo.

⚠️ **No uses en producción** sin antes hacer backup de los datos importantes.

✅ **Seguro para desarrollo**: Perfecto para reiniciar la base de datos entre commits.

## Solución para errores de extensiones de Chrome

Los errores de chrome-extension que mencionas en el problema original son irrelevantes para el funcionamiento de la aplicación. Son errores cosméticos del navegador y no afectan la funcionalidad de MCM Votaciones.

Para reducir estos errores, puedes:
1. Desactivar extensiones innecesarias en modo desarrollo
2. Usar modo incógnito para pruebas
3. Ignorar estos errores (no afectan la aplicación)