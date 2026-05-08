import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { generateDeviceHash, generateBrowserInstanceId, hasVotedLocally, markAsVoted } from '@/lib/device';
import { getMaxVotesAllowed } from '@/lib/votingRules';
import { createVoteReceipt } from '@/lib/voteHash';
import { debugLog, errorLog } from '@/lib/logger';
import { formatSurname } from '@/lib/candidateFormat';
import { isAccessCodeVerified, markAccessCodeVerified } from '@/components/voting/AccessCodeInput';
import type { useToast } from '@/hooks/use-toast';
import type { VoteReceipt } from '@/components/voting/VoteTicket';
import type { RoundRow, CandidateRow, RoundResultRow } from '@/types/db';

export type Round = RoundRow;
export type Candidate = CandidateRow;
export type RoundResult = Pick<RoundResultRow, 'candidate_id' | 'vote_count' | 'percentage'>;

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

function getSeatStorageKey(roundId: string) { return `mcm_seat_id_${roundId}`; }
function getReceiptStorageKey(roundId: string, roundNumber: number) { return `mcm_vote_receipt_${roundId}_round_${roundNumber}`; }

interface UseVotingPageOptions {
  toast: ReturnType<typeof useToast>['toast'];
}

export function useVotingPage({ toast }: UseVotingPageOptions) {
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

  const navigate = useNavigate();

  const activeRoundRef = useRef<Round | null>(null);
  const submitAnimationRoundRef = useRef<{ roundId: string; roundNumber: number } | null>(null);
  const submitTransitionTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    const handleVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

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
      ) { return null; }
      const normalizedVotes = parsed.votes.map((v) => (typeof v === 'string' ? v : '-')).slice(0, 3);
      while (normalizedVotes.length < 3) normalizedVotes.push('-');
      return {
        roundId, roundNumber, voteCode: parsed.voteCode, votes: normalizedVotes,
        createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : new Date().toISOString(),
      };
    } catch { return null; }
  }, []);

  const buildReceiptVotes = useCallback((candidateIds: string[]) => {
    if (candidateIds.length === 0) return ['Voto en blanco'];
    const names = candidateIds.map((id) => {
      const c = candidates.find((item) => item.id === id);
      return c ? `${c.name} ${formatSurname(c.surname)}`.trim() : '-';
    }).slice(0, 3);
    while (names.length < 3) names.push('-');
    return names;
  }, [candidates]);

  const persistVoteReceipt = useCallback((receipt: VoteReceipt) => {
    try { localStorage.setItem(getReceiptStorageKey(receipt.roundId, receipt.roundNumber), JSON.stringify(receipt)); } catch { /* ignore */ }
    setVoteReceipt(receipt);
    setVoteHashCode(receipt.voteCode);
  }, []);

  const finalizeVoteTransition = useCallback(() => {
    if (submitTransitionTimeoutRef.current) {
      clearTimeout(submitTransitionTimeoutRef.current);
      submitTransitionTimeoutRef.current = null;
    }
    setShowSubmitAnimation(false);
    if (!submitAnimationRoundRef.current) return;
    submitAnimationRoundRef.current = null;
    setHasVoted(true);
  }, []);

  const handleSubmitAnimationComplete = useCallback(() => {
    finalizeVoteTransition();
  }, [finalizeVoteTransition]);

  const ensureSeat = useCallback(async (round: Round) => {
    if (round.is_closed) { setSeatId(null); setSeatError(''); return; }
    setSeatLoading(true);
    try {
      const fingerprintHash = generateDeviceHash(round.id);
      const browserInstanceId = generateBrowserInstanceId();
      const storageKey = getSeatStorageKey(round.id);
      const storedSeatId = localStorage.getItem(storageKey);

      if (storedSeatId) {
        const { data: verifyData, error: verifyError } = await supabase.rpc('verify_seat', {
          p_seat_id: storedSeatId, p_fingerprint_hash: fingerprintHash, p_browser_instance_id: browserInstanceId,
        });
        if (!verifyError) {
          const verified = verifyData as VerifySeatResponse;
          if (verified?.valid) { setSeatId(storedSeatId); setSeatError(''); return; }
        }
        localStorage.removeItem(storageKey);
      }

      const { data: joinData, error: joinError } = await supabase.rpc('join_round_seat', {
        p_round_id: round.id, p_fingerprint_hash: fingerprintHash, p_browser_instance_id: browserInstanceId,
        p_user_agent: navigator.userAgent, p_ip_address: 'browser-client',
      });
      if (joinError) throw joinError;
      const joined = joinData as JoinSeatResponse;
      if (joined?.success && joined.seat_id) {
        localStorage.setItem(storageKey, joined.seat_id);
        setSeatId(joined.seat_id); setSeatError(''); return;
      }
      setSeatId(null); setSeatError(joined?.message || 'No se pudo asignar un asiento para esta ronda.');
    } catch {
      setSeatId(null); setSeatError('No se pudo validar tu asiento para esta votacion.');
    } finally { setSeatLoading(false); }
  }, []);

  const loadResults = useCallback(async (roundId: string, roundNumber: number) => {
    if (!roundId) return;
    try {
      setLoadingResults(true);
      const { data, error } = await supabase
        .from('round_results').select('candidate_id, vote_count, percentage')
        .eq('round_id', roundId).eq('round_number', roundNumber).order('vote_count', { ascending: false });
      if (error) { errorLog('Error loading results:', error); return; }
      setResults(data || []);
    } catch (error) { errorLog('Error in loadResults:', error); }
    finally { setLoadingResults(false); }
  }, []);

  const loadActiveRound = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      if (!silent) setLoading(true);
      const { data: rounds, error: roundError } = await supabase.from('rounds').select('*').eq('is_active', true).limit(1);
      if (roundError) {
        errorLog('Error loading round:', roundError);
        toastRef.current({ title: 'Error', description: 'No se pudo cargar la información de la votación', variant: 'destructive' });
        return;
      }
      if (!rounds || rounds.length === 0) {
        setActiveRound(null); setCandidates([]); setSeatId(null); setSeatError(''); setAccessCodeVerified(false);
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
      if (storedReceipt) { setVoteReceipt(storedReceipt); setVoteHashCode(storedReceipt.voteCode); }
      else if (!sameRoundSameNumber) { setVoteReceipt(null); setVoteHashCode(''); }

      if (!sameRoundSameNumber) {
        if (submitTransitionTimeoutRef.current) { clearTimeout(submitTransitionTimeoutRef.current); submitTransitionTimeoutRef.current = null; }
        setSelectedCandidates([]); setResults([]); setHasVoted(false); setShowSubmitAnimation(false);
        submitAnimationRoundRef.current = null;
      }

      if (hasVerifiedCode) { await ensureSeat(round as Round); }
      else { setSeatId(null); setSeatError(''); }

      const deviceHash = generateDeviceHash(round.id);
      const { data: existingVotes, error: voteCheckError } = await supabase
        .from('votes').select('id').eq('round_id', round.id).eq('device_hash', deviceHash).eq('round_number', round.current_round_number);
      if (voteCheckError) { errorLog('Error checking existing votes:', voteCheckError); }
      else {
        const alreadyVoted = (existingVotes && existingVotes.length > 0) || hasVotedLocally(round.id, round.current_round_number);
        setHasVoted(alreadyVoted);
        if (round.show_results_to_voters && round.round_finalized) loadResults(round.id, round.current_round_number);
      }

      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates').select('*').eq('round_id', round.id).order('order_index');
      if (candidateError) {
        errorLog('Error loading candidates:', candidateError);
        toastRef.current({ title: 'Error', description: 'No se pudieron cargar los candidatos', variant: 'destructive' });
        return;
      }
      setCandidates(candidateData || []);
    } catch (error) {
      errorLog('Error in loadActiveRound:', error);
      toastRef.current({ title: 'Error', description: 'Error inesperado al cargar la votación', variant: 'destructive' });
    } finally { if (!silent) setLoading(false); }
  }, [loadResults, ensureSeat, loadStoredReceipt]);

  const handleAccessCode = useCallback(async (code: string) => {
    if (!activeRound) return;
    setAccessCodeLoading(true); setAccessCodeError('');
    if (activeRound.access_code && code.toUpperCase() === activeRound.access_code.toUpperCase()) {
      markAccessCodeVerified(activeRound.id); setAccessCodeVerified(true);
      await ensureSeat(activeRound);
    } else { setAccessCodeError('Código incorrecto. Inténtalo de nuevo.'); }
    setAccessCodeLoading(false);
  }, [activeRound, ensureSeat]);

  const computeMaxVotesThisRound = useCallback(() => {
    if (!activeRound) return 0;
    const currentlySelected = candidates.filter(c => c.is_selected).length;
    return getMaxVotesAllowed(activeRound.max_selected_candidates, currentlySelected, activeRound.max_votes_per_round);
  }, [activeRound, candidates]);

  const submitVote = useCallback(async (currentSeatId: string | null, currentSeatError: string) => {
    if (!activeRound) return;
    if (!activeRound.is_voting_open) {
      toastRef.current({ title: 'Ronda no iniciada', description: 'La sala esta abierta, pero la ronda de voto aun no ha comenzado.', variant: 'destructive' }); return;
    }
    if (!currentSeatId) {
      toastRef.current({ title: 'Asiento no valido', description: currentSeatError || 'No se pudo validar tu asiento para votar.', variant: 'destructive' }); return;
    }
    if (activeRound.round_finalized) {
      toastRef.current({ title: 'Ronda finalizada', description: 'Esta ronda ya ha finalizado y no se pueden enviar más votos', variant: 'destructive' }); return;
    }
    try {
      if (submitTransitionTimeoutRef.current) { clearTimeout(submitTransitionTimeoutRef.current); submitTransitionTimeoutRef.current = null; }
      setVoting(true);
      submitAnimationRoundRef.current = { roundId: activeRound.id, roundNumber: activeRound.current_round_number };
      setShowSubmitAnimation(true);

      const deviceHash = generateDeviceHash(activeRound.id);
      const browserInstanceId = generateBrowserInstanceId();
      const userAgent = navigator.userAgent;

      const { data: verifySeatData, error: verifySeatError } = await supabase.rpc('verify_seat', {
        p_seat_id: currentSeatId, p_fingerprint_hash: deviceHash, p_browser_instance_id: browserInstanceId,
      });
      if (verifySeatError) {
        setShowSubmitAnimation(false);
        toastRef.current({ title: 'Error de asiento', description: 'No se pudo verificar tu asiento antes de votar.', variant: 'destructive' }); return;
      }
      const verifyResponse = verifySeatData as VerifySeatResponse;
      if (!verifyResponse?.valid) {
        setShowSubmitAnimation(false); setSeatError(verifyResponse?.message || 'Tu asiento ya no es valido para esta ronda.');
        toastRef.current({ title: 'Asiento expirado', description: verifyResponse?.message || 'Debes reingresar con un asiento valido.', variant: 'destructive' }); return;
      }

      const { data: existingVote, error: checkError } = await supabase
        .from('votes').select('id').eq('round_id', activeRound.id).eq('device_hash', deviceHash).eq('round_number', activeRound.current_round_number);
      if (checkError) {
        errorLog('Error checking existing vote:', checkError); setShowSubmitAnimation(false);
        toastRef.current({ title: 'Error', description: 'Error al verificar el voto', variant: 'destructive' }); return;
      }
      if (existingVote && existingVote.length > 0) {
        setShowSubmitAnimation(false);
        const storedReceipt = loadStoredReceipt(activeRound.id, activeRound.current_round_number);
        if (storedReceipt) { setVoteReceipt(storedReceipt); setVoteHashCode(storedReceipt.voteCode); }
        toastRef.current({ title: 'Ya has votado', description: 'Este dispositivo ya ha emitido un voto en esta ronda', variant: 'destructive' });
        setHasVoted(true); markAsVoted(activeRound.id, activeRound.current_round_number); return;
      }

      const receipt = await createVoteReceipt(activeRound.id, selectedCandidates, deviceHash, activeRound.current_round_number);
      const persistedReceipt: VoteReceipt = {
        roundId: activeRound.id, roundNumber: activeRound.current_round_number,
        voteCode: receipt.voteCode, votes: buildReceiptVotes(selectedCandidates), createdAt: new Date().toISOString(),
      };
      const { data: ballotResult, error: voteError } = await supabase.rpc('cast_ballot', {
        p_round_id: activeRound.id, p_seat_id: currentSeatId, p_candidate_ids: selectedCandidates,
        p_device_hash: deviceHash, p_user_agent: userAgent, p_round_number: activeRound.current_round_number, p_vote_hash: receipt.fullHash,
      });
      if (voteError || !ballotResult?.success) {
        errorLog('Error submitting vote:', voteError ?? ballotResult?.error_code);
        setShowSubmitAnimation(false);
        if (ballotResult?.error_code === 'ALREADY_VOTED') {
          toastRef.current({ title: 'Ya has votado', description: 'Este dispositivo ya emitió voto en esta ronda', variant: 'destructive' });
          markAsVoted(activeRound.id, activeRound.current_round_number);
        } else { toastRef.current({ title: 'Error', description: 'No se pudo registrar el voto', variant: 'destructive' }); }
        return;
      }

      persistVoteReceipt(persistedReceipt);
      markAsVoted(activeRound.id, activeRound.current_round_number);
      submitTransitionTimeoutRef.current = window.setTimeout(() => finalizeVoteTransition(), 5000);
      if (activeRound.round_finalized && activeRound.show_results_to_voters) await loadResults(activeRound.id, activeRound.current_round_number);
    } catch (error) {
      errorLog('Error in submitVote:', error); setShowSubmitAnimation(false);
      toastRef.current({ title: 'Error', description: 'Error inesperado al votar', variant: 'destructive' });
    } finally { setVoting(false); }
  }, [selectedCandidates, activeRound, loadStoredReceipt, buildReceiptVotes, persistVoteReceipt, finalizeVoteTransition, loadResults]);

  const copyVerificationCode = useCallback(async () => {
    if (!voteHashCode) { toastRef.current({ title: 'Sin código', description: 'No hay un código de verificación para copiar.', variant: 'destructive' }); return; }
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(voteHashCode); }
      else {
        const textArea = document.createElement('textarea');
        textArea.value = voteHashCode;
        textArea.style.fontSize = '16px'; textArea.style.position = 'fixed'; textArea.style.top = '0'; textArea.style.left = '0';
        textArea.style.width = '2em'; textArea.style.height = '2em'; textArea.style.padding = '0'; textArea.style.border = 'none';
        textArea.style.outline = 'none'; textArea.style.boxShadow = 'none'; textArea.style.background = 'transparent';
        textArea.setAttribute('readonly', 'true'); textArea.setAttribute('contenteditable', 'true');
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select(); textArea.setSelectionRange(0, 999999);
        const copied = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (!copied) throw new Error('copy-failed');
      }
      toastRef.current({ title: 'Copiado', description: 'Código de verificación copiado.' });
    } catch { toastRef.current({ title: 'No se pudo copiar', description: 'Copia manualmente el código de verificación.', variant: 'destructive' }); }
  }, [voteHashCode]);

  const toggleCandidateSelection = useCallback((candidateId: string) => {
    if (!activeRound) return;
    const maxVotesThisRound = computeMaxVotesThisRound();
    if (maxVotesThisRound === 0) { toastRef.current({ title: 'Votación completada', description: 'Ya se alcanzó el máximo de candidatos seleccionados. No se admiten más votos.' }); return; }
    setSelectedCandidates(prev => {
      const isSelected = prev.includes(candidateId);
      if (isSelected) return prev.filter(id => id !== candidateId);
      if (prev.length < maxVotesThisRound) return [...prev, candidateId];
      toastRef.current({ title: 'Límite alcanzado', description: `Solo puedes votar por ${maxVotesThisRound} candidato${maxVotesThisRound > 1 ? 's' : ''} en esta ronda`, variant: 'destructive' });
      return prev;
    });
  }, [activeRound, computeMaxVotesThisRound]);

  const clearSelection = useCallback(() => setSelectedCandidates([]), []);

  const openVoteConfirmation = useCallback((maxVotesThisRound: number) => {
    if (maxVotesThisRound === 0 || voting) return;
    setConfirmVoteOpen(true);
  }, [voting]);

  useEffect(() => {
    const adminParam = new URLSearchParams(window.location.search).get('admin');
    if (adminParam === 'true') { navigate('/admin', { replace: true }); return; }

    loadActiveRound();

    const roundsChannel = supabase
      .channel(`voter-rounds-updates-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rounds', filter: 'is_active=eq.true' },
        (payload) => { debugLog('🆕 New active round created:', payload); loadActiveRound({ silent: true }); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rounds' },
        (payload) => {
          debugLog('🔄 Round updated:', payload);
          const updated = (payload as unknown as { new: Partial<Round> }).new;
          if (!updated) return;
          const current = activeRoundRef.current;
          if (current && updated.id === current.id) {
            const affectsVoter = (
              (updated.is_active !== undefined && updated.is_active !== current.is_active) ||
              (updated.is_closed !== undefined && updated.is_closed !== current.is_closed) ||
              (updated.is_voting_open !== undefined && updated.is_voting_open !== current.is_voting_open) ||
              (updated.join_locked !== undefined && updated.join_locked !== current.join_locked) ||
              (updated.round_finalized !== undefined && updated.round_finalized !== current.round_finalized) ||
              (updated.show_results_to_voters !== undefined && updated.show_results_to_voters !== current.show_results_to_voters) ||
              (updated.show_ballot_summary_projection !== undefined && updated.show_ballot_summary_projection !== current.show_ballot_summary_projection) ||
              (updated.current_round_number !== undefined && updated.current_round_number !== current.current_round_number)
            );
            if (affectsVoter) { debugLog('🔄 Current round updated with voter impact, reloading...'); loadActiveRound({ silent: true }); }
          } else if (updated.is_active === true) {
            debugLog('🔄 Different round became active, reloading...', { updatedId: updated.id, currentId: current?.id || 'none' });
            loadActiveRound({ silent: true });
          }
        })
      .subscribe((status) => { debugLog('📡 Subscription status:', status); });

    return () => {
      debugLog('🔌 Unsubscribing from rounds updates');
      supabase.removeChannel(roundsChannel);
      if (submitTransitionTimeoutRef.current) { clearTimeout(submitTransitionTimeoutRef.current); submitTransitionTimeoutRef.current = null; }
    };
  }, [navigate, loadActiveRound]);

  const maxVotesThisRound = computeMaxVotesThisRound();

  const selectedCandidateNames = selectedCandidates.map((id) => {
    const c = candidates.find((item) => item.id === id);
    return c ? `${c.name} ${formatSurname(c.surname)}` : id;
  });

  const selectedCandidateShortNames = selectedCandidates.map((id) => {
    const c = candidates.find((item) => item.id === id);
    if (!c) return id;
    const firstSurnameChar = c.surname.trim().charAt(0).toUpperCase();
    return firstSurnameChar ? `${c.name} ${firstSurnameChar}.` : c.name;
  });

  return {
    activeRound, candidates, loading,
    results, loadingResults,
    selectedCandidates, voting, hasVoted,
    showSubmitAnimation, voteHashCode, voteReceipt,
    accessCodeVerified, accessCodeError, accessCodeLoading,
    seatId, seatLoading, seatError,
    confirmVoteOpen, setConfirmVoteOpen,
    tabHidden, maxVotesThisRound,
    selectedCandidateNames, selectedCandidateShortNames,
    loadActiveRound,
    handleAccessCode, handleSubmitAnimationComplete,
    copyVerificationCode,
    submitVote: (opts?: { flushConfirmClose?: () => void }) => {
      opts?.flushConfirmClose?.();
      return submitVote(seatId, seatError);
    },
    toggleCandidateSelection, clearSelection,
    openVoteConfirmation: () => openVoteConfirmation(maxVotesThisRound),
  };
}
