# Guía de Implementación: VotingPage.tsx con Sistema de Asientos

## 🎯 Objetivo
Integrar el sistema de cupos (seats) en la página de votación, con bloqueo por dispositivo/navegador y ventana de gracia para reconexión.

## 📦 Importaciones Necesarias

```typescript
// Añadir a las importaciones existentes
import { generateDeviceHash, generateBrowserInstanceId, hasVotedLocally, markAsVoted, isVotingAvailable } from '@/lib/device';

// Tipos para respuestas de la API de asientos
interface JoinSeatResponse {
  success: boolean;
  seat_id?: string;
  is_new?: boolean;
  message: string;
  error_code?: 'ROUND_NOT_FOUND' | 'ROUND_FULL';
  occupied_seats?: number;
  max_votantes?: number;
}

interface VerifySeatResponse {
  valid: boolean;
  seat_id?: string;
  round_id?: string;
  message: string;
  error_code?: 'SEAT_NOT_FOUND' | 'SEAT_MISMATCH' | 'SEAT_EXPIRED' | 'SEAT_TIMEOUT';
}

interface SeatStatusResponse {
  success: boolean;
  round_id?: string;
  max_votantes?: number;
  occupied_seats?: number;
  expired_seats?: number;
  available_seats?: number;
  is_full?: boolean;
  error_code?: 'ROUND_NOT_FOUND';
  message?: string;
}

// Actualizar interface Round
interface Round {
  id: string;
  title: string;
  description: string;
  team: 'ECE' | 'ECL';
  max_votantes: number; // ⬅️ CAMBIO: renombrado de expected_voters
  current_round_number: number;
  max_votes_per_round: number;
  max_selected_candidates: number;
  selected_candidates_count: number;
  is_active: boolean;
  is_closed: boolean;
  round_finalized: boolean;
  show_results_to_voters: boolean;
}
```

## 🔧 Estado Adicional

```typescript
export function VotingPage() {
  // ... estados existentes ...
  
  // NUEVOS ESTADOS para gestión de asientos
  const [seatId, setSeatId] = useState<string | null>(null);
  const [seatStatus, setSeatStatus] = useState<SeatStatusResponse | null>(null);
  const [joiningRound, setJoiningRound] = useState(false);
  const [browserInstanceId] = useState(() => generateBrowserInstanceId());
  
  // ... resto del componente ...
}
```

## 🚀 Función: Unirse a la Ronda (Join Seat)

```typescript
/**
 * Intenta unirse a la ronda obteniendo un asiento
 * Maneja reingresos y errores de cupo lleno
 */
const joinRoundSeat = useCallback(async (roundId: string) => {
  if (!roundId || joiningRound) return;
  
  try {
    setJoiningRound(true);
    
    // Generar fingerprint del dispositivo
    const fingerprint = generateDeviceHash(roundId);
    const userAgent = navigator.userAgent;
    
    // Llamar a la función SQL join_round_seat
    const { data, error } = await supabase.rpc('join_round_seat', {
      p_round_id: roundId,
      p_fingerprint_hash: fingerprint,
      p_browser_instance_id: browserInstanceId,
      p_user_agent: userAgent,
      p_ip_address: null // Se puede obtener del servidor si está disponible
    });
    
    if (error) {
      console.error('Error joining round seat:', error);
      throw error;
    }
    
    const response = data as JoinSeatResponse;
    
    if (!response.success) {
      // Manejar errores específicos
      if (response.error_code === 'ROUND_FULL') {
        toast({
          title: 'Cupo completo',
          description: `La ronda está llena (${response.occupied_seats}/${response.max_votantes} asientos ocupados). Intenta más tarde.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error al unirse',
          description: response.message || 'No se pudo unir a la ronda',
          variant: 'destructive',
        });
      }
      return false;
    }
    
    // Éxito: guardar seat_id
    setSeatId(response.seat_id || null);
    
    if (response.is_new) {
      toast({
        title: 'Asiento asignado',
        description: '¡Has obtenido un asiento en esta ronda de votación!',
      });
    } else {
      toast({
        title: 'Reingreso exitoso',
        description: 'Recuperaste tu asiento anterior en esta ronda',
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error in joinRoundSeat:', error);
    toast({
      title: 'Error',
      description: 'No se pudo conectar con el servidor',
      variant: 'destructive',
    });
    return false;
  } finally {
    setJoiningRound(false);
  }
}, [browserInstanceId, joiningRound, toast]);
```

## ✅ Función: Verificar Asiento

```typescript
/**
 * Verifica que el asiento actual sea válido antes de votar
 * Actualiza last_seen_at automáticamente
 */
