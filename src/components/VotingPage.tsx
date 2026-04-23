import { Vote, Copy, Trash2, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { formatSurname } from '@/lib/candidateFormat';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { VoteSubmitAnimation } from '@/components/VoteSubmitAnimation';
import { AccessCodeInput, isAccessCodeVerified, markAccessCodeVerified } from '@/components/AccessCodeInput';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  votes_current_round: number;
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

function VoteReceiptReveal({
  voteHashCode,
  voteReceipt,
  onCopy,
}: {
  voteHashCode: string;
  voteReceipt: VoteReceipt | null;
  onCopy: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div>
      <button
        onClick={() => setRevealed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-emerald-200/80 hover:text-emerald-100 hover:bg-emerald-800/30 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {revealed ? "Ocultar mi papeleta" : "Ver código y papeleta"}
        </span>
        <span className="text-emerald-400/60 text-xs">{revealed ? "▲" : "▼"}</span>
      </button>

      {revealed && (
        <div className="px-4 pb-4 space-y-3">
          {voteHashCode && (
            <div className="overflow-hidden rounded-2xl border border-emerald-400/30 bg-emerald-900/80">
              <div className="px-5 pt-4 pb-2 text-center">
                <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-400/70 mb-3">
                  Código de verificación
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black tracking-[0.15em] text-emerald-300">
                    {voteHashCode}
                  </span>
                  <button
                    onClick={onCopy}
                    aria-label="Copiar código"
                    className="h-8 w-8 flex items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-800 text-emerald-300 hover:bg-emerald-700 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="px-5 pb-4 text-center">
                <p className="text-[10px] text-emerald-400/60 font-medium">
                  Conserva este código para auditar tu voto
                </p>
              </div>
            </div>
          )}

          {voteReceipt && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-900/70 overflow-hidden">
              <div className="px-4 py-3 border-b border-emerald-400/15 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400/70">
                  Tu papeleta emitida
                </p>
              </div>
              <div className="px-4 py-3 space-y-2">
                {voteReceipt.votes.map((vote, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-emerald-100">{vote || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
  
  // Ref para evitar bucles infinitos en suscripciones
  const activeRoundRef = useRef<Round | null>(null);
  const submitAnimationRoundRef = useRef<{ roundId: string; roundNumber: number } | null>(null);
  const submitTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        return candidate ? `${candidate.name} ${formatSurname(candidate.surname)}`.trim() : '-';
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

  const finalizeVoteTransition = useCallback((withToast: boolean) => {
    if (submitTransitionTimeoutRef.current) {
      clearTimeout(submitTransitionTimeoutRef.current);
      submitTransitionTimeoutRef.current = null;
    }

    setShowSubmitAnimation(false);

    if (!submitAnimationRoundRef.current) {
      return;
    }

    submitAnimationRoundRef.current = null;
    setHasVoted(true);

    if (withToast) {
      toast({
        title: '¡Voto registrado!',
        description: `Has votado por ${selectedCandidates.length} candidato${selectedCandidates.length > 1 ? 's' : ''}`,
      });
    }
  }, [selectedCandidates.length, toast]);

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

  const loadActiveRound = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    try {
      if (!silent) {
        setLoading(true);
      }
      
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
    if (submitTransitionTimeoutRef.current) {
      clearTimeout(submitTransitionTimeoutRef.current);
      submitTransitionTimeoutRef.current = null;
    }
    setSelectedCandidates([]);
    setResults([]);
    setHasVoted(false);
    setShowSubmitAnimation(false);
    submitAnimationRoundRef.current = null;
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
      if (!silent) {
        setLoading(false);
      }
    }
  }, [toast, loadResults, ensureSeat, loadStoredReceipt]);

  useEffect(() => {
    // Handle backward compatibility for ?admin=true parameter
    const adminParam = new URLSearchParams(window.location.search).get('admin');
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
          loadActiveRound({ silent: true });
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
              loadActiveRound({ silent: true });
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
            loadActiveRound({ silent: true });
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

      if (submitTransitionTimeoutRef.current) {
        clearTimeout(submitTransitionTimeoutRef.current);
        submitTransitionTimeoutRef.current = null;
      }
    };
  }, [navigate, loadActiveRound, toast]);

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
      if (submitTransitionTimeoutRef.current) {
        clearTimeout(submitTransitionTimeoutRef.current);
        submitTransitionTimeoutRef.current = null;
      }

      setVoting(true);
      submitAnimationRoundRef.current = {
        roundId: activeRound.id,
        roundNumber: activeRound.current_round_number,
      };
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

      // Fallback for mobile devices where animation completion callback may not fire reliably.
      submitTransitionTimeoutRef.current = window.setTimeout(() => {
        finalizeVoteTransition(false);
      }, 9000);

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
    finalizeVoteTransition(true);
  }, [finalizeVoteTransition]);

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
    return candidate ? `${candidate.name} ${formatSurname(candidate.surname)}` : id;
  });

  const clearSelection = () => {
    setSelectedCandidates([]);
  };

  const copyVerificationCode = useCallback(async () => {
    if (!voteHashCode) {
      toast({
        title: 'Sin código',
        description: 'No hay un código de verificación para copiar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(voteHashCode);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = voteHashCode;
        // Evitar el zoom en iOS y hacer que el elemento no afecte el layout
        textArea.style.fontSize = '16px'; 
        textArea.style.position = 'fixed';
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', 'true');
        textArea.setAttribute('contenteditable', 'true'); // Forzar selección en algunos iOS
        
        document.body.appendChild(textArea);
        
        // Selección compatible con iOS
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, 999999);
        
        const copied = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (!copied) {
          throw new Error('copy-failed');
        }
      }

      toast({ title: 'Copiado', description: 'Código de verificación copiado.' });
    } catch {
      toast({
        title: 'No se pudo copiar',
        description: 'Copia manualmente el código de verificación.',
        variant: 'destructive',
      });
    }
  }, [toast, voteHashCode]);

  const openVoteConfirmation = () => {
    if (maxVotesThisRound === 0 || selectedCandidates.length === 0 || voting) return;
    setConfirmVoteOpen(true);
  };

  if (loading) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando votación...</p>
        </Card>
      </div>
    );
  }

  if (!isVotingAvailable()) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
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
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
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
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Validando tu asiento...</p>
        </Card>
      </div>
    );
  }

  if (seatError && !hasVoted) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold mb-2">No se pudo acceder a la sala</h1>
          <p className="text-muted-foreground mb-4">{seatError}</p>
          <Button onClick={() => { void loadActiveRound(); }}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  const maxVotesThisRound = computeMaxVotesThisRound();

  if (maxVotesThisRound === 0 && !hasVoted && !activeRound.round_finalized && !activeRound.is_closed) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4">
        <Card className="admin-shell w-full max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <Vote className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
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
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] mix-blend-screen" />
        <div className="pointer-events-none absolute -bottom-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[100px] mix-blend-screen" />
        
        <Card className="relative w-full max-w-md p-10 text-center surface backdrop-blur-xl border-t-primary/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-transparent" />
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_40px_hsl(var(--primary)/0.2)]">
            <Vote className="w-10 h-10 animate-pulse" />
          </div>
          <h1 className="text-3xl font-headline font-bold mb-3 tracking-tight">
            {isPaused ? "Ronda en Pausa" : "Sala Abierta"}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-medium">
            {isPaused
              ? `Sigues conectado con éxito a la sala "${activeRound.title}". Por favor, espera a que la administración reanude la sesión.`
              : `Has accedido a "${activeRound.title}". Todo está listo, solo espera a que el administrador dé luz verde para comenzar.`}
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-default select-none">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
            Asiento validado y seguro
          </div>
        </Card>
      </div>
    );
  }

  // Si la ronda está cerrada, pausada O FINALIZADA y el usuario NO ha votado, mostrar mensaje
  // EXCEPTO si los resultados están visibles para todos (entonces mostramos resultados)
  if ((activeRound.is_closed || !activeRound.is_active || activeRound.round_finalized) && !hasVoted && !(activeRound.show_results_to_voters && activeRound.round_finalized)) {
    return (
      <div className="admin-canvas min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,theme(colors.amber.500/0.05),transparent_50%)]" />
        
        <Card className="relative w-full max-w-md p-10 text-center surface backdrop-blur-xl border-t-amber-500/50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
          
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-amber-500/20 to-amber-500/5 shadow-[0_0_30px_hsl(var(--warning)/0.2)]">
            <Vote className="h-10 w-10 text-amber-500" />
          </div>
          <h1 className="text-3xl font-headline font-bold mb-3 tracking-tight">
            {activeRound.is_closed ? 'Votación Cerrada' : activeRound.round_finalized ? 'Ronda Finalizada' : 'Sesión Pausada'}
          </h1>
          <p className="text-muted-foreground text-sm font-medium mb-6 leading-relaxed">
            {activeRound.is_closed 
              ? `La votación "${activeRound.title}" ha llegado a su fin y las urnas se han cerrado definitivamente.`
              : activeRound.round_finalized
              ? `La ronda ${activeRound.current_round_number} de "${activeRound.title}" terminó. No es posible enviar más papeletas en este momento.`
              : `La votación de "${activeRound.title}" se encuentra en pausa. Mantente a la espera de instrucciones.`
            }
          </p>
          {(activeRound.is_closed || activeRound.round_finalized) && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 text-xs text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-center gap-2">
              <span>⏳</span> Las urnas ya no aceptan respuestas.
            </div>
          )}
        </Card>
      </div>
    );
  }

  // Mostrar resultados a todos si admin los habilitó y la ronda está finalizada
  if (activeRound?.show_results_to_voters && activeRound?.round_finalized && !hasVoted) {
      return (
        <div className="admin-canvas min-h-screen p-4 relative overflow-hidden">
          <div className="pointer-events-none absolute top-[10%] left-[10%] w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] mix-blend-screen" />
          <div className="pointer-events-none absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-secondary/10 blur-[100px] mix-blend-screen" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <Card className="relative mb-8 p-10 text-center surface tech-glow border-t-primary/50 overflow-hidden backdrop-blur-2xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary" />
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-glow relative">
                 <div className="absolute inset-0 rounded-full bg-primary animate-pulse blur-xl opacity-50" />
                 <Vote className="h-10 w-10 text-white relative z-10" />
              </div>
              <h1 className="text-3xl font-headline font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Resumen de Votación
              </h1>
              <p className="text-muted-foreground text-sm font-medium mb-6">
                Mostrando los resultados finales para "{activeRound.title}".
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold">
                <span className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-primary shadow-sm backdrop-blur-md">🏆 Equipo: {activeRound.team}</span>
                <span className="rounded-full border border-secondary/20 bg-secondary/10 px-4 py-1.5 text-secondary shadow-sm backdrop-blur-md">🔄 Ronda {activeRound.current_round_number}</span>
              </div>
            </Card>

            {/* Candidatos Seleccionados (con mayoría absoluta) */}
            {candidates.some(c => c.is_selected) && (
              <Card className="mb-6 rounded-[1.9rem] border-2 border-emerald-500/60 bg-emerald-500/12 p-6 dark:bg-emerald-500/10">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">
                  <span className="text-3xl">🏆</span>
                  Candidatos Seleccionados
                </h2>
                <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-300">
                  Estos candidatos obtuvieron mayoría absoluta (&gt;50% de los votos)
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {candidates.filter(c => c.is_selected).map((candidate) => (
                    <div key={candidate.id} className="flex items-center gap-3 rounded-2xl border border-emerald-500/60 bg-surface-container-lowest/90 p-4 dark:bg-surface-container-low/80">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white">
                        ✓
                      </div>
                      <div>
                        <div className="text-lg font-bold text-emerald-700 dark:text-emerald-200">
                          {candidate.name} {candidate.surname}
                        </div>
                        {candidate.location && (
                          <div className="text-sm text-emerald-700 dark:text-emerald-300">
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
            <Card className="admin-shell p-6">
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

                    const displayPercentage = result.percentage;
                    const isSelected = candidate.is_selected;
                    const hasMajority = displayPercentage > 50;

                    return (
                      <div 
                        key={result.candidate_id} 
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-emerald-500 bg-emerald-500/12' 
                            : hasMajority
                            ? 'border-primary/45 bg-primary-fixed/55'
                            : 'border-outline-variant/45 bg-surface-container-lowest/88 dark:border-outline-variant/60 dark:bg-surface-container-low/75'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-primary/10 text-primary'
                        }`}>
                          {isSelected ? '✓' : index + 1}
                        </div>
                        <div className="flex-grow">
                          <div className="font-bold text-lg flex items-center gap-2">
                            {candidate.name} {candidate.surname}
                            {isSelected && (
                              <span className="text-xs px-2 py-1 rounded-full bg-emerald-600 text-white font-normal">
                                SELECCIONADO
                              </span>
                            )}
                            {hasMajority && !isSelected && (
                              <span className="text-xs px-2 py-1 rounded-full bg-primary text-primary-foreground font-normal">
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
                                    ? 'bg-emerald-600'
                                    : hasMajority
                                    ? 'bg-primary'
                                    : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(Math.max(displayPercentage, 0), 100)}%` }}
                              />
                            </div>
                            <span className="text-base font-semibold min-w-[4.5rem] text-right">
                              {displayPercentage.toFixed(1)}%
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
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-emerald-950 dark:bg-emerald-950">
        <ThemeToggle mode="floating" />

        {/* Background atmosphere */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-[15%] left-[10%] w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-[130px]" />
          <div className="absolute -bottom-[15%] right-[5%] w-[400px] h-[400px] rounded-full bg-emerald-600/15 blur-[100px]" />
          <div className="absolute top-[30%] right-[20%] w-[200px] h-[200px] rounded-full bg-teal-400/10 blur-[80px]" />
        </div>

        <div className="relative w-full max-w-sm space-y-4">
          {/* Main status card */}
          <div className="relative overflow-hidden rounded-3xl border border-emerald-400/25 bg-emerald-900/60 backdrop-blur-xl shadow-[0_32px_64px_-20px_rgba(16,185,129,0.4)]">
            {/* Top accent stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400" />

            <div className="px-8 py-10 text-center">
              {/* Icon */}
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/25 shadow-[0_0_60px_rgba(52,211,153,0.4)] ring-1 ring-emerald-400/30">
                <CheckCircle2 className="w-14 h-14 text-emerald-300" strokeWidth={1.5} />
              </div>

              <h1 className="text-3xl font-headline font-black mb-2 text-white tracking-tight">
                ¡Voto registrado!
              </h1>
              <p className="text-emerald-200/80 text-sm mb-1">
                Tu participación en
              </p>
              <p className="text-emerald-100 font-bold text-base mb-2">
                "{activeRound?.title}"
              </p>
              <p className="text-emerald-300/70 text-xs">
                Se ha procesado con éxito.
              </p>
            </div>
          </div>

          {/* Receipt card (expandable) */}
          {(voteHashCode || voteReceipt) && (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-900/40 backdrop-blur-md overflow-hidden">
              <VoteReceiptReveal
                voteHashCode={voteHashCode}
                voteReceipt={voteReceipt}
                onCopy={copyVerificationCode}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-2 pb-[9.5rem] pt-2 sm:px-4 sm:pt-2 md:pb-28">
      {/* Submit Animation Overlay */}
      <VoteSubmitAnimation
        isVisible={showSubmitAnimation}
        onComplete={handleSubmitAnimationComplete}
        voteHash={voteHashCode}
      />

      <div className="max-w-4xl mx-auto">
        <div className="mb-6 pt-2 text-center sm:mb-8 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold text-slate-600 sm:text-xs dark:text-slate-300">
            <span className="inline-flex items-center rounded-full bg-white/60 px-3 py-1 shadow-sm ring-1 ring-inset ring-slate-200 backdrop-blur-md dark:bg-slate-800/60 dark:ring-slate-700">🏆 {activeRound.team}</span>
            <span className="inline-flex items-center rounded-full bg-white/60 px-3 py-1 shadow-sm ring-1 ring-inset ring-slate-200 backdrop-blur-md dark:bg-slate-800/60 dark:ring-slate-700">🔄 Ronda {activeRound.current_round_number}</span>
            <span className="inline-flex items-center rounded-full bg-white/60 px-3 py-1 shadow-sm ring-1 ring-inset ring-slate-200 backdrop-blur-md dark:bg-slate-800/60 dark:ring-slate-700">📊 Máximo {`${maxVotesThisRound} voto${maxVotesThisRound > 1 ? 's' : ''}`}</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-headline text-3xl font-black tracking-tight text-slate-900 sm:text-5xl dark:text-white pb-1">
              {activeRound.title}
            </h1>
            {activeRound.description && (
              <p className="mx-auto max-w-2xl text-sm text-slate-500 sm:text-lg dark:text-slate-400">
                {activeRound.description}
              </p>
            )}
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <GroupedCandidateList
            candidates={candidates}
            selectedCandidates={selectedCandidates}
            onToggleCandidate={toggleCandidateSelection}
            tutorialRoundId={activeRound.id}
          />
        </div>

      </div>

      {/* Floating action bar: vote/clear without scrolling to the page bottom */}
      <div className="fixed inset-x-0 bottom-0 z-[60] px-2 pb-0 sm:sticky sm:inset-x-auto sm:bottom-0 sm:px-4 sm:pb-3">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-t-[2.6rem] border border-outline-variant/60 bg-surface-container-lowest px-4 pb-[calc(1.2rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-10px_30px_rgba(0,74,198,0.08)] dark:border-outline-variant/70 dark:bg-surface-container-low sm:rounded-[2rem] sm:pb-4 sm:pt-3 sm:shadow-tech sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            {selectedCandidates.length > 0 && (
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {selectedCandidateNames.join(', ')}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              🏆 {activeRound.team} • 🔄 Ronda {activeRound.current_round_number} • 📊 Máximo {maxVotesThisRound} voto{maxVotesThisRound > 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex gap-2 sm:w-auto">
            <Button
              type="button"
              variant="destructive"
              onClick={clearSelection}
              disabled={selectedCandidates.length === 0 || voting}
              aria-label="Borrar seleccion"
              className="h-11 w-11 flex-none px-0 sm:h-10 sm:w-auto sm:px-4"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Borrar seleccion</span>
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={openVoteConfirmation}
              disabled={maxVotesThisRound === 0 || selectedCandidates.length === 0 || voting}
              className="flex-1 sm:flex-none"
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
        <AlertDialogContent className="overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-container-lowest p-0 shadow-tech dark:border-outline-variant/70 dark:bg-surface-container-low">
          <AlertDialogHeader className="bg-gradient-to-r from-primary-fixed/75 via-surface-container-lowest to-primary-fixed/55 px-6 pb-4 pt-6 dark:from-primary-fixed/45 dark:via-surface-container-low dark:to-primary-fixed/35">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">Confirmar voto</AlertDialogTitle>
            <AlertDialogDescription className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              Estás a punto de votar por estos candidatos. Revisa la selección antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2 pt-4">
            <div className="rounded-2xl border border-outline-variant/55 bg-surface-container-low p-4 dark:border-outline-variant/65 dark:bg-surface-container">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Seleccion actual</p>
              <div className="space-y-1 text-sm font-medium text-foreground">
              {selectedCandidateNames.map((name, index) => (
                <p key={`${name}-${index}`}>{index + 1}. {name}</p>
              ))}
              </div>
            </div>
          </div>
          <AlertDialogFooter className="gap-2 px-6 pb-6 pt-2">
            <AlertDialogCancel
              disabled={voting}
              className="mt-0 h-11 rounded-xl border-outline-variant/60 bg-surface-container-lowest/85 px-5 text-foreground hover:bg-surface-container-low dark:border-outline-variant/70 dark:bg-surface-container"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 text-white shadow-[0_18px_34px_-18px_rgba(5,150,105,0.9)] hover:opacity-95"
              onClick={async (event) => {
                event.preventDefault();
                event.stopPropagation();
                // Fix Safari close animation cancellation
                await new Promise(r => setTimeout(r, 50)); 
                setConfirmVoteOpen(false);
                await new Promise(r => setTimeout(r, 10)); 
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