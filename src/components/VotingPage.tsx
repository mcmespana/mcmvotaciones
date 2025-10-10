import { Vote } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { generateDeviceHash, hasVotedLocally, markAsVoted, isVotingAvailable } from '@/lib/device';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Round {
  id: string;
  title: string;
  description: string;
  team: 'ECE' | 'ECL';
  current_round_number: number;
  max_votes_per_round: number;
  max_selected_candidates: number;
  selected_candidates_count: number;
  is_active: boolean;
  is_closed: boolean;
  round_finalized: boolean;
  show_results_to_voters: boolean;
}

interface Candidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  description: string | null;
  image_url: string | null;
  order_index: number;
  is_eliminated: boolean;
  is_selected: boolean;
}

interface RoundResult {
  candidate_id: string;
  vote_count: number;
  percentage: number;
}

export function VotingPage() {
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Ref para evitar bucles infinitos en suscripciones
  const activeRoundRef = useRef<Round | null>(null);

  // Calcula el máximo de votos por persona en esta ronda según los candidatos pendientes
  const computeMaxVotesThisRound = useCallback(() => {
    if (!activeRound) return 0;
    const currentlySelected = candidates.filter(c => c.is_selected).length;
    const remainingToSelect = activeRound.max_selected_candidates - currentlySelected;
    // Regla: Siempre máximo 3 votos, excepto cuando solo quedan 2 o 1 por seleccionar
    // Ejemplo: max_selected_candidates = 6
    // - 0/6 seleccionados → quedan 6 → max 3 votos
    // - 1/6 seleccionados → quedan 5 → max 3 votos
    // - 2/6 seleccionados → quedan 4 → max 3 votos
    // - 3/6 seleccionados → quedan 3 → max 3 votos
    // - 4/6 seleccionados → quedan 2 → max 2 votos
    // - 5/6 seleccionados → queda 1 → max 1 voto
    if (remainingToSelect > 2) return 3;
    if (remainingToSelect === 2) return 2;
    if (remainingToSelect === 1) return 1;
    return 0;
  }, [activeRound, candidates]);

  const loadResults = useCallback(async (roundId: string, roundNumber: number) => {
    if (!roundId) return;

    try {
      setLoadingResults(true);
      
      const { data, error } = await supabase
        .from('round_results')
        .select('candidate_id, vote_count, percentage')
        .eq('round_id', roundId)
        .eq('round_number', roundNumber)
        .order('vote_count', { ascending: false });

      if (error) {
        console.error('Error loading results:', error);
        return;
      }

      setResults(data || []);
    } catch (error) {
      console.error('Error in loadResults:', error);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  const loadActiveRound = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get active round (puede estar abierta o cerrada)
      const { data: rounds, error: roundError } = await supabase
        .from('rounds')
        .select('*')
        .eq('is_active', true)
        .limit(1);

      if (roundError) {
        console.error('Error loading round:', roundError);
        toast({
          title: 'Error',
          description: 'No se pudo cargar la información de la votación',
          variant: 'destructive',
        });
        return;
      }

  if (!rounds || rounds.length === 0) {
        // No hay rondas activas: limpiar el estado para reflejar "Sin votaciones activas"
        setActiveRound(null);
        setCandidates([]);
        // No limpiar selección/resultados para no molestar la UI intermedia

        toast({
          title: 'Sin votaciones activas',
          description: 'No hay votaciones disponibles en este momento',
        });
        return;
      }

  const round = rounds[0];
  const current = activeRoundRef.current;
  const sameRoundSameNumber = current && round.id === current.id && round.current_round_number === current.current_round_number;
  setActiveRound(round);
  activeRoundRef.current = round;
  if (!sameRoundSameNumber) {
    setSelectedCandidates([]);
    setResults([]);
    setHasVoted(false);
  }

      // Check if already voted in current round
      const deviceHash = generateDeviceHash(round.id);
      const { data: existingVotes, error: voteCheckError } = await supabase
        .from('votes')
        .select('id')
        .eq('round_id', round.id)
        .eq('device_hash', deviceHash)
        .eq('round_number', round.current_round_number);

      if (voteCheckError) {
        console.error('Error checking existing votes:', voteCheckError);
      } else {
        const alreadyVoted = (existingVotes && existingVotes.length > 0) || hasVotedLocally(round.id, round.current_round_number);
        setHasVoted(alreadyVoted);
        
        // Load results if visible AND round is finalized (regardless of whether the user voted)
        if (round.show_results_to_voters && round.round_finalized) {
          loadResults(round.id, round.current_round_number);
        }
      }

      // Load ALL candidates for this round (to show both active and selected)
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('round_id', round.id)
        .order('order_index');

      if (candidateError) {
        console.error('Error loading candidates:', candidateError);
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los candidatos',
          variant: 'destructive',
        });
        return;
      }

      setCandidates(candidateData || []);
    } catch (error) {
      console.error('Error in loadActiveRound:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al cargar la votación',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast, loadResults]);

  useEffect(() => {
    // Handle backward compatibility for ?admin=true parameter
    const adminParam = searchParams.get('admin');
    if (adminParam === 'true') {
      navigate('/admin', { replace: true });
      return;
    }
    
    loadActiveRound();

    // Subscribe to real-time updates for rounds (recarga selectiva)
    const roundsChannel = supabase
      .channel('voter-rounds-updates')
      // Escuchar INSERT: cuando se crea una nueva ronda activa
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'rounds',
          filter: 'is_active=eq.true'
        }, 
        (payload) => {
          console.log('🆕 New active round created:', payload);
          const newRound = (payload as unknown as { new: Partial<Round> }).new;
          
          // Mostrar notificación al usuario
          toast({
            title: '🎉 Nueva votación disponible',
            description: newRound.title || 'Se ha iniciado una nueva votación',
          });
          
          // Recargar inmediatamente cuando hay una nueva ronda activa
          loadActiveRound();
        }
      )
      // Escuchar UPDATE: cuando se modifica una ronda existente
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rounds' 
        }, 
        (payload) => {
          console.log('🔄 Round updated:', payload);
          const updated = (payload as unknown as { new: Partial<Round> }).new;
          if (!updated) return;
          const current = activeRoundRef.current;
          
          // Si la ronda actualizada es la activa actual, verificar si afecta al votante
          if (current && updated.id === current.id) {
            const affectsVoter = (
              updated.is_active !== undefined && updated.is_active !== current.is_active
            ) || (
              updated.is_closed !== undefined && updated.is_closed !== current.is_closed
            ) || (
              updated.round_finalized !== undefined && updated.round_finalized !== current.round_finalized
            ) || (
              updated.show_results_to_voters !== undefined && updated.show_results_to_voters !== current.show_results_to_voters
            ) || (
              updated.current_round_number !== undefined && updated.current_round_number !== current.current_round_number
            );
            if (affectsVoter) {
              console.log('🔄 Current round updated with voter impact, reloading...');
              // Agregar toast específico según el tipo de cambio
              if (updated.is_active === false) {
                toast({
                  title: '⏸️ Votación pausada',
                  description: 'La votación actual ha sido pausada',
                });
              } else if (updated.is_closed === true) {
                toast({
                  title: '🏁 Votación finalizada',
                  description: 'La votación ha sido cerrada',
                });
              }
              loadActiveRound();
            }
          }
          // Si se activó una ronda diferente o cuando no había ninguna activa
          else if (updated.is_active === true) {
            console.log('🔄 Different round became active, reloading...', {
              updatedId: updated.id,
              currentId: current?.id || 'none'
            });
            toast({
              title: '🎉 Nueva votación disponible',
              description: 'Una nueva votación está disponible',
            });
            loadActiveRound();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to rounds updates (INSERT + UPDATE)');
        }
      });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔌 Unsubscribing from rounds updates');
      supabase.removeChannel(roundsChannel);
    };
  }, [navigate, loadActiveRound, searchParams, toast]);

  const submitVote = async () => {
    if (selectedCandidates.length === 0 || !activeRound) return;

    // No permitir votar si la ronda está finalizada
    if (activeRound.round_finalized) {
      toast({
        title: 'Ronda finalizada',
        description: 'Esta ronda ya ha finalizado y no se pueden enviar más votos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setVoting(true);
      
      const deviceHash = generateDeviceHash(activeRound.id);
      const userAgent = navigator.userAgent;
      
      // Check if this device has already voted in this round
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('id')
        .eq('round_id', activeRound.id)
        .eq('device_hash', deviceHash)
        .eq('round_number', activeRound.current_round_number);

      if (checkError) {
        console.error('Error checking existing vote:', checkError);
        toast({
          title: 'Error',
          description: 'Error al verificar el voto',
          variant: 'destructive',
        });
        return;
      }

      if (existingVote && existingVote.length > 0) {
        toast({
          title: 'Ya has votado',
          description: 'Este dispositivo ya ha emitido un voto en esta ronda',
          variant: 'destructive',
        });
        setHasVoted(true);
    markAsVoted(activeRound.id, activeRound.current_round_number);
        return;
      }

      // Submit votes for each selected candidate
      const votes = selectedCandidates.map(candidateId => ({
        round_id: activeRound.id,
        candidate_id: candidateId,
        device_hash: deviceHash,
        user_agent: userAgent,
        round_number: activeRound.current_round_number,
        ip_address: 'browser-client',
      }));

      const { error: voteError } = await supabase
        .from('votes')
        .insert(votes);

      if (voteError) {
        console.error('Error submitting vote:', voteError);
        toast({
          title: 'Error',
          description: 'No se pudo registrar el voto',
          variant: 'destructive',
        });
        return;
      }

      // Mark as voted locally
  markAsVoted(activeRound.id, activeRound.current_round_number);
      setHasVoted(true);
      
      toast({
        title: '¡Voto registrado!',
        description: `Has votado por ${selectedCandidates.length} candidato${selectedCandidates.length > 1 ? 's' : ''}`,
      });

      // Load results if round is finalized and results should be visible
      if (activeRound.round_finalized && activeRound.show_results_to_voters) {
        await loadResults(activeRound.id, activeRound.current_round_number);
      }

    } catch (error) {
      console.error('Error in submitVote:', error);
      toast({
        title: 'Error',
        description: 'Error inesperado al votar',
        variant: 'destructive',
      });
    } finally {
      setVoting(false);
    }
  };

  const toggleCandidateSelection = (candidateId: string) => {
    if (!activeRound) return;
    // Límite dinámico corregido (máximo 3; baja a 2 con 4 restantes; baja a 1 con 1 restante)
    const maxVotesThisRound = computeMaxVotesThisRound();

    setSelectedCandidates(prev => {
      const isSelected = prev.includes(candidateId);
      
      if (isSelected) {
        // Remove candidate
        return prev.filter(id => id !== candidateId);
      } else {
        // Add candidate if under limit
        if (prev.length < maxVotesThisRound) {
          return [...prev, candidateId];
        } else {
          toast({
            title: 'Límite alcanzado',
            description: `Solo puedes votar por ${maxVotesThisRound} candidato${maxVotesThisRound > 1 ? 's' : ''} en esta ronda`,
            variant: 'destructive',
          });
          return prev;
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando votación...</p>
        </Card>
      </div>
    );
  }

  if (!isVotingAvailable()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold mb-4">Navegador no compatible</h1>
          <p className="text-muted-foreground">
            Tu navegador no soporta las funciones necesarias para votar.
            Por favor, usa un navegador más reciente.
          </p>
        </Card>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Vote className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold mb-2">Sin votaciones activas</h1>
          <p className="text-muted-foreground mb-4">
            No hay votaciones disponibles en este momento.
          </p>
        </Card>
      </div>
    );
  }

  // Si la ronda está cerrada, pausada O FINALIZADA y el usuario NO ha votado, mostrar mensaje
  // EXCEPTO si los resultados están visibles para todos (entonces mostramos resultados)
  if ((activeRound.is_closed || !activeRound.is_active || activeRound.round_finalized) && !hasVoted && !(activeRound.show_results_to_voters && activeRound.round_finalized)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
            <Vote className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {activeRound.is_closed ? 'Votación cerrada' : activeRound.round_finalized ? 'Ronda finalizada' : 'Votación pausada'}
          </h1>
          <p className="text-muted-foreground mb-4">
            {activeRound.is_closed 
              ? `La votación "${activeRound.title}" ha finalizado y ya no se aceptan más votos.`
              : activeRound.round_finalized
              ? `La ronda ${activeRound.current_round_number} de "${activeRound.title}" ha finalizado. Ya no se aceptan más votos para esta ronda.`
              : `La votación "${activeRound.title}" está temporalmente pausada. Por favor, espera a que se reanude.`
            }
          </p>
          {(activeRound.is_closed || activeRound.round_finalized) && (
            <p className="text-sm text-muted-foreground">
              Debes estar más atento la próxima vez. ⏰
            </p>
          )}
        </Card>
      </div>
    );
  }

  // Mostrar resultados a todos si admin los habilitó y la ronda está finalizada
  if (activeRound?.show_results_to_voters && activeRound?.round_finalized) {
      return (
        <div className="min-h-screen bg-background p-4">
          <div className="max-w-4xl mx-auto">
            <Card className="mb-6 p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <Vote className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">¡Gracias por votar!</h1>
              <p className="text-muted-foreground mb-4">
                Tu voto ha sido registrado para la votación "{activeRound.title}".
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>🏆 {activeRound.team}</span>
                <span>🔄 Ronda {activeRound.current_round_number}</span>
              </div>
            </Card>

            {/* Candidatos Seleccionados (con mayoría absoluta) */}
            {candidates.some(c => c.is_selected) && (
              <Card className="mb-6 p-6 border-2 border-green-500 bg-green-50 dark:bg-green-950">
                <h2 className="text-2xl font-bold mb-4 text-green-700 dark:text-green-300 flex items-center gap-2">
                  <span className="text-3xl">🏆</span>
                  Candidatos Seleccionados
                </h2>
                <p className="text-sm text-green-600 dark:text-green-400 mb-4">
                  Estos candidatos obtuvieron mayoría absoluta (&gt;50% de los votos)
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {candidates.filter(c => c.is_selected).map((candidate) => (
                    <div key={candidate.id} className="p-4 rounded-lg border-2 border-green-600 bg-white dark:bg-green-900/50 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-2xl">
                        ✓
                      </div>
                      <div>
                        <div className="font-bold text-lg text-green-700 dark:text-green-200">
                          {candidate.name} {candidate.surname}
                        </div>
                        {candidate.location && (
                          <div className="text-sm text-green-600 dark:text-green-400">
                            📍 {candidate.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Resultados Completos de la Ronda */}
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <span className="text-3xl">📊</span>
                Resultados de Ronda {activeRound.current_round_number}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Votación finalizada
              </p>
              
              {loadingResults ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : results.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aún no hay resultados disponibles.
                </p>
              ) : (
                <div className="space-y-3">
                  {results.map((result, index) => {
                    const candidate = candidates.find(c => c.id === result.candidate_id);
                    if (!candidate) return null;

                    const isSelected = candidate.is_selected;
                    const hasMajority = result.percentage > 50;

                    return (
                      <div 
                        key={result.candidate_id} 
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30' 
                            : hasMajority
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30'
                            : 'border-border bg-card'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          isSelected
                            ? 'bg-green-600 text-white'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {isSelected ? '✓' : index + 1}
                        </div>
                        <div className="flex-grow">
                          <div className="font-bold text-lg flex items-center gap-2">
                            {candidate.name} {candidate.surname}
                            {isSelected && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-600 text-white font-normal">
                                SELECCIONADO
                              </span>
                            )}
                            {hasMajority && !isSelected && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-600 text-white font-normal">
                                +50%
                              </span>
                            )}
                          </div>
                          {(candidate.location || candidate.group_name) && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {candidate.location && `📍 ${candidate.location}`}
                              {candidate.location && candidate.group_name && ' • '}
                              {candidate.group_name && `👥 ${candidate.group_name}`}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-grow bg-secondary rounded-full h-3 overflow-hidden">
                              <div 
                                className={`h-3 rounded-full transition-all duration-1000 ${
                                  isSelected
                                    ? 'bg-green-600'
                                    : hasMajority
                                    ? 'bg-yellow-500'
                                    : 'bg-primary'
                                }`}
                                style={{ width: `${result.percentage}%` }}
                              />
                            </div>
                            <span className="text-base font-semibold min-w-[4.5rem] text-right">
                              {result.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-2xl font-bold">{result.vote_count}</div>
                          <div className="text-xs text-muted-foreground uppercase">votos</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      );
    }

    // Si el usuario ha votado pero no están visibles para todos, mostrar gracias
    if (hasVoted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <Vote className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">¡Gracias por votar!</h1>
          <p className="text-muted-foreground">
            Tu voto ha sido registrado para la votación "{activeRound?.title}".
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{activeRound.title}</h1>
          {activeRound.description && (
            <p className="text-muted-foreground text-lg mb-4">{activeRound.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>🏆 {activeRound.team}</span>
            <span>🔄 Ronda {activeRound.current_round_number}</span>
            <span>📊 Máximo {(() => {
              const maxVotesThisRound = computeMaxVotesThisRound();
              return `${maxVotesThisRound} voto${maxVotesThisRound > 1 ? 's' : ''}`;
            })()}</span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {candidates.filter(c => !c.is_eliminated && !c.is_selected).map((candidate) => (
            <Card 
              key={candidate.id}
              className={`cursor-pointer transition-all hover:border-primary/50 ${
                selectedCandidates.includes(candidate.id)
                  ? 'border-primary ring-2 ring-primary/20' 
                  : ''
              }`}
              onClick={() => toggleCandidateSelection(candidate.id)}
            >
              <CardHeader className="pb-3">
                {candidate.image_url && (
                  <div className="aspect-square overflow-hidden rounded-lg mb-3">
                    <img 
                      src={candidate.image_url} 
                      alt={`${candidate.name} ${candidate.surname}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardTitle className="text-lg">{candidate.name} {candidate.surname}</CardTitle>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {candidate.age && <div>🎂 {candidate.age} años</div>}
                  {candidate.location && <div>📍 {candidate.location}</div>}
                  {candidate.group_name && <div>👥 {candidate.group_name}</div>}
                </div>
              </CardHeader>
              {candidate.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {candidate.description}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <div className="text-center">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              {(() => {
                const maxVotesThisRound = computeMaxVotesThisRound();
                
                return selectedCandidates.length > 0 
                  ? `Has seleccionado ${selectedCandidates.length} de ${maxVotesThisRound} candidato${maxVotesThisRound > 1 ? 's' : ''}`
                  : `Selecciona hasta ${maxVotesThisRound} candidato${maxVotesThisRound > 1 ? 's' : ''}`;
              })()}
            </p>
          </div>
          <Button 
            size="lg"
            onClick={submitVote}
            disabled={selectedCandidates.length === 0 || voting}
            className="min-w-32"
          >
            {voting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Votando...
              </>
            ) : (
              <>
                <Vote className="w-4 h-4 mr-2" />
                Votar por {selectedCandidates.length} candidato{selectedCandidates.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
          {selectedCandidates.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Has seleccionado: {selectedCandidates.map(id => {
                const candidate = candidates.find(c => c.id === id);
                return `${candidate?.name} ${candidate?.surname}`;
              }).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}