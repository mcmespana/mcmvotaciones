import { Vote, Copy, Trash2, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { formatSurname } from '@/lib/candidateFormat';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { generateDeviceHash, generateBrowserInstanceId, hasVotedLocally, markAsVoted, isVotingAvailable } from '@/lib/device';
import { getMaxVotesAllowed } from '@/lib/votingRules';
import { createVoteReceipt } from '@/lib/voteHash';
import { debugLog } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';
import { GroupedCandidateList } from '@/components/voting/GroupedCandidateList';
import { VoteSubmitAnimation } from '@/components/voting/VoteSubmitAnimation';
import { VotingTutorial } from '@/components/voting/VotingTutorial';
import { AccessCodeInput, isAccessCodeVerified, markAccessCodeVerified } from '@/components/voting/AccessCodeInput';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

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
  selected_in_round: number | null;
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

type PreviewMode = 'tutorial' | 'anim' | 'ticket';

function getPreviewMode(): PreviewMode | null {
  const value = new URLSearchParams(window.location.search).get('preview');
  if (value === 'tutorial' || value === 'anim' || value === 'ticket') return value;
  return null;
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
    if (!revealed) return;

    const t = setTimeout(() => setRevealed(false), 3000);
    return () => clearTimeout(t);
  }, [revealed]);

  return (
    <div>
      <button
        onClick={() => setRevealed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors rounded-t-2xl"
      >
        <span className="flex items-center gap-2 font-semibold">
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {revealed ? "Ocultar mi papeleta" : "Ver código y papeleta"}
        </span>
        <span className="text-muted-foreground/50 text-xs">{revealed ? "▲" : "▼"}</span>
      </button>

      {revealed && (
        <div className="px-4 pb-5 space-y-3">
          {voteHashCode && (
            <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest dark:border-outline-variant/70 dark:bg-surface-container-low">
              <div className="px-5 pt-4 pb-2 text-center">
                <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Código de verificación
                </p>
                <div className="flex items-center justify-center gap-3">
                  <span className="font-mono text-2xl font-black tracking-[0.12em] text-foreground">
                    {voteHashCode}
                  </span>
                  <button
                    onClick={onCopy}
                    aria-label="Copiar código"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-outline-variant/65 bg-surface-container-low text-foreground transition-colors hover:bg-surface-container"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="px-5 pb-4 text-center">
                <p className="text-[10px] font-medium text-muted-foreground">
                  Conserva este código para auditar tu voto
                </p>
              </div>
            </div>
          )}

          {voteReceipt && (
            <div className="overflow-hidden rounded-2xl border-2 border-outline-variant bg-surface-container-lowest dark:border-outline-variant dark:bg-surface-container-low">
              <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Tu papeleta emitida
                </p>
              </div>
              <div className="px-4 py-3 space-y-2">
                {voteReceipt.votes.map((vote, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-[10px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{vote || "—"}</span>
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
  const [tabHidden, setTabHidden] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const previewMode = getPreviewMode();
  const [previewAnimVisible, setPreviewAnimVisible] = useState(previewMode === 'anim');
  
  // Ref para evitar bucles infinitos en suscripciones
  const activeRoundRef = useRef<Round | null>(null);
  const submitAnimationRoundRef = useRef<{ roundId: string; roundNumber: number } | null>(null);
  const submitTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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

  const finalizeVoteTransition = useCallback(() => {
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

  const computeMaxVotesThisRound = useCallback(() => {
    if (!activeRound) return 0;
    const currentlySelected = candidates.filter(c => c.is_selected).length;
    return getMaxVotesAllowed(
      activeRound.max_selected_candidates,
      currentlySelected,
      activeRound.max_votes_per_round,
    );
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

    if (previewMode) {
      if (previewMode === 'ticket') {
        const previewRound: Round = {
          id: 'preview-round',
          title: 'Preview Votacion',
          description: 'Vista local del ticket de voto',
          team: 'ECE',
          current_round_number: 2,
          max_votes_per_round: 3,
          max_selected_candidates: 6,
          selected_candidates_count: 3,
          is_active: true,
          is_closed: false,
          round_finalized: false,
          show_results_to_voters: false,
          show_ballot_summary_projection: false,
          access_code: null,
          is_voting_open: true,
          join_locked: false,
          votes_current_round: 0,
        };
        setActiveRound(previewRound);
        setHasVoted(true);
        setVoteHashCode('VT-DEMO-2026');
        setVoteReceipt({
          roundId: 'preview-round',
          roundNumber: 2,
          voteCode: 'VT-DEMO-2026',
          votes: ['Ana G.', 'Maria R.', 'Lucia P.'],
          createdAt: new Date().toISOString(),
        });
      }
      setLoading(false);
      return;
    }
    
    loadActiveRound();

    // Subscribe to real-time updates for rounds (recarga selectiva)
    const roundsChannel = supabase
      .channel(`voter-rounds-updates-${crypto.randomUUID()}`)
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
              loadActiveRound({ silent: true });
            }
          }
          // Si se activó una ronda diferente o cuando no había ninguna activa
          else if (updated.is_active === true) {
            debugLog('🔄 Different round became active, reloading...', {
              updatedId: updated.id,
              currentId: current?.id || 'none'
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
  }, [navigate, loadActiveRound, toast, previewMode]);

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

      // INSERT confirmed — persist receipt and mark locally
      persistVoteReceipt(persistedReceipt);
      markAsVoted(activeRound.id, activeRound.current_round_number);
      // Don't set hasVoted yet - the animation onComplete will handle it

      // Fallback for mobile devices where animation completion callback may not fire reliably.
      submitTransitionTimeoutRef.current = window.setTimeout(() => {
        finalizeVoteTransition();
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
    finalizeVoteTransition();
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

  const selectedCandidateShortNames = selectedCandidates.map((id) => {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) return id;
    const firstSurnameChar = candidate.surname.trim().charAt(0).toUpperCase();
    return firstSurnameChar ? `${candidate.name} ${firstSurnameChar}.` : candidate.name;
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

  if (previewMode) {
    const previewLinks = (
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a className="avd-btn avd-btn-sm" href="/?preview=tutorial">tutorial</a>
        <a className="avd-btn avd-btn-sm" href="/?preview=anim">anim</a>
        <a className="avd-btn avd-btn-sm" href="/?preview=ticket">ticket</a>
        <a className="avd-btn avd-btn-sm" href="/">normal</a>
      </div>
    );

    if (previewMode === 'tutorial') {
      return (
        <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 560, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--avd-fg)' }}>Preview local: VotingTutorial</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--avd-fg-muted)' }}>
                Usa <code>?preview=tutorial</code>, <code>?preview=anim</code> o <code>?preview=ticket</code>.
              </p>
            </div>
            {previewLinks}
          </div>
          <VotingTutorial forceOpen roundId="preview-round" />
        </div>
      );
    }

    if (previewMode === 'anim') {
      return (
        <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 560, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--avd-fg)' }}>Preview local: VoteSubmitAnimation</h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--avd-fg-muted)' }}>
                Animacion independiente del flujo real de voto.
              </p>
            </div>
            {previewLinks}
          </div>
          <button
            className="avd-btn avd-btn-primary"
            onClick={() => {
              setPreviewAnimVisible(false);
              window.setTimeout(() => setPreviewAnimVisible(true), 30);
            }}
          >
            Repetir animacion
          </button>
          <VoteSubmitAnimation
            isVisible={previewAnimVisible}
            onComplete={() => setPreviewAnimVisible(false)}
            voteHash="VT-DEMO-2026"
          />
        </div>
      );
    }

  }

  if (loading) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14 }}>Cargando votación...</p>
        </div>
      </div>
    );
  }

  if (!isVotingAvailable()) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--avd-fg)' }}>Navegador no compatible</h1>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14 }}>
            Tu navegador no soporta las funciones necesarias para votar.
            Por favor, usa un navegador más reciente.
          </p>
        </div>
      </div>
    );
  }

  if (!activeRound) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: '100vh' }}>
        <ThemeToggle />
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: '40px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #ef4444, #22c55e, #eab308, #3b82f6)', backgroundSize: '200% auto', animation: 'shimmer-bar 3s linear infinite' }} />
          <div style={{ position: 'relative', margin: '0 auto 24px', width: 80, height: 80 }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--avd-brand-bg)', border: '2px solid var(--avd-brand-border)', animation: 'pulse-ring 2s ease-in-out infinite' }} />
            <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', background: 'var(--avd-brand-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--avd-brand)' }}>
              <Vote style={{ width: 36, height: 36 }} />
            </div>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: 'var(--avd-fg)', letterSpacing: '-0.01em' }}>Esperando siguiente votación…</h1>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>No hay votaciones disponibles en este momento. La página se actualizará automáticamente.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--avd-brand)', opacity: 0.7, animation: `dot-pulse 1.4s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
        </div>
        <style>{`
          @keyframes shimmer-bar { to { background-position: 200% center; } }
          @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.5} }
          @keyframes dot-pulse { 0%,80%,100%{transform:scale(1);opacity:0.7} 40%{transform:scale(1.4);opacity:1} }
        `}</style>
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
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2.5px solid var(--avd-border)', borderTopColor: 'var(--avd-brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14 }}>Validando tu asiento...</p>
        </div>
      </div>
    );
  }

  if (seatError && !hasVoted) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--avd-fg)' }}>No se pudo acceder a la sala</h1>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 14, marginBottom: 24 }}>{seatError}</p>
          <button className="avd-btn avd-btn-primary" onClick={() => { void loadActiveRound(); }} style={{ margin: '0 auto' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const maxVotesThisRound = computeMaxVotesThisRound();

  if (maxVotesThisRound === 0 && !hasVoted && !activeRound.round_finalized && !activeRound.is_closed) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, padding: 40, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 20px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-ok-bg)', border: '1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)', color: 'var(--avd-ok)' }}>
            <Vote style={{ width: 32, height: 32 }} />
          </div>
          <span className="avd-chip avd-chip-ok" style={{ marginBottom: 20, height: 32, fontSize: 13 }}>
            Votación completada
          </span>
          <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, marginBottom: 6 }}>
            Ya se han seleccionado los {activeRound.max_selected_candidates} candidatos requeridos.
          </p>
          <p style={{ fontSize: 13, color: 'var(--avd-fg-faint)' }}>No se admitirán más votos en esta votación.</p>
        </div>
      </div>
    );
  }

  if (activeRound.is_active && !activeRound.is_voting_open && !activeRound.round_finalized && !activeRound.is_closed && !hasVoted) {
    const isPaused = activeRound.join_locked;
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
          <ThemeToggle />
        </div>
        {/* Ambient orbs */}
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: isPaused ? 'color-mix(in oklch, var(--avd-warn) 8%, transparent)' : 'color-mix(in oklch, var(--avd-brand) 8%, transparent)', filter: 'blur(60px)', top: '10%', left: '-10%', animation: 'proj-orb-slow-a 18s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 220, height: 220, borderRadius: '50%', background: isPaused ? 'color-mix(in oklch, var(--avd-warn) 6%, transparent)' : 'color-mix(in oklch, var(--avd-brand) 6%, transparent)', filter: 'blur(50px)', bottom: '5%', right: '-5%', animation: 'proj-orb-slow-b 22s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', width: '100%', maxWidth: 420, overflow: 'hidden', textAlign: 'center', animation: 'card-enter 0.4s cubic-bezier(0.2,0.75,0.2,1) both', position: 'relative', zIndex: 1 }}>
          <div style={{ height: 3, background: isPaused ? 'linear-gradient(90deg, var(--avd-warn), var(--avd-warn-600))' : 'linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))' }} />
          <div style={{ padding: 40 }}>
            <div style={{ margin: '0 auto 20px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: isPaused ? 'var(--avd-warn-bg)' : 'var(--avd-brand-bg)', border: `1px solid ${isPaused ? 'color-mix(in oklch, var(--avd-warn) 30%, transparent)' : 'var(--avd-brand-border)'}`, color: isPaused ? 'var(--avd-warn)' : 'var(--avd-brand)', animation: 'breathe 3.5s ease-in-out infinite' }}>
              <Vote style={{ width: 32, height: 32 }} />
            </div>
            <span className={`avd-chip ${isPaused ? 'avd-chip-warn' : 'avd-chip-brand'}`} style={{ marginBottom: 20, height: 32, fontSize: 13 }}>
              {isPaused ? "Ronda en Pausa" : "Sala Abierta"}
            </span>
            <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 20, fontWeight: 500 }}>
              {isPaused
                ? `Sigues conectado con éxito a la sala "${activeRound.title}". Por favor, espera a que la administración reanude la sesión.`
                : `Has accedido a "${activeRound.title}". Todo está listo, solo espera a que el administrador dé luz verde para comenzar.`}
            </p>
            {/* Waiting dots */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 20 }}>
              {[0, 1, 2].map(i => (
                <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: isPaused ? 'var(--avd-warn)' : 'var(--avd-brand)', display: 'inline-block', animation: `dot-bounce 1.4s ease-in-out ${i * 0.22}s infinite` }} />
              ))}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--avd-ok-bg)', border: '1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)', borderRadius: 9999, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--avd-ok-fg)', cursor: 'default', userSelect: 'none', animation: 'ok-glow 3s ease-in-out infinite' }}>
              <ShieldCheck style={{ width: 13, height: 13, flexShrink: 0 }} />
              Asiento validado y seguro
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si la ronda está cerrada, pausada O FINALIZADA y el usuario NO ha votado, mostrar mensaje
  // EXCEPTO si los resultados están visibles para todos (entonces mostramos resultados)
  if ((activeRound.is_closed || !activeRound.is_active || activeRound.round_finalized) && !hasVoted && !(activeRound.show_results_to_voters && activeRound.round_finalized)) {
    const label = activeRound.is_closed ? 'Votación Cerrada' : activeRound.round_finalized ? 'Ronda Finalizada' : 'Sesión Pausada';
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
          <ThemeToggle />
        </div>
        <div style={{ background: 'var(--avd-surface)', border: '1px solid color-mix(in oklch, var(--avd-warn) 35%, transparent)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-md)', width: '100%', maxWidth: 420, overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ height: 3, background: 'linear-gradient(90deg, var(--avd-warn), var(--avd-warn-600))' }} />
          <div style={{ padding: 40 }}>
            <div style={{ margin: '0 auto 20px', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-warn-bg)', border: '1px solid color-mix(in oklch, var(--avd-warn) 30%, transparent)', color: 'var(--avd-warn)' }}>
              <Vote style={{ width: 32, height: 32 }} />
            </div>
            <span className="avd-chip avd-chip-warn" style={{ marginBottom: 20, height: 32, fontSize: 13 }}>
              {label}
            </span>
            <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, fontWeight: 500, marginBottom: 24, lineHeight: 1.6 }}>
              {activeRound.is_closed
                ? `La votación "${activeRound.title}" ha llegado a su fin y las urnas se han cerrado definitivamente.`
                : activeRound.round_finalized
                ? `La ronda ${activeRound.current_round_number} de "${activeRound.title}" terminó. No es posible enviar más papeletas en este momento.`
                : `La votación de "${activeRound.title}" se encuentra en pausa. Mantente a la espera de instrucciones.`
              }
            </p>
            {(activeRound.is_closed || activeRound.round_finalized) && (
              <div style={{ background: 'var(--avd-warn-bg)', border: '1px solid color-mix(in oklch, var(--avd-warn) 30%, transparent)', borderRadius: 'var(--avd-radius-sm)', padding: '10px 16px', fontSize: 13, color: 'var(--avd-warn-fg)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>⏳</span> Las urnas ya no aceptan respuestas.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mostrar resultados a todos si admin los habilitó y la ronda está finalizada
  if (activeRound?.show_results_to_voters && activeRound?.round_finalized && !hasVoted) {
    return (
      <div className="pub-page" style={{ padding: '16px 16px 64px' }}>
        <div style={{ maxWidth: 768, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header card */}
          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', overflow: 'hidden', textAlign: 'center' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))' }} />
            <div style={{ padding: '32px 32px 24px' }}>
              <div style={{ margin: '0 auto 20px', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-brand-bg)', border: '1px solid var(--avd-brand-border)', color: 'var(--avd-brand)' }}>
                <Vote style={{ width: 28, height: 28 }} />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--avd-fg)', marginBottom: 8 }}>
                Resumen de Votación
              </h1>
              <p style={{ color: 'var(--avd-fg-muted)', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
                Resultados finales — "{activeRound.title}"
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span className="avd-chip avd-chip-warn" style={{ height: 24, fontSize: 11 }}>🏆 {activeRound.team}</span>
                <span className="avd-chip avd-chip-brand" style={{ height: 24, fontSize: 11 }}>Ronda {activeRound.current_round_number}</span>
              </div>
            </div>
          </div>

          {candidates.some(c => c.is_selected) && (
            <div style={{ background: 'var(--avd-surface)', border: '1px solid color-mix(in oklch, var(--avd-ok) 35%, transparent)', borderRadius: 'var(--avd-radius-lg)', padding: 24 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 700, color: 'var(--avd-ok-fg)', marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>🏆</span>
                Candidatos Seleccionados
              </h2>
              <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--avd-fg-muted)' }}>
                Mayoría absoluta (&gt;50% de los votos)
              </p>
              <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                {candidates.filter(c => c.is_selected).map((candidate) => (
                  <div key={candidate.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--avd-ok-bg)', border: '1px solid color-mix(in oklch, var(--avd-ok) 25%, transparent)', borderRadius: 'var(--avd-radius-md)', padding: 14 }}>
                    <div style={{ flexShrink: 0, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-ok)', color: 'white', fontWeight: 700 }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--avd-ok-fg)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {candidate.name} {formatSurname(candidate.surname)}
                        {candidate.selected_in_round != null && (
                          <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>R{candidate.selected_in_round}</span>
                        )}
                      </div>
                      {candidate.location && (
                        <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)', marginTop: 2 }}>
                          {candidate.location}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ background: 'var(--avd-surface)', border: '1px solid var(--avd-border)', borderRadius: 'var(--avd-radius-lg)', boxShadow: 'var(--avd-shadow-lg)', padding: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--avd-fg)' }}>
              <span style={{ fontSize: 22 }}>📊</span>
              Resultados de Ronda {activeRound.current_round_number}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--avd-fg-muted)', marginBottom: 20 }}>
              Votación finalizada
            </p>

            {loadingResults ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0' }}>
                <div style={{ width: 28, height: 28, border: '2.5px solid var(--avd-border)', borderTopColor: 'var(--avd-brand)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : results.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--avd-fg-muted)', padding: '32px 0' }}>
                Aún no hay resultados disponibles.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {results.map((result, index) => {
                  const candidate = candidates.find(c => c.id === result.candidate_id);
                  if (!candidate) return null;

                  const displayPercentage = result.percentage;
                  const isSelected = candidate.is_selected;
                  const hasMajority = displayPercentage > 50;

                  return (
                    <div
                      key={result.candidate_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: 16,
                        borderRadius: 'var(--avd-radius-md)',
                        border: isSelected ? '1px solid color-mix(in oklch, var(--avd-ok) 40%, transparent)' : hasMajority ? '1px solid var(--avd-brand-border)' : '1px solid var(--avd-border)',
                        background: isSelected ? 'var(--avd-ok-bg)' : hasMajority ? 'var(--avd-brand-bg)' : 'var(--avd-bg-sunken)',
                      }}
                    >
                      <div style={{
                        flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 16,
                        background: isSelected ? 'var(--avd-ok)' : 'var(--avd-brand-bg)',
                        color: isSelected ? 'white' : 'var(--avd-brand)',
                      }}>
                        {isSelected ? '✓' : index + 1}
                      </div>
                      <div style={{ flexGrow: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', color: 'var(--avd-fg)' }}>
                          {candidate.name} {formatSurname(candidate.surname)}
                          {isSelected && (
                            <span className="avd-chip avd-chip-ok" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>
                              SELECCIONADO
                            </span>
                          )}
                          {isSelected && candidate.selected_in_round != null && (
                            <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>
                              R{candidate.selected_in_round}
                            </span>
                          )}
                          {hasMajority && !isSelected && (
                            <span className="avd-chip avd-chip-brand" style={{ height: 18, fontSize: 10, padding: '0 7px' }}>
                              +50%
                            </span>
                          )}
                        </div>
                        {(candidate.location || candidate.group_name) && (
                          <div style={{ fontSize: 12, color: 'var(--avd-fg-muted)', marginTop: 2 }}>
                            {candidate.location && `📍 ${candidate.location}`}
                            {candidate.location && candidate.group_name && ' • '}
                            {candidate.group_name && `👥 ${candidate.group_name}`}
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <div style={{ flexGrow: 1, background: 'var(--avd-border-soft)', borderRadius: 999, height: 10, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%', borderRadius: 999, transition: 'width 1s ease',
                                background: isSelected ? 'var(--avd-ok)' : 'var(--avd-brand)',
                                width: `${Math.min(Math.max(displayPercentage, 0), 100)}%`,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 600, minWidth: 56, textAlign: 'right', color: 'var(--avd-fg)' }}>
                            {displayPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--avd-fg)' }}>{result.vote_count}</div>
                        <div style={{ fontSize: 11, color: 'var(--avd-fg-muted)', textTransform: 'uppercase' }}>votos</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

    // Si el usuario ha votado pero no están visibles para todos, mostrar gracias
    if (hasVoted) {
    return (
      <div className="pub-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative' }}>
        {/* Ticket keyframes */}
        <style>{`
          @keyframes tkt-pop {
            0%   { transform: scale(0.5) rotate(-8deg); opacity: 0; }
            60%  { transform: scale(1.08) rotate(2deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes tkt-fade-up {
            0%   { transform: translateY(12px); opacity: 0; }
            100% { transform: translateY(0);   opacity: 1; }
          }
          @keyframes tkt-ring {
            0%   { transform: scale(0.85); opacity: 0.5; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes tkt-float {
            0%,100% { transform: translateY(0) scale(1);   opacity: 0.55; }
            50%     { transform: translateY(-10px) scale(1.2); opacity: 1; }
          }
          @keyframes tkt-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes tkt-card-in {
            0%   { transform: translateY(18px) scale(0.95); opacity: 0; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          @keyframes tkt-glow-pulse {
            0%,100% { box-shadow: 0 0 30px -8px rgba(16,185,129,0.4); }
            50%     { box-shadow: 0 0 50px -5px rgba(16,185,129,0.65); }
          }
          @keyframes tkt-check-burst {
            0%   { transform: scale(0.3); opacity: 0; }
            50%  { transform: scale(1.2); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes tkt-receipt-in {
            0%   { transform: translateY(12px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>

        <div style={{ position: 'absolute', right: 16, top: 16, zIndex: 20 }}>
          <ThemeToggle mode="inline" />
        </div>

        <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* ═══ Main ticket card ═══ */}
          <div style={{
            position: 'relative',
            borderRadius: 'calc(var(--avd-radius-lg) + 4px)',
            overflow: 'hidden',
            padding: '4px',
            animation: 'tkt-card-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
            flexShrink: 0,
          }}>
            {/* Spinning conic-gradient border */}
            <div style={{
              position: 'absolute', width: '200%', height: '200%', top: '-50%', left: '-50%',
              background: 'conic-gradient(from 0deg, oklch(0.20 0.12 155) 0deg, oklch(0.20 0.12 155) 50deg, oklch(0.85 0.22 155) 120deg, oklch(0.85 0.22 155) 160deg, oklch(0.20 0.12 155) 230deg, oklch(0.20 0.12 155) 280deg, oklch(0.85 0.22 155) 350deg, oklch(0.85 0.22 155) 380deg)',
              animation: 'spin 3s linear infinite', pointerEvents: 'none',
            }} />

            <div style={{
              position: 'relative', zIndex: 1, overflow: 'hidden',
              borderRadius: 'calc(var(--avd-radius-lg) - 1px)',
              background: 'linear-gradient(165deg, oklch(0.52 0.17 155), oklch(0.45 0.15 160))',
            }}>
              {/* Top shimmer bar */}
              <div style={{
                height: 3, width: '100%',
                backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.35), rgba(255,255,255,0.08))',
                backgroundSize: '200% 100%',
                animation: 'tkt-shimmer 2s linear infinite',
              }} />

              <div style={{ padding: '36px 32px 28px', textAlign: 'center' }}>

                {/* Icon with pulsing rings + floating particles */}
                <div style={{
                  position: 'relative', width: 100, height: 100,
                  margin: '0 auto 24px',
                  animation: 'tkt-pop 550ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}>
                  {/* Pulsing rings */}
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 18,
                    border: '2px solid rgba(255,255,255,0.35)',
                    animation: 'tkt-ring 1.8s ease-out infinite',
                  }} />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 18,
                    border: '2px solid rgba(255,255,255,0.35)',
                    animation: 'tkt-ring 1.8s ease-out infinite',
                    animationDelay: '0.6s',
                  }} />

                  {/* Icon bubble */}
                  <div style={{
                    width: 100, height: 100, borderRadius: 18,
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'tkt-glow-pulse 2.5s ease-in-out infinite',
                  }}>
                    <CheckCircle2 style={{
                      width: 52, height: 52, color: 'white',
                      animation: 'tkt-check-burst 600ms cubic-bezier(0.22, 1, 0.36, 1) 0.3s both',
                    }} strokeWidth={1.5} />
                  </div>
                </div>

                {/* Title text with fade-up */}
                <div style={{ animation: 'tkt-fade-up 450ms ease-out 0.2s both' }}>
                  <h1 style={{
                    fontSize: 30, fontWeight: 900, marginBottom: 16,
                    letterSpacing: '-0.025em', color: 'white', lineHeight: 1.1,
                  }}>
                    Voto registrado
                  </h1>
                </div>

                {/* Voting name + round — separated */}
                <div style={{ animation: 'tkt-fade-up 450ms ease-out 0.35s both' }}>
                  <p style={{
                    fontWeight: 800, fontSize: 16, color: 'white',
                    marginBottom: 4, letterSpacing: '-0.01em',
                  }}>
                    {activeRound?.title}
                  </p>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '3px 12px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    marginBottom: 0,
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#6ee7b7', boxShadow: '0 0 6px #6ee7b7',
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Ronda {activeRound?.current_round_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom verification footer */}
              <div style={{
                padding: '12px 24px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(0,0,0,0.12)',
                textAlign: 'center',
                animation: 'tkt-fade-up 450ms ease-out 0.5s both',
              }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11.5, fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
                  Muestra esta pantalla para verificar que has votado correctamente.
                </p>
              </div>
            </div>
          </div>

          {/* ═══ Receipt card ═══ */}
          {(voteHashCode || voteReceipt) && (
            <div style={{
              overflow: 'hidden', borderRadius: 'var(--avd-radius-lg)',
              border: '1px solid var(--avd-border)', background: 'var(--avd-surface)',
              animation: 'tkt-receipt-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both',
            }}>
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
    <div className="relative min-h-screen bg-background px-3 pb-36 pt-3 sm:px-4 sm:pt-4">

      {/* Submit Animation Overlay */}
      <VoteSubmitAnimation
        isVisible={showSubmitAnimation}
        onComplete={handleSubmitAnimationComplete}
        voteHash={voteHashCode}
      />


{/* Tab-hidden cover: hides ballot content when user switches tabs */}
      {tabHidden && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 150, pointerEvents: 'none',
            background: 'var(--background)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
          }}
        >
          <span style={{ fontSize: 40 }}>🔒</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)' }}>
            Votación privada
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
            Vuelve a esta pestaña para continuar
          </span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="mb-5 pt-1 text-center sm:mb-7 space-y-1.5">
          <h1 className="font-headline text-3xl font-black tracking-tight sm:text-5xl pb-0.5">
            {activeRound.title}
          </h1>
          {activeRound.description && (
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
              {activeRound.description}
            </p>
          )}
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

      {/* Sticky bottom action bar */}
      {!showSubmitAnimation && (
      <div
        className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-outline-variant bg-surface-container-lowest shadow-[0_-8px_24px_-12px_hsl(var(--outline-variant)/0.45)] dark:border-outline-variant dark:bg-surface-container-low px-4 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))]"
        style={{ backgroundColor: "hsl(var(--surface-container-lowest))", opacity: 1 }}
      >
        <div className="mx-auto max-w-4xl space-y-2">
          {/* Selected names row */}
          <div className="min-w-0">
            {selectedCandidates.length > 0 ? (
              <p className="truncate text-sm font-semibold text-foreground">
                {selectedCandidateShortNames.join(' · ')}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/55">Selecciona candidatos</p>
            )}
          </div>

          {/* Meta + buttons row */}
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Ronda {activeRound.current_round_number} - Máx. {maxVotesThisRound} voto{maxVotesThisRound > 1 ? 's' : ''}
            </p>

            <div className="flex-1" />

            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedCandidates.length === 0 || voting}
              aria-label="Borrar selección"
              className="avd-btn avd-btn-danger"
              style={{ width: 36, height: 36, padding: 0 }}
            >
              <Trash2 style={{ width: 15, height: 15 }} />
            </button>

            <button
              type="button"
              onClick={openVoteConfirmation}
              disabled={maxVotesThisRound === 0 || selectedCandidates.length === 0 || voting}
              className="avd-btn"
              style={{ height: 36, background: '#059669', color: 'white', borderColor: '#047857', fontWeight: 700, padding: '0 14px', flexShrink: 0 }}
            >
              {voting ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', marginRight: 6 }} />
                  Votando...
                </>
              ) : (
                <>
                  <Vote style={{ width: 14, height: 14, marginRight: 6 }} />
                  Votar ({selectedCandidates.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {confirmVoteOpen && (
        <div className="avd-dialog-overlay" style={{ zIndex: 110 }} onMouseDown={(e) => { if (e.target === e.currentTarget && !voting) setConfirmVoteOpen(false); }}>
          <div className="avd-dialog" style={{ maxWidth: 420, padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 4, background: 'linear-gradient(90deg,#10b981,#2dd4bf,#10b981)' }} />

            <div style={{ padding: '32px 32px 20px', textAlign: 'center' }}>
              <div style={{ margin: '0 auto 20px', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: '#d1fae5', border: '1px solid #6ee7b7' }}>
                <Vote style={{ width: 32, height: 32, color: '#059669' }} strokeWidth={1.7} />
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--avd-fg)', marginBottom: 8 }}>
                Confirmar voto
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--avd-fg-muted)' }}>
                Revisa tu selección. Esta acción no se puede deshacer.
              </p>
            </div>

            <div style={{ padding: '0 24px 20px' }}>
              <div style={{ overflow: 'hidden', borderRadius: 'var(--avd-radius-md)', border: '1px solid var(--avd-border)', background: 'var(--avd-bg-sunken)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--avd-border-soft)', padding: '10px 16px' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--avd-fg-muted)' }}>
                    Tu selección
                  </p>
                </div>
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedCandidateNames.map((name, index) => (
                    <div key={`${name}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--avd-brand-bg)', fontSize: 10, fontWeight: 700, color: 'var(--avd-brand)' }}>
                        {index + 1}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--avd-fg)' }}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="avd-dialog-foot" style={{ justifyContent: 'stretch', gap: 8 }}>
              <button
                disabled={voting}
                onClick={() => setConfirmVoteOpen(false)}
                className="avd-btn"
                style={{ flex: 1, justifyContent: 'center', height: 44 }}
              >
                Cancelar
              </button>
              <button
                disabled={voting}
                onClick={async () => {
                  await new Promise(r => setTimeout(r, 50));
                  setConfirmVoteOpen(false);
                  await new Promise(r => setTimeout(r, 10));
                  submitVote();
                }}
                className="avd-btn"
                style={{ flex: 1, justifyContent: 'center', height: 44, background: '#059669', color: 'white', borderColor: '#047857', fontWeight: 700 }}
              >
                Confirmar voto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
