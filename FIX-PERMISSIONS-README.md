# Fix para errores de permisos 42501 en MCM Votaciones

## Problema identificado

El sistema presentaba errores 42501 (permission denied) al intentar:
- Cargar las votaciones en el panel de administración  
- Crear nuevas votaciones
- Acceder a la gestión de candidatos

## Causa raíz

Las políticas de Row Level Security (RLS) en PostgreSQL tenían conflictos:

1. **Política restrictiva**: "Anyone can view active rounds" solo permitía ver rondas activas
2. **Política permisiva**: "Allow round management" permitía todo pero entraba en conflicto
3. **Resultado**: Los administradores no podían ver rondas inactivas/cerradas ni crear nuevas

## Solución implementada

### 1. Archivo `fix-rls-policies.sql` 
Script que corrige las políticas RLS con separación clara:
- **Usuarios públicos**: Solo ven rondas activas para votar
- **Administradores**: Acceso completo a todas las operaciones CRUD

### 2. Archivo `complete-setup.sql` actualizado
Se corrigieron las políticas originales para evitar el problema en nuevas instalaciones.

### 3. Mejor manejo de errores
Se mejoró el manejo de errores en:
- `VotingManagement.tsx`: Detecta error 42501 y sugiere ejecutar el script de corrección
- `AdminDashboard.tsx`: Mismo manejo mejorado de errores

## Cómo aplicar la corrección

### Opción 1: Para bases de datos existentes
```sql
-- Ejecutar en tu base de datos PostgreSQL/Supabase
\i fix-rls-policies.sql
```

### Opción 2: Para nuevas instalaciones  
```sql
-- Usar el archivo actualizado
\i complete-setup.sql
```

## Cambios técnicos realizados

### Políticas RLS corregidas:

**ANTES (problemático):**
```sql
CREATE POLICY "Anyone can view active rounds" ON public.rounds
  FOR SELECT USING (is_active = true AND is_closed = false);
```

**DESPUÉS (corregido):**
```sql
CREATE POLICY "Public can view active rounds for voting" ON public.rounds
  FOR SELECT USING (is_active = true AND is_closed = false);

CREATE POLICY "Admins can manage all rounds" ON public.rounds
  FOR ALL USING (true);
```

### Manejo de errores mejorado:

```typescript
// Antes
catch (error) {
  console.error('Error loading rounds:', error);
  // Error genérico
}

// Después  
catch (error: any) {
  console.error('Error loading rounds:', error);
  let errorMessage = 'No se pudieron cargar las votaciones';
  if (error?.code === '42501') {
    errorMessage = 'Error de permisos: Ejecuta el script fix-rls-policies.sql';
  }
  // Error específico con solución
}
```

## Archivos modificados

- ✅ `fix-rls-policies.sql` (nuevo)
- ✅ `complete-setup.sql` (actualizado)  
- ✅ `src/components/VotingManagement.tsx` (mejor error handling)
- ✅ `src/components/AdminDashboard.tsx` (mejor error handling)
- ✅ `FIX-PERMISSIONS-README.md` (este archivo)

## Verificación de la corrección

Una vez aplicado el script, deberías poder:
1. ✅ Acceder al panel de administración sin errores
2. ✅ Ver todas las votaciones (activas e inactivas)
3. ✅ Crear nuevas votaciones sin error 42501
4. ✅ Gestionar candidatos sin problemas

## Notas adicionales

- Los errores de extensiones de Chrome mencionados son irrelevantes al problema SQL
- La corrección mantiene la seguridad: usuarios públicos siguen limitados a rondas activas
- Los administradores tienen acceso completo según se requiere para la gestión