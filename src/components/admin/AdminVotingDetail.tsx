import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { ACCESS_CODE_REGEX, generateAccessCode } from "@/lib/accessCode";
import { useToast } from "@/hooks/use-toast";
import { testDatasets } from "@/lib/testDatasets";
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, BarChart2, Check, CheckCircle, Copy, Download,
  Eye, Globe, Grid, List, Moon, Pause, Pencil,
  Play, RefreshCw, Search, Settings2, Sparkles, StepForward,
  Sun, Trash2, Undo2, Upload, UserPlus, Users, XCircle,
} from "lucide-react";
import { formatCandidateName } from "@/lib/candidateFormat";
import { ResultsAnalytics } from "@/components/admin/ResultsAnalytics";
import { BallotReview } from "@/components/voting/BallotReview";
import { useRoundWorkflow } from "@/hooks/useRoundWorkflow";
import { TeamChip } from "@/components/admin/TeamChip";

import type { RoundRow, CandidateRow } from "@/types/db";

/* ── Interfaces ── */

type RoundDetail = RoundRow;
type Candidate = CandidateRow;

interface InlineResult {
  candidate_id: string;
  vote_count: number;
  percentage: number;
  candidate_name: string;
  candidate_surname: string;
  is_selected: boolean;
  has_majority: boolean;
}

interface SeatRow {
  id: string;
  estado: "libre" | "ocupado" | "expirado";
  joined_at: string;
  last_seen_at: string;
  browser_instance_id: string;
}

interface SeatStatus {
  occupied_seats: number;
  expired_seats: number;
  available_seats: number;
}

interface VoteExportRow {
  round_number: number;
  vote_hash: string | null;
  created_at: string;
  is_invalidated: boolean;
  invalidation_reason: string | null;
  candidate: { name: string; surname: string } | Array<{ name: string; surname: string }> | null;
}

interface CandidateFormState {
  name: string;
  surname: string;
  location: string;
  group_name: string;
  age: number | "";
  description: string;
  image_url: string;
}

type ImportCandidate = Omit<CandidateFormState, "age"> & { age: number | null };

/* ── Helpers ── */

const normalizeVoteCandidate = (candidate: VoteExportRow["candidate"]) =>
  Array.isArray(candidate) ? candidate[0] : candidate;