const verifySeat = useCallback(async (): Promise<boolean> => {
  if (!seatId || !activeRound) return false;
  
  try {
    const fingerprint = generateDeviceHash(activeRound.id);
    
    const { data, error } = await supabase.rpc('verify_seat', {
      p_seat_id: seatId,
      p_fingerprint_hash: fingerprint,
      p_browser_instance_id: browserInstanceId
    });
    
    if (error) {
      console.error('Error verifying seat:', error);
      return false;
    }
    
    const response = data as VerifySeatResponse;
    
    if (!response.valid) {
      // Manejar errores de validación
      let errorMessage = response.message;
      
      switch (response.error_code) {
        case 'SEAT_MISMATCH':
          errorMessage = 'Cambio de dispositivo o navegador detectado. No puedes votar desde aquí.';
          break;
        case 'SEAT_EXPIRED':
          errorMessage = 'Tu asiento ha expirado por inactividad. Recarga la página para obtener uno nuevo.';
          break;
        case 'SEAT_TIMEOUT':
          errorMessage = 'Tu sesión ha expirado. Recarga la página para continuar.';
          break;
      }
      
      toast({
        title: 'Asiento inválido',
        description: errorMessage,
        variant: 'destructive',
      });
      
      // Limpiar seat_id local
      setSeatId(null);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in verifySeat:', error);
    return false;
  }
}, [seatId, activeRound, browserInstanceId, toast]);
```

## 🔄 Función: Heartbeat (Keep-Alive)

```typescript
/**
 * Mantiene el asiento activo actualizando last_seen_at periódicamente
 * Ejecutar cada 2 minutos mientras la ronda esté activa
 */
useEffect(() => {
  if (!seatId || !activeRound?.is_active) return;
  
  // Verificar asiento cada 2 minutos
  const intervalId = setInterval(() => {
    verifySeat();
  }, 2 * 60 * 1000); // 2 minutos
  
  return () => clearInterval(intervalId);
}, [seatId, activeRound, verifySeat]);
```

## 📊 Función: Consultar Estado de Asientos

```typescript
/**
 * Consulta el estado de asientos de la ronda (para mostrar en UI)
 */
const loadSeatStatus = useCallback(async (roundId: string) => {
  try {
    const { data, error } = await supabase.rpc('get_round_seats_status', {
      p_round_id: roundId
    });
    
    if (error) throw error;
    
    setSeatStatus(data as SeatStatusResponse);
  } catch (error) {
    console.error('Error loading seat status:', error);
  }
}, []);
```

## 🔄 Integración en loadActiveRound

```typescript
const loadActiveRound = useCallback(async () => {
  try {
    setLoading(true);
    
    // ... código existente para cargar ronda ...
    
    if (!rounds || rounds.length === 0) {
      setActiveRound(null);
      setCandidates([]);
      setSeatId(null); // ⬅️ NUEVO: limpiar asiento
      return;
    }
    
    const round = rounds[0];
    setActiveRound(round);
    activeRoundRef.current = round;
    
    // ⬅️ NUEVO: Intentar unirse a la ronda automáticamente
    if (round.is_active && !round.is_closed) {
      const joined = await joinRoundSeat(round.id);
      if (!joined) {
        // No se pudo unir (cupo lleno, etc.)
        // Mostrar mensaje apropiado pero seguir mostrando información
      }
      
      // Cargar estado de asientos para mostrar en UI
      await loadSeatStatus(round.id);
    }
    
    // ... resto del código existente ...
    
  } catch (error) {
    console.error('Error in loadActiveRound:', error);
  } finally {
    setLoading(false);
  }
}, [joinRoundSeat, loadSeatStatus]);
```

## 🗳️ Modificar handleVote para Incluir Verificación de Asiento

```typescript
const handleVote = async () => {
  if (!activeRound || selectedCandidates.length === 0) return;
  
  // ⬅️ NUEVO: Verificar asiento antes de votar
  const seatValid = await verifySeat();
  if (!seatValid) {
    toast({
      title: 'No puedes votar',
      description: 'Tu asiento no es válido. Recarga la página e intenta nuevamente.',
      variant: 'destructive',
    });
    return;
  }
  
  try {
    setVoting(true);
    
    const deviceHash = generateDeviceHash(activeRound.id);
    
    // ... verificaciones existentes ...
    
    // Preparar votos con seat_id
    const votes = selectedCandidates.map(candidateId => ({
      round_id: activeRound.id,
      candidate_id: candidateId,
      device_hash: deviceHash,
      user_agent: navigator.userAgent,
      round_number: activeRound.current_round_number,
      seat_id: seatId // ⬅️ NUEVO: incluir seat_id
    }));
    
    const { error: voteError } = await supabase
      .from('votes')
      .insert(votes);
    
    // ... resto del código existente ...
    
  } catch (error) {
    // ... manejo de errores ...
  } finally {
    setVoting(false);
  }
};
```

## 🎨 Añadir UI para Mostrar Estado de Asientos

```tsx
{/* Mostrar estado de asientos cuando la ronda está activa */}
{activeRound && !activeRound.is_closed && seatStatus && (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        <Users className="h-5 w-5" />
        Estado de Cupos
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Asientos ocupados</p>
          <p className="text-2xl font-bold">
            {seatStatus.occupied_seats}/{seatStatus.max_votantes}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Disponibles</p>
          <p className="text-2xl font-bold text-green-600">
            {seatStatus.available_seats}
          </p>
        </div>
        {seatStatus.is_full && (
          <Badge variant="destructive">Cupo completo</Badge>
        )}
      </div>
      
      {seatId && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800">
            ✅ Tienes un asiento asignado en esta ronda
          </p>
        </div>
      )}
    </CardContent>
  </Card>
)}
```

## 📝 Notas Importantes

1. **Orden de operaciones**:
   - Cargar ronda → Unirse (joinRoundSeat) → Verificar antes de votar (verifySeat)

2. **Heartbeat**:
   - Ejecutar `verifySeat()` cada 2 minutos mantiene el asiento activo
   - Si el usuario está inactivo >10 min, el asiento expira automáticamente

3. **Manejo de errores**:
   - ROUND_FULL: Mostrar mensaje claro, permitir ver información pero no votar
   - SEAT_MISMATCH: Usuario cambió de navegador/dispositivo, rechazar voto
   - SEAT_EXPIRED/TIMEOUT: Sugerir recargar página

4. **Persistencia**:
   - `browserInstanceId` se genera una vez al montar el componente
   - Se persiste en localStorage + cookie automáticamente
   - Sobrevive a recargas de página

5. **Testing**:
   - Probar con max_votantes=3: abrir 3 pestañas, la 4ta debe ser rechazada
   - Probar cambio de navegador: copiar URL a otro navegador, debe ser rechazado
   - Probar recarga: cerrar y reabrir pestaña <10 min, debe recuperar asiento

## 🚀 Próximos Pasos

1. Implementar estos cambios en `VotingPage.tsx`
2. Probar flujo completo: join → vote → verify
3. Añadir indicadores visuales de estado de asiento
4. Probar escenarios edge: cupo lleno, timeout, cambio de navegador
5. Validar que el umbral de selección funciona correctamente
