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
- **Autenticación simplificada** con tabla admin_users
- **API REST** automática generada por Supabase

### Panel de Administración
- **Autenticación simplificada** usuario/contraseña
- **Gestión completa** de rondas, candidatos y usuarios
- **Exportación de resultados** en JSON/Excel
- **Dashboard en tiempo real**

## 🚀 Instalación y Configuración (Simplificado)

### 1. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el script `complete-setup.sql`
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

### 3. Acceso Inicial

**Usuario administrador por defecto:**
- **Usuario**: `admin`
- **Contraseña**: `Votaciones2025`

Ve a `/admin` en tu aplicación e inicia sesión directamente.

### 4. Instalar y Ejecutar

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

### Gestión de Usuarios Adicionales

Una vez logueado como administrador principal, puedes:
- Crear nuevos usuarios desde la pestaña "Usuarios" del panel
- Asignar roles de administrador o super administrador
- Gestionar equipos de trabajo

## 🗃️ Base de Datos

### Tablas Principales

- **`admin_users`** - Usuarios administradores (autenticación simplificada)
- **`rounds`** - Rondas de votación  
- **`candidates`** - Candidatos por ronda
- **`votes`** - Votos emitidos (con hash de dispositivo)
- **`vote_history`** - Historial de exportaciones

### Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- **Políticas de acceso** granulares por rol
- **Prevención de votos duplicados** por dispositivo
- **Hashing bcrypt** automático para contraseñas

## 🌐 Despliegue en Vercel

### Automático desde GitHub

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno de Supabase
3. ¡Despliega automáticamente!

### Variables de Entorno en Vercel

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica-anonima
```

## 🛠️ Características Técnicas

### Funcionalidades Implementadas

- ✅ Sistema de votación anónimo por dispositivo
- ✅ Panel de administración completo
- ✅ Prevención de votos duplicados
- ✅ Exportación de resultados
- ✅ Responsive design para móviles
- ✅ Autenticación simplificada para admins
- ✅ Gestión de rondas y candidatos
- ✅ Dashboard con estadísticas en tiempo real

### Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + API REST)
- **Autenticación**: Sistema simplificado con tabla admin_users
- **Hosting**: Vercel (recomendado)
- **Base de Datos**: PostgreSQL con Row Level Security

## 📞 Soporte

Para soporte técnico o consultas sobre el sistema, contacta al equipo de desarrollo.

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