function shortBallotCode(hash: string | null): string {
  if (!hash) return "sin_hash";
  return `VT-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`;
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

const WORKFLOW_STEPS = [
  { id: "open-room", label: "Abrir sala", sub: "Sala de espera abierta" },
  { id: "start", label: "Iniciar votación", sub: "Empieza el voto" },
  { id: "close-vote", label: "Finalizar votación", sub: "Cierra y procesa" },
  { id: "results", label: "Ver resultados ronda", sub: "Se proyectan los resultados" },
  { id: "ballots", label: "Ver papeletas", sub: "Se proyectan las papeletas" },
  { id: "finish", label: "Finalizar ronda", sub: "Siguiente ronda o cierre" },
];

/* ── Component ── */

export function AdminVotingDetail() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  /* State */
  const [round, setRound] = useState<RoundDetail | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateView, setCandidateView] = useState<"list" | "grid">("list");
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [seatStatus, setSeatStatus] = useState<SeatStatus | null>(null);
  const [currentRoundVotes, setCurrentRoundVotes] = useState(0);
  const [savingConfig, setSavingConfig] = useState(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [configAccessCode, setConfigAccessCode] = useState("");
  const [configCensusMode, setConfigCensusMode] = useState<"maximum" | "exact">("maximum");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isBallotsOpen, setIsBallotsOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [isEditCandidateOpen, setIsEditCandidateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDatasetOpen, setIsDatasetOpen] = useState(false);
  const [salaConflict, setSalaConflict] = useState<{ id: string; title: string } | null>(null);
  const [configMaxVotantes, setConfigMaxVotantes] = useState(0);
  const [configMaxSelected, setConfigMaxSelected] = useState(0);
  const [configMaxVotesPerRound, setConfigMaxVotesPerRound] = useState(0);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [importingFile, setImportingFile] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(import.meta.env.DEV ? (testDatasets[0]?.id ?? "") : "");
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [candidateToSelect, setCandidateToSelect] = useState<Candidate | null>(null);
  const [candidateToUnselect, setCandidateToUnselect] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [isCloseRoundConfirmOpen, setIsCloseRoundConfirmOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState<CandidateFormState>({
    name: "", surname: "", location: "", group_name: "", age: "", description: "", image_url: "",
  });
  const currentRoundNumberRef = useRef(1);
  const [candidatesRef] = useAutoAnimate();
  const [inlineResults, setInlineResults] = useState<InlineResult[]>([]);
  const [forceSelectingId, setForceSelectingId] = useState<string | null>(null);

  /* Clock */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Data loading ── */

  const loadSeatsAndStatus = useCallback(async () => {
    if (!roundId) return;
    const [{ data: seatData, error: seatError }, { data: seatStatusData, error: seatStatusError }] = await Promise.all([
      supabase.from("seats").select("id,estado,joined_at,last_seen_at,browser_instance_id").eq("round_id", roundId).order("joined_at", { ascending: false }).limit(60),
      supabase.rpc("get_round_seats_status", { p_round_id: roundId }),
    ]);
    if (!seatError) setSeats((seatData || []) as SeatRow[]);
    if (!seatStatusError && seatStatusData) {
      const parsed = seatStatusData as { occupied_seats?: number; expired_seats?: number; available_seats?: number };
      setSeatStatus({
        occupied_seats: parsed.occupied_seats || 0,
        expired_seats: parsed.expired_seats || 0,
        available_seats: parsed.available_seats || 0,
      });
    }
  }, [roundId]);

  const loadCurrentRoundVotes = useCallback(async (roundNumber: number) => {
    if (!roundId || !roundNumber) return;
    const { data: liveVoteRows } = await supabase.from("votes").select("vote_hash, seat_id, device_hash").eq("round_id", roundId).eq("round_number", roundNumber);
    const uniqueBallots = new Set((liveVoteRows || []).map((row) => row.vote_hash || row.seat_id || row.device_hash).filter(Boolean));
    setCurrentRoundVotes(uniqueBallots.size);
  }, [roundId]);

  const loadInlineResults = useCallback(async (roundNumber: number) => {
    if (!roundId) return;
    type InlineResultRow = {
      candidate_id: string;
      vote_count: number;
      percentage: number;
      candidate:
        | { name?: string | null; surname?: string | null; is_selected?: boolean | null }
        | Array<{ name?: string | null; surname?: string | null; is_selected?: boolean | null }>
        | null;
    };
    const { data } = await supabase
      .from("round_results")
      .select(`candidate_id, vote_count, percentage, candidate:candidates (name, surname, is_selected)`)
      .eq("round_id", roundId)
      .eq("round_number", roundNumber)
      .order("vote_count", { ascending: false });
    if (!data) return;
    const results: InlineResult[] = (data as InlineResultRow[]).map((r) => {
      const c = Array.isArray(r.candidate) ? r.candidate[0] : r.candidate;
      return {
        candidate_id: r.candidate_id,
        vote_count: r.vote_count,
        percentage: r.percentage,
        candidate_name: c?.name || "?",
        candidate_surname: c?.surname || "",
        is_selected: c?.is_selected || false,
        has_majority: r.percentage > 50,
      };
    });
    setInlineResults(results);
  }, [roundId]);

  const loadRound = useCallback(async () => {
    if (!roundId) return;
    try {
      setLoading(true);
      const [{ data: roundData, error: roundError }, { data: candidateData, error: candidateError }, { data: seatData, error: seatError }, { data: seatStatusData, error: seatStatusError }] = await Promise.all([
        supabase.from("rounds").select("id,slug,title,description,year,team,max_votantes,max_selected_candidates,max_votes_per_round,access_code,census_mode,is_active,is_closed,is_voting_open,join_locked,round_finalized,show_results_to_voters,show_ballot_summary_projection,show_final_gallery_projection,public_candidates_enabled,current_round_number,votes_current_round,voting_type_name").eq("id", roundId).single(),
        supabase.from("candidates").select("id,name,surname,location,group_name,age,description,image_url,order_index,is_eliminated,is_selected").eq("round_id", roundId).order("order_index", { ascending: true }),
        supabase.from("seats").select("id,estado,joined_at,last_seen_at,browser_instance_id").eq("round_id", roundId).order("joined_at", { ascending: false }).limit(60),
        supabase.rpc("get_round_seats_status", { p_round_id: roundId }),
      ]);
      if (roundError) throw roundError;
      if (candidateError) throw candidateError;
      if (seatError) throw seatError;
      const normalizedRound = roundData as RoundDetail;
      setRound(normalizedRound);
      currentRoundNumberRef.current = normalizedRound.current_round_number || 1;
      setCandidates((candidateData || []) as Candidate[]);
      setSeats((seatData || []) as SeatRow[]);
      await loadCurrentRoundVotes(normalizedRound.current_round_number);
      const normalizedAccessCode = (normalizedRound.access_code || "").toUpperCase();
      setConfigAccessCode(ACCESS_CODE_REGEX.test(normalizedAccessCode) ? normalizedAccessCode : generateAccessCode());
      setConfigCensusMode((normalizedRound.census_mode || "maximum") as "maximum" | "exact");
      setConfigMaxVotantes(normalizedRound.max_votantes || 0);
      setConfigMaxSelected(normalizedRound.max_selected_candidates || 0);
      setConfigMaxVotesPerRound(normalizedRound.max_votes_per_round || 0);
      if (!seatStatusError && seatStatusData) {
        const parsed = seatStatusData as { occupied_seats?: number; expired_seats?: number; available_seats?: number };
        setSeatStatus({ occupied_seats: parsed.occupied_seats || 0, expired_seats: parsed.expired_seats || 0, available_seats: parsed.available_seats || 0 });
      } else {
        setSeatStatus(null);
      }
      // Auto-load inline results if round is finalized
      if (normalizedRound.round_finalized && !normalizedRound.is_closed) {
        loadInlineResults(normalizedRound.current_round_number);
      } else {
        setInlineResults([]);
      }
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el detalle de la votacion", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [roundId, toast, loadCurrentRoundVotes, loadInlineResults]);

  useEffect(() => {
    loadRound();
    const channel = supabase
      .channel(`admin-voting-detail-${roundId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `id=eq.${roundId}` }, () => loadRound())
      .on("postgres_changes", { event: "*", schema: "public", table: "candidates", filter: `round_id=eq.${roundId}` }, () => loadRound())
      .on("postgres_changes", { event: "*", schema: "public", table: "seats", filter: `round_id=eq.${roundId}` }, () => loadSeatsAndStatus())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes", filter: `round_id=eq.${roundId}` }, () => loadCurrentRoundVotes(currentRoundNumberRef.current))
      .subscribe();
    const metricsInterval = window.setInterval(() => {
      loadSeatsAndStatus();
      loadCurrentRoundVotes(currentRoundNumberRef.current);
    }, 30000);
    return () => { window.clearInterval(metricsInterval); supabase.removeChannel(channel); };
  }, [loadRound, roundId, loadSeatsAndStatus, loadCurrentRoundVotes]);

  /* ── Derived state ── */

  const activeCandidatesCount = useMemo(() => candidates.filter((c) => !c.is_eliminated).length, [candidates]);
  const selectedCandidatesCount = useMemo(() => candidates.filter((c) => c.is_selected).length, [candidates]);
  const hasCandidates = activeCandidatesCount > 0;
  const maxSelectedCandidates = round?.max_selected_candidates || 6;
  const selectionQuotaReached = selectedCandidatesCount >= maxSelectedCandidates;
  const publicCandidatesPath = roundId ? `/candidatos/${round?.slug || roundId}` : "";
  const publicCandidatesUrl = publicCandidatesPath ? `${window.location.origin}${publicCandidatesPath}` : "";

  const isVotingStarted = Boolean(round && (round.is_active || round.is_closed || round.round_finalized || round.current_round_number > 1 || currentRoundVotes > 0));
  const isMaxVotantesLocked = isVotingStarted;
  const isProjectingSomething = Boolean(round && round.show_results_to_voters);

  const {
    stage,
    label: workflowActionLabel,
    disabled: workflowActionDisabled,
    roomIsOpen,
    canOpenRoom,
    canCloseRoom,
    canStartRound,
    canPauseRound,
    canResumeRound,
    canFinalizeRound,
    canStartNextRound,
  } = useRoundWorkflow({ round, hasCandidates, selectionQuotaReached, currentRoundVotes, isWorkflowRunning });

  const openAnalyticsDialog = useCallback(() => {
    setIsAnalyticsOpen(true);
  }, []);

  const openBallotsDialog = useCallback(() => {
    setIsBallotsOpen(true);
  }, []);

  /* ── Status chip ── */
  const statusChip = !round ? { cls: "", txt: "Cargando" }
    : round.is_closed ? { cls: "avd-chip-bad", txt: "Cerrada" }
    : round.is_voting_open ? { cls: "avd-chip-ok", txt: "Votación abierta" }
    : round.round_finalized ? { cls: "avd-chip-warn", txt: "Ronda finalizada" }
    : round.is_active ? { cls: "avd-chip-brand", txt: "Sala abierta" }
    : { cls: "avd-chip-muted", txt: "Sin iniciar" };

  /* ── Projection label ── */
  const projLabel = !round ? "Sin difundir"
    : round.show_results_to_voters ? "Galería activa"
    : "Sin difundir";

  /* ── Candidate filter ── */
  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.toLowerCase();
    return candidates.filter((c) =>
      !q || c.name.toLowerCase().includes(q) || c.surname?.toLowerCase().includes(q) || (c.location || "").toLowerCase().includes(q)
    );
  }, [candidates, candidateSearch]);

  const initials = (c: Candidate) => `${(c.name || "")[0] ?? ""}${(c.surname || "")[0] ?? ""}`.toUpperCase();

  /* ── Actions ── */

  const callOpenRoom = async (skipConflictCheck = false): Promise<boolean> => {
    if (!roundId || !round) return false;
    if (!hasCandidates) { toast({ title: "No se puede abrir sala", description: "Añade al menos un candidato antes de abrir la sala.", variant: "destructive" }); return false; }
    if (!canOpenRoom) { toast({ title: roomIsOpen ? "Sala ya abierta" : "No se puede abrir sala", description: roomIsOpen ? "La sala está abierta y ya puede entrar gente." : "Esta votación no está en estado válido." }); return false; }

    if (!skipConflictCheck) {
      const { data: activeRooms } = await supabase
        .from("rounds")
        .select("id, title")
        .eq("is_active", true)
        .neq("id", roundId)
        .limit(1);
      if (activeRooms && activeRooms.length > 0) {
        setSalaConflict({ id: activeRooms[0].id, title: activeRooms[0].title });
        return false;
      }
    }

    const { data, error } = await supabase.rpc("open_round_room", { p_round_id: roundId });
    if (error) { toast({ title: "Error", description: "No se pudo abrir la sala", variant: "destructive" }); return false; }
    const response = data as { success?: boolean; message?: string };
    if (!response?.success) { toast({ title: "No se pudo abrir sala", description: response?.message || "Operación rechazada", variant: "destructive" }); return false; }
    toast({ title: "Sala abierta", description: response.message || "La sala está abierta" });
    await loadRound();
    return true;
  };

  const resolveRoomConflict = async () => {
    if (!salaConflict || !roundId) return;
    // Pause the conflicting room
    await supabase.from("rounds").update({ is_active: false, is_voting_open: false, updated_at: new Date().toISOString() }).eq("id", salaConflict.id);
    setSalaConflict(null);
    // Open this room, skipping conflict check since we just resolved it
    const opened = await callOpenRoom(true);
    if (opened) await callStartRound(true);
  };

  const callStartRound = async (skipStateValidation = false): Promise<boolean> => {
    if (!roundId || !round) return false;
    if (!hasCandidates) { toast({ title: "No se puede iniciar", description: "Añade al menos un candidato.", variant: "destructive" }); return false; }
    if (!skipStateValidation && !canStartRound) { toast({ title: "No se puede iniciar", description: "La ronda no está en un estado válido.", variant: "destructive" }); return false; }
    const { data, error } = await supabase.rpc("start_voting_round", { p_round_id: roundId });
    if (error) { toast({ title: "Error", description: "No se pudo iniciar la ronda", variant: "destructive" }); return false; }
    const response = data as { success?: boolean; message?: string };
    if (!response?.success) { toast({ title: "No se pudo iniciar", description: response?.message || "Operación rechazada", variant: "destructive" }); return false; }
    toast({ title: "Ronda iniciada", description: response.message || "La ronda está en curso" });
    await loadRound();
    return true;
  };

  const callCloseRoom = async () => {
    if (!roundId || !canCloseRoom) return;
    try {
      // Keep seats alive — devices retain their ballot identity across room open/close cycles
      await supabase.from("rounds").update({ is_active: false, is_voting_open: false, join_locked: false, updated_at: new Date().toISOString() }).eq("id", roundId);
      toast({ title: "Sala cerrada", description: "La sala se cerró correctamente." });
      await loadRound();
    } catch { toast({ title: "Error", description: "No se pudo cerrar la sala", variant: "destructive" }); }
  };

  const closeVoting = async () => {
    if (!roundId) return;
    setIsCloseRoundConfirmOpen(false);
    const { error } = await supabase.from("rounds").update({ is_closed: true, is_active: false, is_voting_open: false, join_locked: true, updated_at: new Date().toISOString() }).eq("id", roundId);
    if (error) { toast({ title: "Error", description: "No se pudo cerrar la votación", variant: "destructive" }); return; }
    toast({ title: "Votación cerrada", description: "Se cerró la votación y se bloqueó la entrada" });
    await loadRound();
  };

  const confirmSelection = async () => {
    if (!roundId || !round?.round_finalized) { toast({ title: "Ronda no finalizada", description: "Primero finaliza la ronda.", variant: "destructive" }); return; }
    if (!selectionQuotaReached) { toast({ title: "Cupo no alcanzado", description: `Faltan ${maxSelectedCandidates - selectedCandidatesCount} candidata(s) por seleccionar.`, variant: "destructive" }); return; }
    const { error } = await supabase
      .from("rounds")
      .update({
        show_ballot_summary_projection: true,
        is_closed: true,
        is_active: false,
        is_voting_open: false,
        join_locked: true,
        public_candidates_enabled: false,
        show_results_to_voters: false,
        show_final_gallery_projection: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roundId);
    if (error) { toast({ title: "Error", description: "No se pudo confirmar la selección", variant: "destructive" }); return; }
    toast({ title: "Selección confirmada", description: "Votación cerrada, lista pública desactivada y lista para galería final." });
    await loadRound();
  };

  const runProjectionWorkflowStep = async () => {
    if (!round || isWorkflowRunning) return;
    setIsWorkflowRunning(true);
    try {
      if (canOpenRoom) {
        await callOpenRoom(false);
        return;
      }
      if (!round.round_finalized) {
        if (canStartRound) { await callStartRound(); return; }
        if (!canFinalizeRound) return;
        await finalizeRound(); return;
      }
      // Step: proyectar resultados
      if (!round.show_results_to_voters) {
        const { error } = await supabase.from("rounds").update({ show_results_to_voters: true, updated_at: new Date().toISOString() }).eq("id", roundId);
        if (error) { toast({ title: "Error", description: "No se pudo activar proyección de resultados", variant: "destructive" }); return; }
        await loadRound();
        return;
      }
      // Step: proyectar papeletas
      if (!round.show_ballot_summary_projection) {
        const { error } = await supabase.from("rounds").update({ show_ballot_summary_projection: true, updated_at: new Date().toISOString() }).eq("id", roundId);
        if (error) { toast({ title: "Error", description: "No se pudo activar proyección de papeletas", variant: "destructive" }); return; }
        await loadRound();
        return;
      }
      // Post-proyección routing
      if (selectionQuotaReached) { await confirmSelection(); return; }
      if (canStartNextRound) { await startNextRound(); return; }
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  const toggleGallery = async () => {
    if (!roundId || !round?.round_finalized || !round.show_ballot_summary_projection || !round.is_closed) return;
    const nextOn = !round.show_results_to_voters;
    if (nextOn) {
      const { data: activeGalleries } = await supabase
        .from("rounds")
        .select("id, title")
        .eq("show_final_gallery_projection", true)
        .neq("id", roundId)
        .limit(1);
      if (activeGalleries && activeGalleries.length > 0) {
        await supabase.from("rounds").update({ show_results_to_voters: false, show_final_gallery_projection: false, updated_at: new Date().toISOString() }).eq("id", activeGalleries[0].id);
        toast({ title: `Galería de "${activeGalleries[0].title}" cerrada`, description: "No puede haber dos galerías activas simultáneamente." });
      }
    }
    const { error } = await supabase.from("rounds").update({ show_results_to_voters: nextOn, show_final_gallery_projection: nextOn, updated_at: new Date().toISOString() }).eq("id", roundId);
    if (error) { toast({ title: "Error", description: "No se pudo actualizar la galería", variant: "destructive" }); return; }
    toast({ title: nextOn ? "Galería activada" : "Galería desactivada" });
    await loadRound();
  };

  const togglePublicCandidates = async () => {
    if (!roundId || !round) return;
    if (round.is_closed) {
      toast({ title: "Votación cerrada", description: "La lista pública no se puede reactivar tras confirmar selección.", variant: "destructive" });
      return;
    }
    const next = !round.public_candidates_enabled;
    const { error } = await supabase.from("rounds").update({ public_candidates_enabled: next, updated_at: new Date().toISOString() }).eq("id", roundId);
    if (error) { toast({ title: "Error", description: "No se pudo actualizar la visibilidad", variant: "destructive" }); return; }
    toast({ title: next ? "Lista pública activada" : "Lista pública desactivada" });
    await loadRound();
  };

  const pauseRound = async () => {
    if (!roundId || !canPauseRound) return;
    const { error } = await supabase.from("rounds").update({ is_voting_open: false, is_active: true, join_locked: true, updated_at: new Date().toISOString() }).eq("id", roundId);
    if (error) { toast({ title: "Error", description: "No se pudo pausar la ronda", variant: "destructive" }); return; }
    toast({ title: "Ronda en pausa" });
    await loadRound();
  };

  const resumeRound = async () => {
    if (!roundId || !canResumeRound) return;
    const { error } = await supabase.from("rounds").update({ is_voting_open: true, is_active: true, join_locked: true, updated_at: new Date().toISOString() }).eq("id", roundId);
    if (error) { toast({ title: "Error", description: "No se pudo reanudar la ronda", variant: "destructive" }); return; }
    toast({ title: "Ronda reanudada" });
    await loadRound();
  };

  const finalizeRound = async () => {
    if (!roundId || !round || !canFinalizeRound) return;
    if (round.census_mode === "exact" && currentRoundVotes < round.max_votantes) {
      toast({ title: "Censo exacto incompleto", description: `Faltan ${round.max_votantes - currentRoundVotes} votos.`, variant: "destructive" }); return;
    }
    const { error: processError } = await supabase.rpc("process_round_results", { p_round_id: roundId, p_round_number: round.current_round_number });
    if (processError) { toast({ title: "Error", description: "No se pudo finalizar la ronda", variant: "destructive" }); return; }
    const { error: updateError } = await supabase.from("rounds").update({ round_finalized: true, show_results_to_voters: false, show_ballot_summary_projection: false, is_voting_open: false, updated_at: new Date().toISOString() }).eq("id", roundId);
    if (updateError) { toast({ title: "Error", description: "No se pudo cerrar la ronda", variant: "destructive" }); return; }
    toast({ title: "Ronda finalizada", description: "Ya puedes publicar resultados o iniciar la siguiente ronda" });
    await loadRound();
    // Load inline results for the panel
    await loadInlineResults(round.current_round_number);
  };

  const forceSelectCandidate = async (candidateId: string) => {
    if (!roundId || !round) return;
    setForceSelectingId(candidateId);
    try {
      const { data, error } = await supabase.rpc("force_select_candidate", { p_candidate_id: candidateId });
      if (error || !data?.success) { toast({ title: "Error", description: "No se pudo seleccionar", variant: "destructive" }); return; }
      toast({ title: "Candidata seleccionada manualmente" });
      await loadRound();
      await loadInlineResults(round.current_round_number);
    } finally {
      setForceSelectingId(null);
    }
  };

  const startNextRound = async () => {
    if (!roundId || !canStartNextRound) return;
    const { data, error } = await supabase.rpc("start_new_round", { p_round_id: roundId });
    if (error) { toast({ title: "Error", description: "No se pudo iniciar la siguiente ronda", variant: "destructive" }); return; }
    const parsed = data as { round_number?: number };
    await supabase.from("rounds").update({ is_active: true, round_finalized: false, is_voting_open: true, join_locked: true, show_results_to_voters: false, show_ballot_summary_projection: false, updated_at: new Date().toISOString() }).eq("id", roundId);
    toast({ title: "Siguiente ronda iniciada", description: `Ronda ${parsed?.round_number || "nueva"} en curso` });
    await loadRound();
  };

  const saveConfig = async () => {
    if (!roundId || !round) return;
    setSavingConfig(true);
    try {
      const normalizedCode = configAccessCode.trim().toUpperCase();
      const nextAccessCode = ACCESS_CODE_REGEX.test(normalizedCode) ? normalizedCode : generateAccessCode();
      const nextMaxVotantes = isMaxVotantesLocked ? round.max_votantes : configMaxVotantes;
      if (nextAccessCode !== normalizedCode) setConfigAccessCode(nextAccessCode);
      if (nextMaxVotantes !== configMaxVotantes) setConfigMaxVotantes(nextMaxVotantes);
      const { error } = await supabase.from("rounds").update({ access_code: nextAccessCode, census_mode: configCensusMode, max_votantes: nextMaxVotantes, max_selected_candidates: configMaxSelected, max_votes_per_round: configMaxVotesPerRound, updated_at: new Date().toISOString() }).eq("id", roundId);
      if (error) throw error;
      toast({ title: "Configuración guardada" });
      await loadRound();
    } catch { toast({ title: "Error", description: "No se pudo guardar la configuración", variant: "destructive" });
    } finally { setSavingConfig(false); }
  };

  const exportBallotsCsv = async () => {
    if (!round || !roundId) return;
    const { data, error } = await supabase.from("votes").select("round_number,vote_hash,created_at,is_invalidated,invalidation_reason,candidate:candidates(name,surname)").eq("round_id", roundId).order("created_at", { ascending: true });
    if (error) { toast({ title: "Error", description: "No se pudo exportar el CSV", variant: "destructive" }); return; }
    const rows = (data || []) as unknown as VoteExportRow[];
    const grouped = new Map<string, VoteExportRow[]>();
    for (const row of rows) {
      const key = `${row.round_number}|${row.vote_hash || `${row.created_at}-${Math.random().toString(36).slice(2, 8)}`}`;
      const list = grouped.get(key) || [];
      list.push(row);
      grouped.set(key, list);
    }
    const header = ["votacion", "ronda", "codigo_papeleta", "voto_1", "voto_2", "voto_3", "en_blanco", "timestamp", "estado"];
    const csvLines = [header.map(csvEscape).join(",")];
    for (const [, ballotRows] of grouped) {
      const sorted = ballotRows.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const votes = sorted.map((item) => { const candidate = normalizeVoteCandidate(item.candidate); return candidate ? formatCandidateName(candidate) : "-"; });
      while (votes.length < 3) votes.push("-");
      const hasInvalidated = sorted.some((item) => item.is_invalidated);
      const first = sorted[0];
      const enBlanco = votes.every((v) => v === "-");
      csvLines.push([round.title, String(first.round_number), shortBallotCode(first.vote_hash), votes[0] || "-", votes[1] || "-", votes[2] || "-", enBlanco ? "true" : "false", first.created_at, hasInvalidated ? "invalidada" : "valida"].map((f) => csvEscape(f)).join(","));
    }
    const blob = new Blob(["﻿" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `papeletas_${round.title.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "CSV exportado" });
  };

  const copyText = useCallback(async (text: string, successDescription: string) => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); }
      else {
        const ta = document.createElement("textarea");
        ta.value = text;
        Object.assign(ta.style, { position: "fixed", top: "0", left: "0", width: "2em", height: "2em", padding: "0", border: "none", outline: "none", boxShadow: "none", background: "transparent" });
        ta.setAttribute("readonly", "true");
        document.body.appendChild(ta);
        ta.focus(); ta.select(); ta.setSelectionRange(0, 999999);
        const copied = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!copied) throw new Error("copy-failed");
      }
      toast({ title: "Copiado", description: successDescription });
    } catch { toast({ title: "No se pudo copiar", description: "Copia manualmente el contenido mostrado.", variant: "destructive" }); }
  }, [toast]);

  const copyPublicCandidatesLink = useCallback(async () => {
    if (publicCandidatesUrl) await copyText(publicCandidatesUrl, "Enlace público copiado.");
  }, [copyText, publicCandidatesUrl]);

  /* ── Candidate CRUD ── */

  const resetCandidateForm = () => setCandidateForm({ name: "", surname: "", location: "", group_name: "", age: "", description: "", image_url: "" });

  const openAddCandidateDialog = () => { setEditingCandidate(null); resetCandidateForm(); setIsAddCandidateOpen(true); };
  const openEditCandidateDialog = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    setCandidateForm({ name: candidate.name, surname: candidate.surname, location: candidate.location || "", group_name: candidate.group_name || "", age: candidate.age || "", description: candidate.description || "", image_url: candidate.image_url || "" });
    setIsEditCandidateOpen(true);
  };

  const addCandidate = async () => {
    if (!round) return;
    if (!candidateForm.name.trim() || !candidateForm.surname.trim()) { toast({ title: "Campos obligatorios", description: "El nombre y apellido son obligatorios", variant: "destructive" }); return; }
    const maxOrderIndex = Math.max(0, ...candidates.map((c) => c.order_index || 0));
    const { error } = await supabase.from("candidates").insert([{ round_id: round.id, name: candidateForm.name.trim(), surname: candidateForm.surname.trim(), location: candidateForm.location.trim() || null, group_name: candidateForm.group_name.trim() || null, age: typeof candidateForm.age === "number" ? candidateForm.age : null, description: candidateForm.description.trim() || null, image_url: candidateForm.image_url.trim() || null, order_index: maxOrderIndex + 1 }]);
    if (error) { toast({ title: "Error", description: "No se pudo añadir el candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato añadido" });
    setIsAddCandidateOpen(false);
    resetCandidateForm();
    await loadRound();
  };

  const updateCandidate = async () => {
    if (!editingCandidate) return;
    if (!candidateForm.name.trim() || !candidateForm.surname.trim()) { toast({ title: "Campos obligatorios", description: "El nombre y apellido son obligatorios", variant: "destructive" }); return; }
    const { error } = await supabase.from("candidates").update({ name: candidateForm.name.trim(), surname: candidateForm.surname.trim(), location: candidateForm.location.trim() || null, group_name: candidateForm.group_name.trim() || null, age: typeof candidateForm.age === "number" ? candidateForm.age : null, description: candidateForm.description.trim() || null, image_url: candidateForm.image_url.trim() || null, updated_at: new Date().toISOString() }).eq("id", editingCandidate.id);
    if (error) { toast({ title: "Error", description: "No se pudo editar el candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato actualizado" });
    setIsEditCandidateOpen(false);
    setEditingCandidate(null);
    resetCandidateForm();
    await loadRound();
  };

  const unselectCandidate = async (candidateId: string) => {
    const { error } = await supabase.rpc("unselect_candidate", { p_candidate_id: candidateId });
    if (error) { toast({ title: "Error", description: "No se pudo desmarcar al candidato", variant: "destructive" }); return; }

    // Check if we need to reopen the round (it was closed because quota was reached, but now it's not)
    if (roundId && round) {
      const { data: freshCandidates } = await supabase
        .from("candidates")
        .select("is_selected")
        .eq("round_id", roundId);
      const newSelectedCount = (freshCandidates || []).filter((c) => c.is_selected).length;
      const maxSelected = round.max_selected_candidates || 6;

      if (newSelectedCount < maxSelected && (round.is_closed || !round.is_active)) {
        // Reopen the round so the admin can continue with another round
        await supabase.from("rounds").update({
          is_closed: false,
          is_active: true,
          round_finalized: true,
          show_results_to_voters: false,
          show_ballot_summary_projection: false,
          show_final_gallery_projection: false,
          updated_at: new Date().toISOString(),
        }).eq("id", roundId);
        toast({ title: "Candidato desmarcado", description: "La ronda se ha reabierto. Puedes continuar con otra ronda." });
        await loadRound();
        return;
      }
    }

    toast({ title: "Candidato desmarcado" });
    await loadRound();
  };

  const quickSelectCandidate = async (candidateId: string) => {
    setCandidateToSelect(null);
    const { data, error } = await supabase.rpc("force_select_candidate", { p_candidate_id: candidateId });
    if (error || !data?.success) { toast({ title: "Error", description: "No se pudo seleccionar al candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato seleccionado", description: "Añadido directamente a la lista de seleccionados." });
    await loadRound();
  };

  const deleteCandidate = async (candidateId: string) => {
    setCandidateToDelete(null);
    const { error } = await supabase.from("candidates").delete().eq("id", candidateId);
    if (error) { toast({ title: "Error", description: "No se pudo eliminar el candidato", variant: "destructive" }); return; }
    toast({ title: "Candidato eliminado" });
    await loadRound();
  };

  /* ── Import ── */

  const parseCSV = (text: string): ImportCandidate[] => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const candidate: ImportCandidate = { name: "", surname: "", location: "", group_name: "", age: null, description: "", image_url: "" };
      headers.forEach((header, index) => { const value = values[index] || ""; if (header === "age") { candidate.age = value ? Number(value) : null; } else if (header in candidate) { (candidate as Record<string, string | number | null>)[header] = value; } });
      return candidate;
    });
  };

  const parseXML = (text: string): ImportCandidate[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const parsedCandidates = xmlDoc.getElementsByTagName("candidate");
    return Array.from(parsedCandidates).map((candidate) => {
      const getTagValue = (tagName: string) => { const el = candidate.getElementsByTagName(tagName)[0]; return el ? el.textContent || "" : ""; };
      return { name: getTagValue("name"), surname: getTagValue("surname"), location: getTagValue("location"), group_name: getTagValue("group_name"), age: getTagValue("age") ? Number(getTagValue("age")) : null, description: getTagValue("description"), image_url: getTagValue("image_url") };
    });
  };

  const parseJSON = (text: string): ImportCandidate[] => { const payload = JSON.parse(text); return payload.candidates || payload; };

  const importCandidates = async (file: File) => {
    if (!round) return;
    try {
      setImportingFile(true);
      const text = await file.text();
      let candidatesData: ImportCandidate[] = [];
      if (file.name.endsWith(".csv")) { candidatesData = parseCSV(text); }
      else if (file.name.endsWith(".xml")) { candidatesData = parseXML(text); }
      else if (file.name.endsWith(".json")) { candidatesData = parseJSON(text); }
      else { throw new Error("Formato no soportado. Usa CSV, XML o JSON."); }
      const maxOrderIndex = Math.max(0, ...candidates.map((c) => c.order_index || 0));
      let errorCount = 0;
      const rows = candidatesData.reduce<object[]>((acc, candidate, i) => {
        if (!candidate.name?.trim() || !candidate.surname?.trim()) { errorCount++; return acc; }
        acc.push({ round_id: round.id, name: candidate.name.trim(), surname: candidate.surname.trim(), location: candidate.location?.trim() || null, group_name: candidate.group_name?.trim() || null, age: typeof candidate.age === "number" ? candidate.age : null, description: candidate.description?.trim() || null, image_url: candidate.image_url?.trim() || null, order_index: maxOrderIndex + i + 1 });
        return acc;
      }, []);
      if (rows.length > 0) {
        const { error } = await supabase.from("candidates").insert(rows);
        if (error) throw error;
      }
      toast({ title: "Importación completada", description: `${rows.length} candidatos importados${errorCount > 0 ? `. ${errorCount} filas con error.` : "."}` });
      setIsImportOpen(false);
      await loadRound();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo importar el archivo", variant: "destructive" });
    } finally { setImportingFile(false); }
  };

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { importCandidates(file); event.target.value = ""; }
  };

  const loadDataset = async () => {
    if (!import.meta.env.DEV || !round) return;
    const selectedDataset = testDatasets.find((d) => d.id === selectedDatasetId);
    if (!selectedDataset) { toast({ title: "Dataset no válido", variant: "destructive" }); return; }
    try {
      setLoadingDataset(true);
      const maxOrderIndex = Math.max(0, ...candidates.map((c) => c.order_index || 0));
      const rows = selectedDataset.candidates.map((candidate, index) => ({ round_id: round.id, name: candidate.name.trim(), surname: candidate.surname.trim(), location: candidate.location?.trim() || null, group_name: candidate.group_name?.trim() || null, age: typeof candidate.age === "number" ? candidate.age : null, description: candidate.description?.trim() || null, image_url: candidate.image_url?.trim() || null, order_index: maxOrderIndex + index + 1 }));
      const { error } = await supabase.from("candidates").insert(rows);
      if (error) throw error;
      toast({ title: "Dataset importado", description: `${rows.length} candidatos añadidos` });
      setIsDatasetOpen(false);
      await loadRound();
    } catch { toast({ title: "Error", description: "No se pudo cargar el dataset", variant: "destructive" });
    } finally { setLoadingDataset(false); }
  };

  const openComunicaImport = () => { if (round) navigate(`/comunica?round=${round.id}`); };

  /* ── Loading / Not found ── */

  if (loading) {
    return (
      <div className="avd-app" style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, border: `2px solid var(--avd-border)`, borderTop: `2px solid var(--avd-brand)`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 13, color: "var(--avd-fg-muted)", fontFamily: "var(--avd-font-sans)" }}>Cargando votación...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="avd-app" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="avd-live-card" style={{ maxWidth: 400, textAlign: "center", gap: 8 }}>
          <p style={{ color: "var(--avd-fg)", fontWeight: 600, margin: 0 }}>Votación no encontrada</p>
          <p style={{ color: "var(--avd-fg-muted)", fontSize: 13, margin: 0 }}>No se encontró la votación solicitada.</p>
          <button className="avd-btn avd-btn-sm" onClick={() => navigate("/admin/votaciones")} style={{ marginTop: 4 }}>
            <ArrowLeft size={13} /> Volver
          </button>
        </div>
      </div>
    );
  }

  const occupiedPct = seatStatus && round.max_votantes > 0 ? Math.min(Math.round((seatStatus.occupied_seats / round.max_votantes) * 100), 100) : 0;
  const votesPct = round.max_votantes > 0 ? Math.round((currentRoundVotes / round.max_votantes) * 100) : 0;

  /* ── Render ── */

  return (
    <div className="avd-app">

      {/* ═══ Topbar ═══ */}
      <header className="avd-topbar">
        <div className="avd-topbar-brand">
          <div className="avd-brand-mark">C</div>
          <span>VotacionesMCM</span>
        </div>
        <div className="avd-topbar-spacer" />
        <span className="avd-chip avd-chip-mono avd-chip-muted">
          {new Date(now).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <button
          className="avd-btn avd-btn-ghost avd-btn-icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title="Cambiar tema"
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </header>

      {/* ═══ Page header ═══ */}
      <section className="avd-page-header">

        {/* Row 1: nav + actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <button className="avd-btn avd-btn-sm avd-btn-ghost" onClick={() => navigate("/admin/votaciones")}>
            <ArrowLeft size={13} /> Volver a votaciones
          </button>
          <div className="avd-header-actions">
            <button className="avd-btn avd-btn-sm" onClick={openAnalyticsDialog}>
              <BarChart2 size={14} /> Análisis
            </button>
            <button className="avd-btn avd-btn-sm" onClick={openBallotsDialog}>
              <Download size={14} /> Papeletas
            </button>
            <button className="avd-btn avd-btn-sm" onClick={exportBallotsCsv}>
              <Download size={14} /> CSV
            </button>
            <button className="avd-btn avd-btn-sm" onClick={() => setIsSettingsOpen(true)}>
              <Settings2 size={14} /> Ajustes
            </button>
            <a className="avd-btn avd-btn-sm avd-btn-primary" href="/proyeccion" target="_blank" rel="noreferrer">
              Proyección <ArrowUpRight size={14} />
            </a>
          </div>
        </div>

        {/* Row 2: Title */}
        <h1 style={{ fontFamily: "var(--avd-font-sans)", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px", lineHeight: 1.1, color: "var(--avd-fg)" }}>
          {round.title}
        </h1>

        {/* Row 3: Meta chips */}
        <div className="avd-page-meta" style={{ marginBottom: 14 }}>
          <span className={`avd-chip ${statusChip.cls}`} style={{ height: 24, fontSize: 12 }}>
            {round.is_voting_open && <span className="avd-pulse-dot" style={{ marginRight: 2 }} />}
            {statusChip.txt}
          </span>
          <span className="avd-chip avd-chip-muted">Ronda {round.current_round_number}</span>
          <TeamChip label={round.voting_type_name || round.team} />
          {round.year && <span className="avd-chip avd-chip-muted">{round.year}</span>}
          <span className="avd-chip avd-chip-mono" title="Código de acceso" style={{ gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--avd-brand)", flexShrink: 0, display: "inline-block" }} />
            {round.access_code || "––––"}
            <button
              onClick={() => copyText(round.access_code || "", "Código copiado")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", color: "var(--avd-fg-faint)" }}
            >
              <Copy size={10} />
            </button>
          </span>
          {round.description && (
            <span style={{ fontSize: 12, color: "var(--avd-fg-muted)", marginLeft: 2 }}>· {round.description}</span>
          )}
        </div>

        {/* Workflow Rail */}
        <div className="avd-wf-rail">
          <div className="avd-wf-steps">
            {WORKFLOW_STEPS.map((s, i) => {
              const status = i < stage ? "done" : i === stage ? "current" : "pending";
              return (
                <div key={s.id} className={`avd-wf-step ${status}`}>
                  <div className="avd-wf-bullet">
                    {status === "done" ? <Check size={12} /> : i + 1}
                  </div>
                  <div className="avd-wf-text">
                    <div className="avd-wf-label">{s.label}</div>
                    <div className="avd-wf-sub">
                      {status === "done" ? "Hecho" : status === "current" ? "Siguiente paso" : s.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="avd-wf-cta">
            <button
              className="avd-btn avd-btn-primary avd-btn-primary-lg"
              onClick={runProjectionWorkflowStep}
              disabled={workflowActionDisabled}
            >
              {isWorkflowRunning
                ? <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
                : workflowActionLabel === "Abrir sala" || workflowActionLabel === "Iniciar votación"
                ? <Play size={16} />
                : <StepForward size={16} />}
              {isWorkflowRunning ? "Procesando..." : workflowActionLabel}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Round Results Panel (post-finalize) ═══ */}
      {round.round_finalized && !round.is_closed && inlineResults.length > 0 && (() => {
        const totalBallots = Math.max(...inlineResults.map(r => r.vote_count), 1);
        const tiedCandidates = inlineResults.filter(r => !r.has_majority && r.vote_count > 0 && !r.is_selected);
        const hasTie = tiedCandidates.length >= 2 && tiedCandidates[0]?.vote_count === tiedCandidates[1]?.vote_count;
        const nobodyHasMajority = inlineResults.every(r => !r.has_majority);
        return (
          <section style={{ padding: "0 var(--avd-page-px, 24px)", marginBottom: 16 }}>
            <div style={{
              border: nobodyHasMajority ? "1px solid color-mix(in oklch, var(--avd-warn) 40%, transparent)" : "1px solid color-mix(in oklch, var(--avd-ok) 40%, transparent)",
              background: nobodyHasMajority ? "color-mix(in oklch, var(--avd-warn) 6%, var(--avd-bg))" : "color-mix(in oklch, var(--avd-ok) 6%, var(--avd-bg))",
              borderRadius: "var(--avd-radius-lg, 14px)",
              overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{
                padding: "14px 18px",
                borderBottom: "1px solid color-mix(in oklch, var(--avd-border) 50%, transparent)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                {nobodyHasMajority ? <AlertTriangle size={18} style={{ color: "var(--avd-warn)", flexShrink: 0 }} /> : <CheckCircle size={18} style={{ color: "var(--avd-ok)", flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--avd-fg)" }}>
                    {hasTie
                      ? `${tiedCandidates.length} candidatas empatadas al ${tiedCandidates[0]?.percentage.toFixed(0)}% (Canon 119: hace falta mayoría estricta >50%)`
                      : nobodyHasMajority
                      ? "Ninguna candidata alcanzó la mayoría absoluta (>50%)"
                      : "Resultados de la ronda"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--avd-fg-muted)", marginTop: 2 }}>
                    {nobodyHasMajority
                      ? "Puedes forzar su selección manualmente o pasar a la siguiente ronda."
                      : "Las candidatas con mayoría han sido seleccionadas automáticamente."}
                  </div>
                </div>
              </div>

              {/* Candidate rows */}
              <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                {inlineResults.map((r) => (
                  <div key={r.candidate_id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                    borderRadius: "var(--avd-radius-md, 10px)",
                    background: r.is_selected ? "color-mix(in oklch, var(--avd-ok) 10%, transparent)" : "color-mix(in oklch, var(--avd-bg) 80%, transparent)",
                    border: r.is_selected ? "1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)" : "1px solid var(--avd-border-soft)",
                  }}>
                    <div style={{ flexGrow: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--avd-fg)", display: "flex", alignItems: "center", gap: 8 }}>
                        {formatCandidateName({ name: r.candidate_name, surname: r.candidate_surname })}
                        {r.is_selected && <span className="avd-chip avd-chip-ok" style={{ height: 18, fontSize: 10 }}>Seleccionada</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--avd-fg-muted)", marginTop: 2 }}>
                        {r.vote_count}/{currentRoundVotes || totalBallots} votos · {r.percentage.toFixed(2)}%
                      </div>
                    </div>
                    {!r.is_selected && !selectionQuotaReached && (
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button
                          className="avd-btn avd-btn-sm"
                          style={{ background: "var(--avd-ok)", color: "white", borderColor: "var(--avd-ok)" }}
                          onClick={(e) => { e.stopPropagation(); forceSelectCandidate(r.candidate_id); }}
                          disabled={forceSelectingId === r.candidate_id}
                        >
                          <Check size={13} /> Aceptar
                        </button>
                      </div>
                    )}
                    {r.is_selected && (
                      <button
                        className="avd-btn avd-btn-sm avd-btn-ghost"
                        onClick={(e) => { e.stopPropagation(); unselectCandidate(r.candidate_id); }}
                        title="Quitar selección"
                      >
                        <Undo2 size={13} /> Quitar
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer action */}
              {!selectionQuotaReached && canStartNextRound && (
                <div style={{ padding: "10px 14px 14px", borderTop: "1px solid color-mix(in oklch, var(--avd-border) 50%, transparent)" }}>
                  <button
                    className="avd-btn avd-btn-block avd-btn-primary"
                    onClick={startNextRound}
                    disabled={isWorkflowRunning}
                    style={{ fontWeight: 600 }}
                  >
                    <RefreshCw size={14} /> Siguiente ronda sin seleccionar a nadie
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ═══ Main grid ═══ */}
      <div className="avd-page-main">

        {/* ── Left aside: Info + Conexiones ── */}
        <aside className="avd-col avd-col-left">
          <div style={{ padding: "14px 16px 8px", borderBottom: "1px solid var(--avd-border-soft)" }}>
            <h3 className="avd-section-title" style={{ margin: 0 }}>
              Información
              <span className="avd-hint">
                <span className="avd-pulse-dot" style={{ width: 6, height: 6 }} /> En vivo
              </span>
            </h3>
          </div>
          <div className="avd-kpi-panel">
            <div className="avd-kpi-stack">
              <div className="avd-kpi">
                <div className="avd-kpi-label">Candidatas</div>
                <div className="avd-kpi-value avd-tabular">{activeCandidatesCount}</div>
                <div className="avd-kpi-meta">
                  {candidates.length - activeCandidatesCount} eliminadas
                </div>
              </div>
              <div className="avd-kpi" data-accent={round.census_mode === "exact" ? "warn" : undefined}>
                <div className="avd-kpi-label">Censo</div>
                <div className="avd-kpi-value avd-tabular">
                  {round.max_votantes}
                </div>
                <div className="avd-kpi-meta">
                  {round.census_mode === "exact" ? "Exacto" : "Máximo"}
                </div>
              </div>
              <div className="avd-kpi" data-accent={isProjectingSomething ? "brand" : undefined}>
                <div className="avd-kpi-label">Proyección</div>
                <div className="avd-kpi-value" style={{ fontSize: 16 }}>{projLabel}</div>
                <div className="avd-kpi-meta">{isProjectingSomething ? "En pantalla" : "Sin difundir"}</div>
              </div>
            </div>
          </div>

          {/* Conexiones en vivo */}
          <div style={{ borderTop: "1px solid var(--avd-border-soft)", padding: "14px 16px 8px" }}>
            <h3 className="avd-section-title" style={{ margin: "0 0 10px" }}>
              Conexiones
              <span className="avd-hint">
                <span className="avd-pulse-dot" style={{ width: 6, height: 6 }} /> Tiempo real
              </span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div className="avd-meter-label">
                  <span>Ocupación</span>
                  <span className="avd-val">{seatStatus?.occupied_seats ?? 0} / {round.max_votantes}</span>
                </div>
                <div className="avd-meter">
                  <div className="avd-meter-fill avd-ok" style={{ width: `${Math.min(occupiedPct, 100)}%` }} />
                </div>
              </div>
              {round.is_voting_open && (
                <div>
                  <div className="avd-meter-label">
                    <span>Votos R{round.current_round_number}</span>
                    <span className="avd-val">{currentRoundVotes} / {round.max_votantes}</span>
                  </div>
                  <div className="avd-meter">
                    <div className="avd-meter-fill" style={{ width: `${Math.min(votesPct, 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="avd-seat-grid">
                <div className="avd-seat-stat">
                  <div className="avd-n avd-ok">{seatStatus?.occupied_seats ?? 0}</div>
                  <div className="avd-l">Ocupados</div>
                </div>
                <div className="avd-seat-stat">
                  <div className="avd-n avd-warn">{seatStatus?.expired_seats ?? 0}</div>
                  <div className="avd-l">Expirados</div>
                </div>
                <div className="avd-seat-stat">
                  <div className="avd-n">{seatStatus?.available_seats ?? 0}</div>
                  <div className="avd-l">Libres</div>
                </div>
              </div>
              <div>
                <div className="avd-meter-label" style={{ marginBottom: 6 }}>
                  <span>Sesiones ({seats.length})</span>
                  <span style={{ color: "var(--avd-fg-faint)", fontSize: 11 }}>
                    {round.join_locked ? "Bloqueada" : "Abierta"}
                  </span>
                </div>
                <div className="avd-seats-list">
                  {seats.length === 0 ? (
                    <p style={{ padding: "12px", textAlign: "center", fontSize: 12, color: "var(--avd-fg-muted)", margin: 0 }}>
                      Sin conexiones.
                    </p>
                  ) : (
                    seats.slice(0, 12).map((s) => (
                      <div key={s.id} className="avd-seat-row">
                        <span className="avd-sid">{s.browser_instance_id.slice(0, 10)}</span>
                        <span className={`avd-sst ${s.estado === "ocupado" ? "avd-ok" : s.estado === "expirado" ? "avd-exp" : "avd-free"}`}>
                          {s.estado}
                        </span>
                        <span className="avd-st">
                          {new Date(s.last_seen_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Center: Candidates ── */}
        <main className="avd-col avd-col-main">
          <div className="avd-col-inner">
            <div className="avd-candidates-pane">
              <div className="avd-candidates-head">
                  <div className="avd-candidates-head-left">
                    <h2>Candidatas</h2>
                    <span className="avd-counts">
                      {selectedCandidatesCount} seleccionadas · {activeCandidatesCount} activas
                    </span>
                  </div>
                  <div className="avd-candidates-head-right">
                    <div className="avd-segmented">
                      <button className={candidateView === "list" ? "active" : ""} onClick={() => setCandidateView("list")}>
                        <List size={13} /> Lista
                      </button>
                      <button className={candidateView === "grid" ? "active" : ""} onClick={() => setCandidateView("grid")}>
                        <Grid size={13} /> Tarjetas
                      </button>
                    </div>
                    <div className="avd-search-wrap" style={{ width: 180 }}>
                      <Search size={14} />
                      <input
                        className="avd-input"
                        placeholder="Buscar candidata..."
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                      />
                    </div>
                    {!isVotingStarted && (
                      <>
                        <button className="avd-btn avd-btn-sm" onClick={openAddCandidateDialog}>
                          <UserPlus size={14} /> Añadir
                        </button>
                        <button className="avd-btn avd-btn-sm" onClick={() => setIsImportOpen(true)}>
                          <Upload size={14} /> Importar
                        </button>
                        <button className="avd-btn avd-btn-sm" onClick={openComunicaImport}>
                          <ArrowUpRight size={14} /> Comunica
                        </button>
                        {import.meta.env.DEV && (
                          <button className="avd-btn avd-btn-sm" onClick={() => setIsDatasetOpen(true)}>
                            <Download size={14} /> Dataset
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="avd-candidates-shell" ref={candidatesRef}>
                  {filteredCandidates.length === 0 ? (
                    <div className="avd-empty">
                      <UserPlus size={28} />
                      <p className="avd-empty-title">Sin candidatas</p>
                      <p className="avd-empty-sub">Usa Añadir o Importar para comenzar.</p>
                    </div>
                  ) : candidateView === "list" ? (
                    filteredCandidates.map((c) => (
                      <div
                        key={c.id}
                        className={`avd-cand-row ${c.is_selected ? "avd-is-selected" : ""} ${c.is_eliminated ? "avd-is-eliminated" : ""}`}
                      >
                        <div className="avd-cand-avatar">{initials(c)}</div>
                        <div className="avd-cand-info">
                          <div className="avd-cand-name">{formatCandidateName(c)}</div>
                          <div className="avd-cand-meta">
                            {c.location || "Sin ubicación"}
                            {c.group_name && <> · {c.group_name}</>}
                            {c.age && <> · {c.age} años</>}
                          </div>
                        </div>
                        <div className="avd-cand-badges">
                          {c.is_selected && <span className="avd-chip avd-chip-ok" style={{ height: 20, fontSize: 11 }}>Seleccionada</span>}
                          {c.is_eliminated && <span className="avd-chip avd-chip-bad" style={{ height: 20, fontSize: 11 }}>Eliminada</span>}
                        </div>
                        <div className="avd-cand-actions">
                          <button
                            className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                            onClick={() => openEditCandidateDialog(c)}
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          {!c.is_selected && !c.is_eliminated && (
                            <button
                              className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                              onClick={() => setCandidateToSelect(c)}
                              title="Añadir a seleccionados directamente"
                            >
                              <UserPlus size={13} />
                            </button>
                          )}
                          {c.is_selected && (
                            <button
                              className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                              onClick={() => setCandidateToUnselect(c)}
                              title="Deshacer selección"
                            >
                              <Undo2 size={13} />
                            </button>
                          )}
                          {!isVotingStarted && (
                            <button
                              className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                              onClick={() => setCandidateToDelete(c)}
                              title="Eliminar"
                              style={{ color: "var(--avd-fg-faint)" }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--avd-bad)")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--avd-fg-faint)")}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="avd-cand-grid">
                      {filteredCandidates.map((c) => (
                        <div
                          key={c.id}
                          className={`avd-cand-card ${c.is_selected ? "avd-is-selected" : ""} ${c.is_eliminated ? "avd-is-eliminated" : ""}`}
                        >
                          <div className="avd-cand-card-head">
                            <div className="avd-cand-card-avatar">{initials(c)}</div>
                            <div className="avd-cand-card-body">
                              <div className="avd-cand-card-name">{formatCandidateName(c)}</div>
                              <div className="avd-cand-card-meta">
                                {c.location}{c.age && ` · ${c.age}a`}
                              </div>
                            </div>
                          </div>
                          {c.group_name && (
                            <div style={{ fontSize: 11.5, color: "var(--avd-fg-muted)" }}>{c.group_name}</div>
                          )}
                          <div className="avd-cand-card-foot">
                            <div style={{ display: "flex", gap: 4 }}>
                              {c.is_selected && <span className="avd-chip avd-chip-ok" style={{ height: 20, fontSize: 11 }}>Seleccionada</span>}
                              {c.is_eliminated && <span className="avd-chip avd-chip-bad" style={{ height: 20, fontSize: 11 }}>Eliminada</span>}
                            </div>
                            <div style={{ display: "flex", gap: 2 }}>
                              <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => openEditCandidateDialog(c)} title="Editar">
                                <Pencil size={13} />
                              </button>
                              {!c.is_selected && !c.is_eliminated && (
                                <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => setCandidateToSelect(c)} title="Añadir a seleccionados directamente">
                                  <UserPlus size={13} />
                                </button>
                              )}
                              {c.is_selected && (
                                <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => setCandidateToUnselect(c)} title="Deshacer selección">
                                  <Undo2 size={13} />
                                </button>
                              )}
                              {!isVotingStarted && (
                                <button className="avd-btn avd-btn-ghost avd-btn-icon-sm" onClick={() => setCandidateToDelete(c)} title="Eliminar">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
        </main>

        {/* ── Right: Controls ── */}
        <aside className="avd-col avd-col-right">
          <div className="avd-col-inner">

            {/* Operational controls */}
            <div>
              <h3 className="avd-section-title">Control operativo</h3>
              <div className="avd-live-card">
                {round.is_active && !round.round_finalized && !round.is_closed && (
                  <button
                    className={`avd-btn avd-btn-block ${canPauseRound ? "avd-btn-warn" : ""}`}
                    onClick={canPauseRound ? pauseRound : resumeRound}
                    disabled={!canPauseRound && !canResumeRound}
                  >
                    {canPauseRound ? <><Pause size={14} /> Pausar participación</> : <><Play size={14} /> Reanudar participación</>}
                  </button>
                )}
                {canCloseRoom && (
                  <button className="avd-btn avd-btn-block" onClick={callCloseRoom}>
                    <XCircle size={14} /> Cerrar sala
                  </button>
                )}
                <div className="avd-proj-toggle">
                  <div className="avd-label-row">
                    <Globe size={14} />
                    <div>Lista pública</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      className="avd-btn avd-btn-ghost avd-btn-icon-sm"
                      onClick={copyPublicCandidatesLink}
                      disabled={!publicCandidatesUrl}
                      title="Copiar enlace"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      className={`avd-switch ${round.public_candidates_enabled ? "on" : ""}`}
                      onClick={togglePublicCandidates}
                      disabled={round.is_closed}
                      title={round.is_closed ? "No disponible con votación cerrada" : undefined}
                    />
                  </div>
                </div>
                {round.round_finalized && round.show_ballot_summary_projection && round.is_closed && (
                  <div className="avd-proj-toggle">
                    <div className="avd-label-row">
                      <Sparkles size={14} />
                      <div>
                        <div>Galería final</div>
                        <div className="avd-sub">{round.show_results_to_voters ? "Visible para votantes" : "Oculta"}</div>
                      </div>
                    </div>
                    <button
                      className={`avd-switch ${round.show_results_to_voters ? "on" : ""}`}
                      onClick={toggleGallery}
                    />
                  </div>
                )}
                {round.round_finalized && !round.is_closed && !selectionQuotaReached && canStartNextRound && (
                  <button className="avd-btn avd-btn-block avd-btn-primary" onClick={startNextRound} disabled={isWorkflowRunning}>
                    <RefreshCw size={14} /> Siguiente ronda (sin seleccionar a nadie)
                  </button>
                )}
                {!round.is_closed && (
                  <button className="avd-btn avd-btn-block avd-btn-danger" onClick={() => setIsCloseRoundConfirmOpen(true)}>
                    <XCircle size={14} /> Cerrar definitivamente
                  </button>
                )}
              </div>
            </div>

          </div>
        </aside>
      </div>

      {/* ═══ Dialogs ═══ */}

      {/* Room conflict dialog */}
      {salaConflict && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setSalaConflict(null); }}>
          <div className="avd-dialog" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>Sala activa detectada</h2>
              <p>Ya existe otra sala activa: <strong>{salaConflict.title}</strong>.</p>
            </div>
            <div className="avd-dialog-body">
              <p style={{ fontSize: 13, color: "var(--avd-fg-muted)", margin: 0 }}>
                No pueden haber dos salas activas simultáneamente. ¿Quieres pausar «{salaConflict.title}» y activar esta sala?
              </p>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setSalaConflict(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={resolveRoomConflict}>
                Pausar sala activa y continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {isSettingsOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsSettingsOpen(false); }}>
          <div className="avd-dialog" style={{ maxWidth: 660 }} onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2>Configuración de la votación</h2>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsSettingsOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <div className="avd-form-field">
                  <label className="avd-label">Código de acceso</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      className="avd-input"
                      value={configAccessCode}
                      maxLength={4}
                      onChange={(e) => setConfigAccessCode(e.target.value.toUpperCase())}
                      style={{ fontFamily: "var(--avd-font-mono)", letterSpacing: "0.12em", fontWeight: 700 }}
                    />
                    <button className="avd-btn avd-btn-sm" onClick={() => setConfigAccessCode(generateAccessCode())} style={{ flexShrink: 0 }}>
                      <RefreshCw size={13} /> Generar
                    </button>
                  </div>
                </div>
                <div className="avd-form-field">
                  <label className="avd-label">Modo de censo</label>
                  <select className="avd-select" value={configCensusMode} onChange={(e) => setConfigCensusMode(e.target.value as "maximum" | "exact")}>
                    <option value="maximum">Máximo (inicio manual)</option>
                    <option value="exact">Exacto (conectados = cupo)</option>
                  </select>
                </div>
                </div>

                {round.voting_type_name && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: "var(--avd-radius-sm)", background: "var(--avd-brand-bg)", border: "1px solid var(--avd-brand-border)", fontSize: 13 }}>
                    <span style={{ color: "var(--avd-fg-muted)" }}>Tipo base:</span>
                    <span className="avd-chip avd-chip-brand" style={{ height: 20, fontSize: 11 }}>{round.voting_type_name}</span>
                    <span style={{ fontSize: 12, color: "var(--avd-fg-faint)" }}>Los valores se pueden ajustar sin cambiar el tipo.</span>
                  </div>
                )}
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, alignItems: "start" }}>
                  <div className="avd-form-field">
                    <label className="avd-label">Nº máx. votantes {isMaxVotantesLocked && <span className="avd-chip avd-chip-muted" style={{ marginLeft: 6 }}>Bloqueado</span>}</label>
                    <input
                      className="avd-input"
                      type="number"
                      min={1}
                      max={9999}
                      value={configMaxVotantes}
                      onChange={(e) => setConfigMaxVotantes(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isMaxVotantesLocked}
                      style={isMaxVotantesLocked ? { background: "var(--avd-bg-sunken)", color: "var(--avd-fg-muted)" } : undefined}
                    />
                    {isMaxVotantesLocked && <p style={{ fontSize: 11, color: "var(--avd-fg-faint)", marginTop: 3 }}>Se puede configurar solo antes de abrir la sala.</p>}
                  </div>
                  
                  <div className="avd-form-field">
                    <label className="avd-label">Total a seleccionar {isVotingStarted && <span className="avd-chip avd-chip-muted" style={{ marginLeft: 6 }}>Bloqueado</span>}</label>
                    <input
                      className="avd-input"
                      type="number"
                      min={1}
                      max={100}
                      value={configMaxSelected}
                      onChange={(e) => setConfigMaxSelected(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isVotingStarted}
                      style={isVotingStarted ? { background: "var(--avd-bg-sunken)", color: "var(--avd-fg-muted)" } : undefined}
                    />
                    {isVotingStarted && <p style={{ fontSize: 11, color: "var(--avd-fg-faint)", marginTop: 3 }}>No editable con votación en curso.</p>}
                  </div>
                  
                  <div className="avd-form-field">
                    <label className="avd-label">Máx. votos por ronda</label>
                    <input
                      className="avd-input"
                      type="number"
                      min={0}
                      max={100}
                      value={configMaxVotesPerRound}
                      onChange={(e) => setConfigMaxVotesPerRound(Math.max(0, parseInt(e.target.value) || 0))}
                    />
                    <p style={{ fontSize: 11, color: "var(--avd-fg-faint)", marginTop: 3 }}>
                      0 = sin límite fijo (máx. 3 por lógica automática).
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsSettingsOpen(false)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={saveConfig} disabled={savingConfig}>
                {savingConfig ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics */}
      {isAnalyticsOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsAnalyticsOpen(false); }}>
          <div
            className="avd-dialog avd-dialog-wide"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="avd-dialog-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2>Análisis de resultados</h2>
                <p>Distribución de votos por ronda.</p>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsAnalyticsOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body" style={{ height: "calc(90vh - 80px)" }}>
              <ResultsAnalytics lockedRoundId={round.id} />
            </div>
          </div>
        </div>
      )}

      {/* Ballots */}
      {isBallotsOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsBallotsOpen(false); }}>
          <div
            className="avd-dialog avd-dialog-wide"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="avd-dialog-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <h2>Revisión de papeletas</h2>
                <p>Ronda {round.current_round_number} · papeletas emitidas anónimamente.</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="avd-btn avd-btn-sm" onClick={exportBallotsCsv}>
                  <Download size={13} /> Exportar CSV
                </button>
                <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsBallotsOpen(false)}>
                  <XCircle size={14} />
                </button>
              </div>
            </div>
            <div className="avd-dialog-body" style={{ height: "calc(90vh - 80px)" }}>
              <BallotReview lockedRoundId={round.id} showHeader={false} />
            </div>
          </div>
        </div>
      )}

      {/* Add candidate */}
      {isAddCandidateOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsAddCandidateOpen(false); }}>
          <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2>Añadir candidata</h2>
                <p>Completa los datos principales. Podrás editar después.</p>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsAddCandidateOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body">
              <div className="avd-form-grid">
                <div className="avd-form-grid avd-form-grid-2">
                  <div className="avd-form-field">
                    <label className="avd-label">Nombre</label>
                    <input className="avd-input" value={candidateForm.name} onChange={(e) => setCandidateForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="avd-form-field">
                    <label className="avd-label">Apellidos</label>
                    <input className="avd-input" value={candidateForm.surname} onChange={(e) => setCandidateForm((p) => ({ ...p, surname: e.target.value }))} />
                  </div>
                </div>
                <div className="avd-form-grid avd-form-grid-2">
                  <div className="avd-form-field">
                    <label className="avd-label">Ubicación</label>
                    <input className="avd-input" value={candidateForm.location} onChange={(e) => setCandidateForm((p) => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div className="avd-form-field">
                    <label className="avd-label">Grupo / Comunidad</label>
                    <input className="avd-input" value={candidateForm.group_name} onChange={(e) => setCandidateForm((p) => ({ ...p, group_name: e.target.value }))} />
                  </div>
                </div>
                <div className="avd-form-field">
                  <label className="avd-label">Descripción</label>
                  <textarea className="avd-textarea" value={candidateForm.description} onChange={(e) => setCandidateForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsAddCandidateOpen(false)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={addCandidate}>Guardar candidata</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit candidate */}
      {isEditCandidateOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsEditCandidateOpen(false); }}>
          <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2>Editar candidata</h2>
                <p>Actualiza los datos de la candidata seleccionada.</p>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsEditCandidateOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body">
              <div className="avd-form-grid">
                <div className="avd-form-grid avd-form-grid-2">
                  <div className="avd-form-field">
                    <label className="avd-label">Nombre</label>
                    <input className="avd-input" value={candidateForm.name} onChange={(e) => setCandidateForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="avd-form-field">
                    <label className="avd-label">Apellidos</label>
                    <input className="avd-input" value={candidateForm.surname} onChange={(e) => setCandidateForm((p) => ({ ...p, surname: e.target.value }))} />
                  </div>
                </div>
                <div className="avd-form-grid avd-form-grid-2">
                  <div className="avd-form-field">
                    <label className="avd-label">Ubicación</label>
                    <input className="avd-input" value={candidateForm.location} onChange={(e) => setCandidateForm((p) => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div className="avd-form-field">
                    <label className="avd-label">Grupo / Comunidad</label>
                    <input className="avd-input" value={candidateForm.group_name} onChange={(e) => setCandidateForm((p) => ({ ...p, group_name: e.target.value }))} />
                  </div>
                </div>
                <div className="avd-form-field">
                  <label className="avd-label">Descripción</label>
                  <textarea className="avd-textarea" value={candidateForm.description} onChange={(e) => setCandidateForm((p) => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsEditCandidateOpen(false)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={updateCandidate}>Guardar cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* Import file */}
      {isImportOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsImportOpen(false); }}>
          <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2>Importar candidatos</h2>
                <p>Sube un archivo CSV, XML o JSON con los candidatos.</p>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsImportOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body">
              <div className="avd-form-grid">
                {importingFile && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--avd-fg-muted)" }}>
                    <div style={{ width: 14, height: 14, border: "2px solid var(--avd-border)", borderTopColor: "var(--avd-brand)", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
                    Importando candidatos...
                  </div>
                )}
                <div style={{ border: "1.5px dashed var(--avd-border)", borderRadius: "var(--avd-radius-sm)", padding: "12px 14px", background: "var(--avd-bg-sunken)" }}>
                  <input className="avd-input" type="file" accept=".csv,.xml,.json" onChange={handleFileImport} disabled={importingFile} style={{ height: "auto", padding: "4px 0", background: "none", border: "none", boxShadow: "none" }} />
                </div>
                <p style={{ fontSize: 12, color: "var(--avd-fg-muted)", margin: 0 }}>Formatos: CSV, XML, JSON. Campos: nombre, apellido, ubicación, grupo, edad.</p>
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsImportOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Dataset */}
      {import.meta.env.DEV && isDatasetOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDatasetOpen(false); }}>
          <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h2>Cargar dataset de ejemplo</h2>
                <p>Inserta un dataset predefinido para pruebas rápidas.</p>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsDatasetOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body">
              <div className="avd-form-field">
                <label className="avd-label">Dataset</label>
                <select className="avd-select" value={selectedDatasetId} onChange={(e) => setSelectedDatasetId(e.target.value)}>
                  {testDatasets.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.emoji} {dataset.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsDatasetOpen(false)} disabled={loadingDataset}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={loadDataset} disabled={loadingDataset}>
                {loadingDataset ? "Cargando..." : "Cargar dataset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Quick select candidate */}
      {candidateToSelect && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCandidateToSelect(null); }}>
          <div className="avd-dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Seleccionar directamente?</h2>
              <p>Vas a forzar la selección de este candidato ahora mismo y será marcado como seleccionado en esta ronda.</p>
            </div>
            <div className="avd-dialog-body">
              <div style={{ padding: "12px 14px", borderRadius: "var(--avd-radius-sm)", background: "var(--avd-bg-sunken)", border: "1px solid var(--avd-border)", fontSize: 13, fontWeight: 600, color: "var(--avd-fg)" }}>
                {formatCandidateName(candidateToSelect)}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setCandidateToSelect(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-primary" onClick={() => quickSelectCandidate(candidateToSelect.id)}>Seleccionar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Unselect candidate */}
      {candidateToUnselect && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCandidateToUnselect(null); }}>
          <div className="avd-dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Deshacer selección?</h2>
              <p>Quitarás a este candidato de la lista de seleccionados y volverá a estar disponible.</p>
            </div>
            <div className="avd-dialog-body">
              <div style={{ padding: "12px 14px", borderRadius: "var(--avd-radius-sm)", background: "color-mix(in oklch, var(--avd-warn) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--avd-warn) 30%, transparent)", fontSize: 13, fontWeight: 600, color: "var(--avd-warn)" }}>
                {formatCandidateName(candidateToUnselect)}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setCandidateToUnselect(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm" style={{ background: "var(--avd-warn)", color: "var(--avd-warn-fg)", borderColor: "color-mix(in oklch, var(--avd-warn) 50%, #000)" }} onClick={() => { setCandidateToUnselect(null); unselectCandidate(candidateToUnselect.id); }}>Desmarcar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete candidate */}
      {candidateToDelete && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCandidateToDelete(null); }}>
          <div className="avd-dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Eliminar candidato?</h2>
              <p>Esta acción no se puede deshacer y el candidato se borrará de la lista.</p>
            </div>
            <div className="avd-dialog-body">
              <div style={{ padding: "12px 14px", borderRadius: "var(--avd-radius-sm)", background: "var(--avd-bad-bg)", border: "1px solid color-mix(in oklch, var(--avd-bad) 25%, transparent)", fontSize: 13, fontWeight: 600, color: "var(--avd-bad-fg)" }}>
                {formatCandidateName(candidateToDelete)}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setCandidateToDelete(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-danger" onClick={() => deleteCandidate(candidateToDelete.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Close Round */}
      {isCloseRoundConfirmOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsCloseRoundConfirmOpen(false); }}>
          <div className="avd-dialog" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Cerrar ronda definitivamente?</h2>
              <p>Se bloqueará y los asistentes no podrán participar.</p>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsCloseRoundConfirmOpen(false)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-danger" onClick={closeVoting}>Cerrar ronda</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
