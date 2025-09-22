# MCM Votaciones - Sistema de Votaciones Internas

Un sistema de votaciones internas basado en **Supabase** y **Vercel**, diseñado para ser ligero, responsive y seguro.

## 🏗️ Arquitectura del Sistema

### Frontend (Aplicación Pública)
- **React + TypeScript** con Vite
- **Tailwind CSS** + shadcn/ui para el diseño
- **Responsive** y optimizado para móviles
- **Identificación por dispositivo** (userAgent + IP + ronda) para prevenir votos duplicados
- **Sin necesidad de instalación** - funciona en cualquier navegador

### Backend + Database
- **Supabase** como backend completo (Base de datos, Auth, Real-time)
- **PostgreSQL** con Row Level Security (RLS)
- **Autenticación segura** para administradores
- **API REST** automática generada por Supabase

### Panel de Administración
- **Autenticación segura** con Supabase Auth
- **Gestión completa** de rondas, candidatos y usuarios
- **Importación desde Excel** (próximamente)
- **Exportación de resultados** en JSON/Excel
- **Dashboard en tiempo real**

## 🚀 Instalación y Configuración

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el script `supabase-schema.sql`
3. Copia las credenciales desde **Settings** > **API**

### 2. Configurar Variables de Entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anonima
```

### 3. Instalar y Ejecutar

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build

# Previsualizar build de producción
npm run preview
```

## 📱 Uso del Sistema

### Votación Pública

- Accede a la URL principal (ej: `https://tu-app.vercel.app`)
- Selecciona tu candidato preferido
- Confirma tu voto
- El sistema previene votos duplicados por dispositivo

### Panel de Administración

- Accede directamente con `/admin` (ej: `https://tu-app.vercel.app/admin`)
- Compatible con el formato anterior `?admin=true` (redirige automáticamente)
- Inicia sesión con credenciales de administrador
- Gestiona rondas, candidatos y consulta resultados

### Crear Primer Administrador

El sistema ha sido simplificado para facilitar la configuración inicial:

1. **Configuración automática**: Accede al panel de administración (`/admin`) 
2. **Primer usuario**: El primer usuario registrado se convierte automáticamente en super administrador
3. **Gestión de usuarios**: Los super administradores pueden crear usuarios adicionales desde el panel
4. **Login simple**: Sistema de email/contraseña estándar

#### Pasos para configurar:
1. Accede a `/admin`
2. Haz clic en "Configurar primer administrador"
3. Completa el formulario de registro
4. ¡Listo! Ya puedes gestionar el sistema

#### Gestión de usuarios adicionales:
- Los super administradores pueden crear nuevos usuarios desde la pestaña "Usuarios" del panel
- Pueden asignar roles de administrador o super administrador
- Interfaz simplificada para gestión de equipos

### Resetear Base de Datos

Si necesitas limpiar completamente la base de datos, ahora tienes un script especializado:

1. Ve al SQL Editor de tu proyecto Supabase
2. Ejecuta el script `database-reset.sql`
3. ⚠️ **ADVERTENCIA**: Esto eliminará TODOS los datos existentes
4. Útil para desarrollo o cuando hay problemas con el esquema
5. Después del reset, vuelve a ejecutar `supabase-schema.sql` para recrear las tablas

```bash
# Los scripts están en la raíz del proyecto
cat database-reset.sql    # Para limpiar todo
cat supabase-schema.sql   # Para recrear el esquema
```
1. Registra un usuario en Supabase Auth
2. Ejecuta en SQL Editor:
```sql
INSERT INTO public.users (id, email, name, role) 
VALUES (auth.uid(), 'tu-email@ejemplo.com', 'Tu Nombre', 'super_admin');
```

## 🗃️ Base de Datos

### Tablas Principales

- **`rounds`** - Rondas de votación
- **`candidates`** - Candidatos por ronda
- **`votes`** - Votos emitidos (con hash de dispositivo)
- **`users`** - Usuarios administradores
- **`vote_history`** - Historial de exportaciones

### Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- **Políticas de acceso** granulares por rol
- **Prevención de votos duplicados** por dispositivo
- **Autenticación JWT** para administradores

## 🌐 Despliegue en Vercel

### Automático desde GitHub

1. Conecta tu repositorio con [Vercel](https://vercel.com)
2. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Despliega automáticamente

### Manual

```bash
npm install -g vercel
vercel --prod
```

## 🔧 Comandos Disponibles

- `npm i` - Instalar dependencias
- `npm run dev` - Servidor de desarrollo (puerto 8080)
- `npm run build` - Build de producción
- `npm run build:dev` - Build de desarrollo
- `npm run preview` - Previsualizar build
- `npm run lint` - Linter ESLint

## 📊 Funcionalidades

### ✅ Implementado

- [x] Infraestructura base con Supabase
- [x] **Sistema de autenticación simplificado**
- [x] **Configuración automática del primer super administrador**
- [x] **Gestión de usuarios integrada en el panel**
- [x] **Roles claramente diferenciados (Super Admin / Admin)**
- [x] **Script de reset completo de base de datos**
- [x] Página de votación pública responsive
- [x] Panel de administración con dashboard mejorado
- [x] Prevención de votos duplicados por dispositivo
- [x] Base de datos con RLS y políticas de seguridad
- [x] **Triggers automáticos para asignación de roles**
- [x] Configuración para Vercel

### 🔄 En Desarrollo

- [ ] Gestión completa de rondas (CRUD)
- [ ] Gestión de candidatos con imágenes
- [ ] Importación de candidatos desde Excel
- [ ] Exportación de resultados (JSON/Excel)
- [ ] Dashboard con estadísticas en tiempo real
- [ ] Gestión de usuarios administradores
- [ ] Sistema de notificaciones

### 🎯 Próximas Mejoras

- [ ] Histórico por año y equipo organizador
- [ ] Gráficos de resultados en tiempo real
- [ ] Sistema de roles más granular
- [ ] API para integraciones externas
- [ ] PWA (Progressive Web App)
- [ ] Modo offline básico

## 🔐 Seguridad

### Prevención de Votos Duplicados

El sistema utiliza un **hash único** generado por:
- User Agent del navegador
- Resolución de pantalla
- Zona horaria
- ID de la ronda
- Dirección IP (cuando esté disponible)

### Autenticación Simplificada

- **Configuración automática**: El primer usuario se convierte en super administrador automáticamente
- **Email/contraseña estándar**: Sistema simple y confiable
- **Gestión integrada**: Los super admins pueden crear otros usuarios desde el panel
- **Roles claros**: Super Admin (gestión completa) vs Admin (operaciones)
- **JWT tokens**: Sesiones seguras con Supabase Auth
- **Políticas RLS**: Protección a nivel de base de datos
- **Reset completo**: Script de limpieza para desarrollo/troubleshooting

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas:

1. Revisa que las variables de entorno estén configuradas
2. Verifica que el schema de Supabase esté ejecutado
3. Comprueba las políticas RLS en Supabase
4. Consulta los logs en la consola del navegador

---

**Desarrollado para MCM España** 🇪🇸
