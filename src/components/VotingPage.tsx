import { Vote, Copy, Trash2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { generateDeviceHash, generateBrowserInstanceId, hasVotedLocally, markAsVoted, isVotingAvailable } from '@/lib/device';
import { getMaxVotesAllowed } from '@/lib/votingRules';
import { createVoteReceipt } from '@/lib/voteHash';
import { debugLog } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { GroupedCandidateList } from '@/components/GroupedCandidateList';
import { VotingTutorial } from '@/components/VotingTutorial';
import { VoteSubmitAnimation } from '@/components/VoteSubmitAnimation';
import { AccessCodeInput, isAccessCodeVerified, markAccessCodeVerified } from '@/components/AccessCodeInput';

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
  show_ballot_summary_projection: boolean;
  access_code: string | null;
  is_voting_open: boolean;
  join_locked: boolean;
}

interface JoinSeatResponse {
  success: boolean;
  seat_id?: string;
  message?: string;
  error_code?: string;
}

interface VerifySeatResponse {
  valid: boolean;
  message?: string;
  error_code?: string;
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

interface VoteReceipt {
  roundId: string;
  roundNumber: number;
  voteCode: string;
  votes: string[];
  createdAt: string;
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
  const [showSubmitAnimation, setShowSubmitAnimation] = useState(false);
  const [voteHashCode, setVoteHashCode] = useState<string>('');
  const [accessCodeVerified, setAccessCodeVerified] = useState(false);
  const [accessCodeError, setAccessCodeError] = useState('');
  const [accessCodeLoading, setAccessCodeLoading] = useState(false);
  const [seatId, setSeatId] = useState<string | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [voteReceipt, setVoteReceipt] = useState<VoteReceipt | null>(null);
  const [confirmVoteOpen, setConfirmVoteOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Ref para evitar bucles infinitos en suscripciones
  const activeRoundRef = useRef<Round | null>(null);

  const getSeatStorageKey = (roundId: string) => `mcm_seat_id_${roundId}`;
  const getReceiptStorageKey = (roundId: string, roundNumber: number) =>
    `mcm_vote_receipt_${roundId}_round_${roundNumber}`;

  const loadStoredReceipt = useCallback((roundId: string, roundNumber: number): VoteReceipt | null => {
    try {
      const raw = localStorage.getItem(getReceiptStorageKey(roundId, roundNumber));
      if (!raw) return null;

      const parsed = JSON.parse(raw) as Partial<VoteReceipt>;
      if (
        parsed.roundId !== roundId ||
        parsed.roundNumber !== roundNumber ||
        typeof parsed.voteCode !== 'string' ||
        !Array.isArray(parsed.votes)
      ) {
        return null;
      }

      const normalizedVotes = parsed.votes
        .map((vote) => (typeof vote === 'string' ? vote : '-'))
        .slice(0, 3);

      while (normalizedVotes.length < 3) {
        normalizedVotes.push('-');
      }

      return {
        roundId,
        roundNumber,
        voteCode: parsed.voteCode,
        votes: normalizedVotes,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }, []);

  const buildReceiptVotes = useCallback((candidateIds: string[]) => {
    const selectedNames = candidateIds
      .map((candidateId) => {
        const candidate = candidates.find((item) => item.id === candidateId);
        return candidate ? `${candidate.name} ${candidate.surname}`.trim() : '-';
      })
      .slice(0, 3);

    while (selectedNames.length < 3) {
      selectedNames.push('-');
    }

    return selectedNames;
  }, [candidates]);

  const persistVoteReceipt = useCallback((receipt: VoteReceipt) => {
    try {
      localStorage.setItem(
        getReceiptStorageKey(receipt.roundId, receipt.roundNumber),
        JSON.stringify(receipt)
      );
    } catch {
      // Ignore localStorage failures and keep in-memory state.
    }
    setVoteReceipt(receipt);
    setVoteHashCode(receipt.voteCode);
  }, []);

  const ensureSeat = useCallback(async (round: Round) => {
    if (round.is_closed) {
      setSeatId(null);
      setSeatError('');
      return;
    }

    setSeatLoading(true);
    try {
      const fingerprintHash = generateDeviceHash(round.id);
      const browserInstanceId = generateBrowserInstanceId();
      const storageKey = getSeatStorageKey(round.id);
      const storedSeatId = localStorage.getItem(storageKey);

      if (storedSeatId) {
        const { data: verifyData, error: verifyError } = await supabase.rpc('verify_seat', {
          p_seat_id: storedSeatId,
          p_fingerprint_hash: fingerprintHash,
          p_browser_instance_id: browserInstanceId,
        });

        if (!verifyError) {
          const verified = verifyData as VerifySeatResponse;
          if (verified?.valid) {
            setSeatId(storedSeatId);
            setSeatError('');
            return;
          }
        }

        localStorage.removeItem(storageKey);
      }

      const { data: joinData, error: joinError } = await supabase.rpc('join_round_seat', {
        p_round_id: round.id,
        p_fingerprint_hash: fingerprintHash,
        p_browser_instance_id: browserInstanceId,
        p_user_agent: navigator.userAgent,
        p_ip_address: 'browser-client',
      });

      if (joinError) {
        throw joinError;
      }

      const joined = joinData as JoinSeatResponse;
      if (joined?.success && joined.seat_id) {
        localStorage.setItem(storageKey, joined.seat_id);
        setSeatId(joined.seat_id);
        setSeatError('');
        return;
      }

      const message = joined?.message || 'No se pudo asignar un asiento para esta ronda.';
      setSeatId(null);
      setSeatError(message);
    } catch (error) {
      setSeatId(null);
      setSeatError('No se pudo validar tu asiento para esta votacion.');
    } finally {
      setSeatLoading(false);
    }
  }, []);

  // Calcula el máximo de votos por persona en esta ronda según los candidatos pendientes
  const computeMaxVotesThisRound = useCallback(() => {
    if (!activeRound) return 0;
    const currentlySelected = candidates.filter(c => c.is_selected).length;
    return getMaxVotesAllowed(activeRound.max_selected_candidates, currentlySelected);
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
      setSeatId(null);
      setSeatError('');
      setAccessCodeVerified(false);
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

      const hasVerifiedCode = !round.access_code || isAccessCodeVerified(round.id);
      setAccessCodeVerified(hasVerifiedCode);

      const storedReceipt = loadStoredReceipt(round.id, round.current_round_number);
      if (storedReceipt) {
        setVoteReceipt(storedReceipt);
        setVoteHashCode(storedReceipt.voteCode);
      } else if (!sameRoundSameNumber) {
        setVoteReceipt(null);
        setVoteHashCode('');
      }

  if (!sameRoundSameNumber) {
    setSelectedCandidates([]);
    setResults([]);
    setHasVoted(false);
  }

      if (hasVerifiedCode) {
        await ensureSeat(round as Round);
      } else {
        setSeatId(null);
        setSeatError('');
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
  }, [toast, loadResults, ensureSeat, loadStoredReceipt]);

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
          debugLog('🆕 New active round created:', payload);
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
          debugLog('🔄 Round updated:', payload);
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
              updated.is_voting_open !== undefined && updated.is_voting_open !== current.is_voting_open
            ) || (
              updated.join_locked !== undefined && updated.join_locked !== current.join_locked
            ) || (
              updated.round_finalized !== undefined && updated.round_finalized !== current.round_finalized
            ) || (
              updated.show_results_to_voters !== undefined && updated.show_results_to_voters !== current.show_results_to_voters
            ) || (
              updated.show_ballot_summary_projection !== undefined &&
              updated.show_ballot_summary_projection !== current.show_ballot_summary_projection
            ) || (
              updated.current_round_number !== undefined && updated.current_round_number !== current.current_round_number
            );
            if (affectsVoter) {
              debugLog('🔄 Current round updated with voter impact, reloading...');
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
            debugLog('🔄 Different round became active, reloading...', {
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
        debugLog('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          debugLog('✅ Successfully subscribed to rounds updates (INSERT + UPDATE)');
        }
      });

    // Cleanup subscriptions on unmount
    return () => {
      debugLog('🔌 Unsubscribing from rounds updates');
      supabase.removeChannel(roundsChannel);
    };
  }, [navigate, loadActiveRound, searchParams, toast]);

  const submitVote = async () => {
    if (selectedCandidates.length === 0 || !activeRound) return;

    if (!activeRound.is_voting_open) {
      toast({
        title: 'Ronda no iniciada',
        description: 'La sala esta abierta, pero la ronda de voto aun no ha comenzado.',
        variant: 'destructive',
      });
      return;
    }

    if (!seatId) {
      toast({
        title: 'Asiento no valido',
        description: seatError || 'No se pudo validar tu asiento para votar.',
        variant: 'destructive',
      });
      return;
    }

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
      setShowSubmitAnimation(true);
      
      const deviceHash = generateDeviceHash(activeRound.id);
      const browserInstanceId = generateBrowserInstanceId();
      const userAgent = navigator.userAgent;

      const { data: verifySeatData, error: verifySeatError } = await supabase.rpc('verify_seat', {
        p_seat_id: seatId,
        p_fingerprint_hash: deviceHash,
        p_browser_instance_id: browserInstanceId,
      });

      if (verifySeatError) {
        setShowSubmitAnimation(false);
        toast({
          title: 'Error de asiento',
          description: 'No se pudo verificar tu asiento antes de votar.',
          variant: 'destructive',
        });
        return;
      }

      const verifyResponse = verifySeatData as VerifySeatResponse;
      if (!verifyResponse?.valid) {
        setShowSubmitAnimation(false);
        setSeatError(verifyResponse?.message || 'Tu asiento ya no es valido para esta ronda.');
        toast({
          title: 'Asiento expirado',
          description: verifyResponse?.message || 'Debes reingresar con un asiento valido.',
          variant: 'destructive',
        });
        return;
      }
      
      // Check if this device has already voted in this round
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('id')
        .eq('round_id', activeRound.id)
        .eq('device_hash', deviceHash)
        .eq('round_number', activeRound.current_round_number);

      if (checkError) {
        console.error('Error checking existing vote:', checkError);
        setShowSubmitAnimation(false);
        toast({
          title: 'Error',
          description: 'Error al verificar el voto',
          variant: 'destructive',
        });
        return;
      }

      if (existingVote && existingVote.length > 0) {
        setShowSubmitAnimation(false);
        const storedReceipt = loadStoredReceipt(activeRound.id, activeRound.current_round_number);
        if (storedReceipt) {
          setVoteReceipt(storedReceipt);
          setVoteHashCode(storedReceipt.voteCode);
        }
        toast({
          title: 'Ya has votado',
          description: 'Este dispositivo ya ha emitido un voto en esta ronda',
          variant: 'destructive',
        });
        setHasVoted(true);
        markAsVoted(activeRound.id, activeRound.current_round_number);
        return;
      }

      // Generate vote hash for verification
      const receipt = await createVoteReceipt(
        activeRound.id,
        selectedCandidates,
        deviceHash,
        activeRound.current_round_number
      );
      const persistedReceipt: VoteReceipt = {
        roundId: activeRound.id,
        roundNumber: activeRound.current_round_number,
        voteCode: receipt.voteCode,
        votes: buildReceiptVotes(selectedCandidates),
        createdAt: new Date().toISOString(),
      };
      persistVoteReceipt(persistedReceipt);

      // Submit votes for each selected candidate
      const votes = selectedCandidates.map(candidateId => ({
        round_id: activeRound.id,
        candidate_id: candidateId,
        seat_id: seatId,
        device_hash: deviceHash,
        user_agent: userAgent,
        round_number: activeRound.current_round_number,
        ip_address: 'browser-client',
        vote_hash: receipt.fullHash,
      }));

      const { error: voteError } = await supabase
        .from('votes')
        .insert(votes);

      if (voteError) {
        console.error('Error submitting vote:', voteError);
        setShowSubmitAnimation(false);
        toast({
          title: 'Error',
          description: 'No se pudo registrar el voto',
          variant: 'destructive',
        });
        return;
      }

      // Mark as voted locally
      markAsVoted(activeRound.id, activeRound.current_round_number);
      // Don't set hasVoted yet - the animation onComplete will handle it

      // Load results if round is finalized and results should be visible
      if (activeRound.round_finalized && activeRound.show_results_to_voters) {
        await loadResults(activeRound.id, activeRound.current_round_number);
      }

    } catch (error) {
      console.error('Error in submitVote:', error);
      setShowSubmitAnimation(false);
      toast({
        title: 'Error',
        description: 'Error inesperado al votar',
        variant: 'destructive',
      });
    } finally {
      setVoting(false);
    }
  };

  const handleSubmitAnimationComplete = useCallback(() => {
    setShowSubmitAnimation(false);
    setHasVoted(true);
    toast({
      title: '¡Voto registrado!',
      description: `Has votado por ${selectedCandidates.length} candidato${selectedCandidates.length > 1 ? 's' : ''}`,
    });
  }, [selectedCandidates.length, toast]);

  // Handle access code submission
  const handleAccessCode = useCallback(async (code: string) => {
    if (!activeRound) return;
    setAccessCodeLoading(true);
    setAccessCodeError('');

    // Compare with the round's access code (case-insensitive)
    if (activeRound.access_code && code.toUpperCase() === activeRound.access_code.toUpperCase()) {
      markAccessCodeVerified(activeRound.id);
      setAccessCodeVerified(true);
      await ensureSeat(activeRound);
    } else {
      setAccessCodeError('Código incorrecto. Inténtalo de nuevo.');
    }
    setAccessCodeLoading(false);
  }, [activeRound, ensureSeat]);

  const toggleCandidateSelection = (candidateId: string) => {
    if (!activeRound) return;
    // Límite dinámico corregido (máximo 3; baja a 2 con 4 restantes; baja a 1 con 1 restante)
    const maxVotesThisRound = computeMaxVotesThisRound();

    if (maxVotesThisRound === 0) {
      toast({
        title: 'Votación completada',
        description: 'Ya se alcanzó el máximo de candidatos seleccionados. No se admiten más votos.',
      });
      return;
    }

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

  const selectedCandidateNames = selectedCandidates.map((id) => {
    const candidate = candidates.find((c) => c.id === id);
    return candidate ? `${candidate.name} ${candidate.surname}` : id;
  });

  const clearSelection = () => {
    setSelectedCandidates([]);
  };

  const openVoteConfirmation = () => {
    if (maxVotesThisRound === 0 || selectedCandidates.length === 0 || voting) return;
    setConfirmVoteOpen(true);
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

  // Check if access code is required and not yet verified
  if (activeRound.access_code && !accessCodeVerified && !isAccessCodeVerified(activeRound.id)) {
    return (
      <AccessCodeInput
        onSubmit={handleAccessCode}
        loading={accessCodeLoading}
        error={accessCodeError}
        roundTitle={activeRound.title}
      />
    );
  }

  if (seatLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Validando tu asiento...</p>
        </Card>
      </div>
    );
  }

  if (seatError && !hasVoted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold mb-2">No se pudo acceder a la sala</h1>
          <p className="text-muted-foreground mb-4">{seatError}</p>
          <Button onClick={loadActiveRound}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  const maxVotesThisRound = computeMaxVotesThisRound();

  if (maxVotesThisRound === 0 && !hasVoted && !activeRound.round_finalized && !activeRound.is_closed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <Vote className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">Votación completada</h1>
          <p className="text-muted-foreground mb-3">
            Ya se han seleccionado los {activeRound.max_selected_candidates} candidatos requeridos.
          </p>
          <p className="text-sm text-muted-foreground">No se admitirán más votos en esta votación.</p>
        </Card>
      </div>
    );
  }

  if (activeRound.is_active && !activeRound.is_voting_open && !activeRound.round_finalized && !activeRound.is_closed && !hasVoted) {
    const isPaused = activeRound.join_locked;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Vote className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-bold mb-2">{isPaused ? "Votacion en pausa" : "Sala abierta"}</h1>
          <p className="text-muted-foreground mb-2">
            {isPaused
              ? `Sigues conectado a la sala "${activeRound.title}". Espera a que el admin reanude la ronda.`
              : `Conectado a la sala "${activeRound.title}". Espera a que el admin inicie la ronda para votar.`}
          </p>
          <p className="text-sm text-muted-foreground">Asiento validado correctamente.</p>
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
  if (activeRound?.show_results_to_voters && activeRound?.round_finalized && !hasVoted) {
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
          {voteHashCode && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Tu código de verificación:</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg font-mono font-bold text-green-700 dark:text-green-300">{voteHashCode}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(voteHashCode);
                    toast({ title: 'Copiado', description: 'Código copiado al portapapeles' });
                  }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Guarda este código para verificar tu voto</p>
            </div>
          )}
          {voteReceipt && (
            <div className="mt-4 p-3 bg-muted/40 border rounded-lg text-left">
              <p className="text-xs text-muted-foreground mb-2">Tus 3 votos emitidos (papeleta):</p>
              <div className="space-y-1 text-sm">
                <p>1. {voteReceipt.votes[0] || '-'}</p>
                <p>2. {voteReceipt.votes[1] || '-'}</p>
                <p>3. {voteReceipt.votes[2] || '-'}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-36">
      {/* Submit Animation Overlay */}
      <VoteSubmitAnimation
        isVisible={showSubmitAnimation}
        onComplete={handleSubmitAnimationComplete}
        voteHash={voteHashCode}
      />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{activeRound.title}</h1>
          {activeRound.description && (
            <p className="text-muted-foreground text-lg mb-4">{activeRound.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>🏆 {activeRound.team}</span>
            <span>🔄 Ronda {activeRound.current_round_number}</span>
            <span>📊 Máximo {`${maxVotesThisRound} voto${maxVotesThisRound > 1 ? 's' : ''}`}</span>
          </div>
          {/* Tutorial button */}
          <div className="mt-3">
            <VotingTutorial />
          </div>
        </div>

        <div className="mb-8">
          <GroupedCandidateList
            candidates={candidates}
            selectedCandidates={selectedCandidates}
            onToggleCandidate={toggleCandidateSelection}
          />
        </div>

      </div>

      {/* Floating action bar: vote/clear without scrolling to the page bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {selectedCandidates.length > 0
                ? `${selectedCandidates.length} de ${maxVotesThisRound} seleccionados`
                : `Selecciona hasta ${maxVotesThisRound} candidato${maxVotesThisRound > 1 ? 's' : ''}`}
            </p>
            {selectedCandidates.length > 0 && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {selectedCandidateNames.join(', ')}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearSelection}
              disabled={selectedCandidates.length === 0 || voting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Borrar seleccion
            </Button>
            <Button
              type="button"
              onClick={openVoteConfirmation}
              disabled={maxVotesThisRound === 0 || selectedCandidates.length === 0 || voting}
            >
              {voting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Votando...
                </>
              ) : (
                <>
                  <Vote className="mr-2 h-4 w-4" />
                  Votar ({selectedCandidates.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmVoteOpen} onOpenChange={setConfirmVoteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar voto</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de votar por estos candidatos. Revisa la selección antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border bg-muted/40 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Seleccion actual</p>
            <div className="space-y-1 text-sm">
              {selectedCandidateNames.map((name, index) => (
                <p key={`${name}-${index}`}>{index + 1}. {name}</p>
              ))}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                setConfirmVoteOpen(false);
                submitVote();
              }}
              disabled={voting}
            >
              Confirmar voto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}