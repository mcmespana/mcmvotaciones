# 🎉 MCM Votaciones v2.0.0 - Release Notes

> **Fecha de lanzamiento**: 10 de octubre, 2025  
> **Tipo**: Major Release (Breaking Changes)

---

## 🌟 Características Principales

### 1. 🎫 Sistema de Cupos Fijos

**Antes (v1.x)**:
- ❌ Cualquier persona podía votar sin límite
- ❌ `expected_voters` era solo un número de referencia
- ❌ Difícil controlar la participación

**Ahora (v2.0)**:
- ✅ Cupo fijo de votantes (`max_votantes`)
- ✅ Bloqueo automático cuando se alcanza el límite
- ✅ Control total sobre la participación

```typescript
// Ejemplo: Solo 10 personas pueden votar en esta ronda
const round = {
  max_votantes: 10,  // Cupo fijo
  // ...
};
```

---

### 2. 🔒 Bloqueo por Dispositivo/Navegador

**Tecnología de Fingerprinting**:
- 🖥️ WebGL (GPU vendor/renderer)
- 🎨 Canvas fingerprinting
- 📱 Device attributes (memory, cores, touch points)
- 🌐 Browser instance ID (persistente)

**Garantías**:
- Un dispositivo/navegador = Un asiento
- Reconexión automática (ventana de gracia 10 min)
- Expiración por inactividad

```typescript
// El sistema detecta automáticamente
const fingerprint = {
  deviceHash: "abc123...",
  browserInstanceId: "uuid-persistente",
  webGLInfo: { vendor: "NVIDIA", renderer: "..." },
  canvasFingerprint: "hash-unico",
};
```

---

### 3. 🔢 Umbral de Selección Inteligente

**Antes (v1.x)**:
- ❌ Umbral = % de votos emitidos
- ❌ Un solo votante podía seleccionar múltiples candidatos
- ❌ Abstención reducía el umbral

**Ahora (v2.0)**:
- ✅ Umbral fijo basado en `max_votantes`
- ✅ Fórmula: `umbral = floor(max_votantes / 2) + 1`
- ✅ Abstención no reduce el umbral

```sql
-- Ejemplo: Ronda con 3 cupos
max_votantes = 3
umbral = floor(3 / 2) + 1 = 2

-- Escenarios:
-- Si solo 1 persona vota: Ningún candidato se selecciona (necesitan 2 votos)
-- Si 2 personas votan al mismo: Candidato se selecciona ✅
-- Si 3 personas votan diferentes: Ninguno se selecciona (todos tienen 1 voto)
```

---

## 🆕 Nuevas Funcionalidades

### Sistema de Asientos (`seats`)

| Feature | Descripción |
|---------|-------------|
| **join_round_seat()** | Asignar o recuperar asiento en una ronda |
| **verify_seat()** | Validar que el asiento sigue activo |
| **get_round_seats_status()** | Ver cupos ocupados/disponibles |
| **clear_round_seats()** | Limpiar asientos al finalizar |
| **expire_inactive_seats()** | Mantenimiento automático |

### Heartbeat Automático

```typescript
// Cada 2 minutos, el frontend notifica actividad
useEffect(() => {
  const heartbeat = setInterval(() => {
    verifySeat(seatId, fingerprint, browserInstanceId);
  }, 2 * 60 * 1000);
  
  return () => clearInterval(heartbeat);
}, [seatId]);
```

### Ventana de Gracia (10 minutos)

- ✅ Permite cerrar y reabrir el navegador
- ✅ Reconexión automática si el asiento sigue activo
- ❌ Después de 10 min de inactividad → asiento expirado

---

## ⚠️ Breaking Changes

### 1. Cambio en Base de Datos

**Columna renombrada**:
```sql
-- Antes
rounds.expected_voters INTEGER

-- Ahora
rounds.max_votantes INTEGER
```

**Nuevas tablas/enums**:
- `seat_status` enum: `libre`, `ocupado`, `expirado`
- `seats` table (10 columnas, 8 indexes)

**Nueva columna**:
- `votes.seat_id` (UUID, nullable)

### 2. Cambios en Funciones SQL

**Funciones modificadas**:
- `calculate_round_results_with_majority()` - Ahora usa umbral fijo
- `process_round_results()` - Incluye `threshold_required` en respuesta

**Funciones nuevas**:
- `calculate_selection_threshold(p_max_votantes)`
- `join_round_seat(...)` 
- `verify_seat(...)`
- `get_round_seats_status(p_round_id)`
- `clear_round_seats(p_round_id)`
- `expire_inactive_seats()`

### 3. Cambios en Frontend

**VotingManagement.tsx**:
```typescript
// Antes
interface Round {
  expected_voters: number;
}

// Ahora
interface Round {
  max_votantes: number;
}
```

**VotingPage.tsx** (nuevos estados):
```typescript
const [seatId, setSeatId] = useState<string | null>(null);
const [seatStatus, setSeatStatus] = useState<'checking' | 'active' | 'full' | 'expired'>('checking');
const [browserInstanceId] = useState(() => generateBrowserInstanceId());
```

---

## 📦 Archivos Nuevos/Modificados

### SQL Migrations

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `001-rename-expected-voters-to-max-votantes.sql` | Rename columna | ✅ Listo |
| `002-create-seats-table.sql` | Tabla de asientos | ✅ Listo |
| `003-update-majority-to-fixed-threshold.sql` | Lógica de umbral | ✅ Listo |
| `004-seats-management-api.sql` | API completa | ✅ Listo |
| `upgrade-to-v2-0-0.sql` | Migración combinada con pasos 001–004 | ✅ Listo |

### Frontend

| Archivo | Cambios | Estado |
|---------|---------|--------|
| `src/lib/device.ts` | +150 líneas (fingerprinting) | ✅ Completo |
| `src/components/admin/AdminVotingDetail.tsx` | Gestion de rondas y cupos | ✅ Completo |
| `src/pages/VotingPage.tsx` | Sistema de asientos | ✅ Completo |

### Documentación

| Archivo | Descripción |
|---------|-------------|
| `docs/README.md` | Índice de docs |
| `docs/QUICK_START.md` | 5 pasos para deployment |
| `docs/MIGRATION_INSTRUCTIONS.md` | Guía paso a paso |
| `docs/VOTING_PAGE_IMPLEMENTATION_GUIDE.md` | Código completo |
| `docs/VOTING_SYSTEM_GUIDE.md` | Guia funcional |
| `docs/SECURITY.md` | Seguridad para repo publico |
| `docs/CHANGELOG.md` | Historial detallado |

---

## 🚀 Cómo Actualizar

### Para Proyectos Nuevos

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd mcmvotaciones

# 2. Instalar dependencias
npm install

# 3. Configurar Supabase
cp .env.example .env.local
# Edita .env.local con tus credenciales

# 4. Ejecutar SQL
# En Supabase SQL Editor:
# - setup-database.sql
# - upgrade-to-v2-0-0.sql

# 5. Iniciar desarrollo
npm run dev
```

### Para Proyectos Existentes (v1.x → v2.0)

**⚠️ IMPORTANTE: Crea un backup de tu base de datos antes de migrar**

```bash
# 1. Actualizar código
git pull origin main
npm install

# 2. Ejecutar migraciones SQL
# En Supabase SQL Editor:
supabase/sqls/upgrade-to-v2-0-0.sql

# 3. Validar migración
# Ejecuta queries de verificación (ver docs/MIGRATION_INSTRUCTIONS.md)

# 4. Desplegar frontend
npm run build
# Deploy a Vercel/Netlify/etc.
```

**Tiempo estimado**: 60-90 minutos  
**Documentación**: [`QUICK_START.md`](./QUICK_START.md)

---

## 📊 Tests de Aceptación

### CA1: Cupo Fijo
- [ ] Crear ronda con `max_votantes=3`
- [ ] Verificar que solo 3 dispositivos pueden unirse
- [ ] Cuarto dispositivo recibe error `ROUND_FULL`

### CA2: Fingerprint + Browser Instance ID
- [ ] Cerrar y reabrir navegador → Mismo asiento
- [ ] Abrir en navegador diferente → Error `SEAT_MISMATCH`

### CA3: Ventana de Gracia
- [ ] Cerrar navegador por 5 min → Recupera asiento ✅
- [ ] Cerrar navegador por 15 min → Asiento expirado ❌

### CA4: Umbral Fijo
- [ ] `max_votantes=3` → umbral = 2
- [ ] Candidato con 1 voto → No seleccionado
- [ ] Candidato con 2+ votos → Seleccionado ✅

### CA5: Heartbeat
- [ ] Verificar llamadas a `verify_seat()` cada 2 minutos
- [ ] Sin heartbeat por 10+ min → Asiento expira

### CA6: Interfaz Admin
- [ ] Formulario muestra "Cupo máximo" (no "Votantes esperados")
- [ ] Dashboard muestra X/Y asientos ocupados

### CA7: Interfaz Votante
- [ ] Mensajes de error claros (ROUND_FULL, SEAT_EXPIRED, etc.)
- [ ] Loading states durante join/verify
- [ ] Votación deshabilitada si asiento inválido

**Documentación completa**: [`MIGRATION_INSTRUCTIONS.md`](./MIGRATION_INSTRUCTIONS.md)

---

## 🐛 Problemas Conocidos

Ninguno reportado al momento del lanzamiento.

**Reportar bugs**: Abre un issue en GitHub con:
- Descripción del problema
- Pasos para reproducir
- Logs de consola
- Screenshots (si aplica)

---

## 🙏 Agradecimientos

Gracias a todas las personas que probaron y revisaron esta version.

---

## 📚 Recursos Adicionales

- 📖 [Documentación completa](./README.md)
- 🚀 [Inicio rapido](./QUICK_START.md)
- 🔄 [Migraciones](./MIGRATION_INSTRUCTIONS.md)
- 🐛 [Debugging en tiempo real](./DEBUGGING_REALTIME.md)

---

**🎉 ¡Disfruta MCM Votaciones v2.0.0!**

*Desarrollado para Movimiento Consolación para el Mundo*
