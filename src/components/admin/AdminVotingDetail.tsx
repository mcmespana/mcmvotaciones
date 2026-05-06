import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { testDatasets } from "@/lib/testDatasets";
import { useRoundDetail } from "./voting-detail/hooks/useRoundDetail";
import {
  AlertTriangle, ArrowLeft, ArrowUpRight, BarChart2, Check, CheckCircle, Copy, Download,
  Globe, Grid, List, Moon, Pause, Pencil,
  Play, RefreshCw, Search, Settings2, Sparkles, StepForward,
  Sun, Trash2, Undo2, Upload, UserPlus, XCircle,
} from "lucide-react";
import { formatCandidateName } from "@/lib/candidateFormat";
import { ResultsAnalytics } from "@/components/admin/ResultsAnalytics";
import { BallotReview } from "@/components/voting/BallotReview";
import { useRoundWorkflow, WORKFLOW_STEPS } from "@/hooks/useRoundWorkflow";
import { TeamChip } from "@/components/admin/TeamChip";

import { ACCESS_CODE_REGEX, generateAccessCode } from "@/lib/accessCode";
import { errorLog } from "@/lib/logger";
import type { Candidate } from "./voting-detail/hooks/useRoundDetail";
import { useCandidateActions } from "./voting-detail/hooks/useCandidateActions";

interface VoteExportRow {
  round_number: number;
  vote_hash: string | null;
  created_at: string;
  is_invalidated: boolean;
  invalidation_reason: string | null;
  candidate: { name: string; surname: string } | Array<{ name: string; surname: string }> | null;
}

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

/* ── Component ── */

export function AdminVotingDetail() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  /* Data (loading, realtime channel, config sync) */
  const {
    round, candidates, seats, seatStatus, currentRoundVotes, loading, inlineResults, now,
    loadRound, loadCandidates, loadInlineResults,
    configAccessCode, setConfigAccessCode,
    configCensusMode, setConfigCensusMode,
    configMaxVotantes, setConfigMaxVotantes,
    configMaxSelected, setConfigMaxSelected,
    configMaxVotesPerRound, setConfigMaxVotesPerRound,
  } = useRoundDetail({ roundId, toast });

  /* Candidate CRUD state + actions */
  const {
    candidateForm, setCandidateForm,
    isAddCandidateOpen, setIsAddCandidateOpen,
    isEditCandidateOpen, setIsEditCandidateOpen,
    isImportOpen, setIsImportOpen,
    candidateToSelect, setCandidateToSelect,
    candidateToUnselect, setCandidateToUnselect,
    candidateToDelete, setCandidateToDelete,
    importingFile,
    forceSelectingId, setForceSelectingId,
    openAddCandidateDialog,
    openEditCandidateDialog,
    addCandidate,
    updateCandidate,
    deleteCandidate,
    unselectCandidate,
    quickSelectCandidate,
    importCandidates,
  } = useCandidateActions({ roundId, round, candidates, loadRound, toast });

  /* UI state */
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateView, setCandidateView] = useState<"list" | "grid">("list");
  const [savingConfig, setSavingConfig] = useState(false);
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isBallotsOpen, setIsBallotsOpen] = useState(false);
  const [isDatasetOpen, setIsDatasetOpen] = useState(false);
  const [salaConflict, setSalaConflict] = useState<{ id: string; title: string } | null>(null);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(testDatasets[0]?.id ?? "");
  const [isCloseRoundConfirmOpen, setIsCloseRoundConfirmOpen] = useState(false);
  const [isDeleteAllCandidatesOpen, setIsDeleteAllCandidatesOpen] = useState(false);
  const [deletingAllCandidates, setDeletingAllCandidates] = useState(false);
  const [candidatesRef] = useAutoAnimate();

  /* ── Derived state ── */

  const activeCandidatesCount = useMemo(() => candidates.filter((c) => !c.is_eliminated).length, [candidates]);
  const selectedCandidatesCount = useMemo(() => candidates.filter((c) => c.is_selected).length, [candidates]);
  const hasCandidates = activeCandidatesCount > 0;
  const maxSelectedCandidates = round?.max_selected_candidates || 6;
  const selectionQuotaReached = selectedCandidatesCount >= maxSelectedCandidates;
  const publicCandidatesPath = roundId ? `/candidatos/${round?.slug || roundId}` : "";
  const publicCandidatesUrl = publicCandidatesPath ? `${window.location.origin}${publicCandidatesPath}` : "";

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
    votingStarted: isVotingStarted,
  } = useRoundWorkflow({ round, hasCandidates, selectionQuotaReached, currentRoundVotes, isWorkflowRunning });
  const isMaxVotantesLocked = isVotingStarted;

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
    const { data, error } = await supabase.rpc("confirm_round_selection", { p_round_id: roundId });
    if (error || !data?.success) {
      const desc = data?.error_code === "QUOTA_NOT_MET"
        ? `Faltan ${(data.required ?? maxSelectedCandidates) - (data.selected_count ?? selectedCandidatesCount)} candidata(s) por seleccionar.`
        : "No se pudo confirmar la selección";
      toast({ title: "Cupo no alcanzado", description: desc, variant: "destructive" });
      return;
    }
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

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) { importCandidates(file); event.target.value = ""; }
  };

  const loadDataset = async () => {
    if (!round) return;
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

  const handleDeleteAllCandidates = async () => {
    if (!roundId) return;
    setDeletingAllCandidates(true);

    try {
      // 1. Obtener lista de fotos de este round y borrarlas del Storage
      const { data: files } = await supabase.storage.from('candidate-photos').list(roundId);
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${roundId}/${file.name}`);
        await supabase.storage.from('candidate-photos').remove(filePaths);
      }

      // 2. Borrar candidatos
      const { error } = await supabase.from('candidates').delete().eq('round_id', roundId);
      if (error) throw error;

      await loadCandidates();
      toast({ title: 'Candidatos eliminados', description: 'Se han eliminado todos los candidatos y sus fotografías.' });
    } catch (error) {
      errorLog("Error eliminando candidatos:", error);
      toast({ title: 'Error', description: 'No se pudieron eliminar los candidatos completamente.', variant: 'destructive' });
    } finally {
      setDeletingAllCandidates(false);
      setIsDeleteAllCandidatesOpen(false);
    }
  };

  /* ── Loading / Not found ── */

  if (loading) {
    return (
      <div className="avd-app items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full animate-spin [animation-duration:0.8s]" />
          <span className="text-[13px] text-[var(--avd-fg-muted)] font-[var(--avd-font-sans)]">Cargando votación...</span>
        </div>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="avd-app items-center justify-center">
        <div className="avd-live-card max-w-[400px] text-center gap-2">
          <p className="text-[var(--avd-fg)] font-semibold m-0">Votación no encontrada</p>
          <p className="text-[var(--avd-fg-muted)] text-[13px] m-0">No se encontró la votación solicitada.</p>
          <button className="avd-btn avd-btn-sm mt-1" onClick={() => navigate("/admin/votaciones")}>
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
        <div className="flex items-center justify-between gap-3 mb-3">
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
        <h1 className="font-[var(--avd-font-sans)] text-[26px] font-extrabold tracking-[-0.02em] m-0 mb-[10px] leading-[1.1] text-[var(--avd-fg)]">
          {round.title}
        </h1>

        {/* Row 3: Meta chips */}
        <div className="avd-page-meta mb-[14px]">
          <span className={`avd-chip ${statusChip.cls} h-6 text-[12px]`}>
            {round.is_voting_open && <span className="avd-pulse-dot mr-0.5" />}
            {statusChip.txt}
          </span>
          <span className="avd-chip avd-chip-muted">Ronda {round.current_round_number}</span>
          <TeamChip label={round.voting_type_name || round.team} />
          {round.year && <span className="avd-chip avd-chip-muted">{round.year}</span>}
          <span className="avd-chip avd-chip-mono gap-1" title="Código de acceso">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--avd-brand)] shrink-0 inline-block" />
            {round.access_code || "––––"}
            <button
              onClick={() => copyText(round.access_code || "", "Código copiado")}
              className="bg-none border-none cursor-pointer p-0 flex items-center text-[var(--avd-fg-faint)]"
            >
              <Copy size={10} />
            </button>
          </span>
          {round.description && (
            <span className="text-[12px] text-[var(--avd-fg-muted)] ml-0.5">· {round.description}</span>
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
          <section className="px-[var(--avd-page-px,24px)] mb-4">
            {/* dynamic: border/bg depend on nobodyHasMajority */}
            <div className={`rounded-[var(--avd-radius-lg,14px)] overflow-hidden ${nobodyHasMajority ? 'border border-[color-mix(in_oklch,var(--avd-warn)_40%,transparent)] bg-[color-mix(in_oklch,var(--avd-warn)_6%,var(--avd-bg))]' : 'border border-[color-mix(in_oklch,var(--avd-ok)_40%,transparent)] bg-[color-mix(in_oklch,var(--avd-ok)_6%,var(--avd-bg))]'}`}>
              {/* Header */}
              <div className="px-[18px] py-[14px] border-b border-[color-mix(in_oklch,var(--avd-border)_50%,transparent)] flex items-center gap-[10px]">
                {nobodyHasMajority ? <AlertTriangle size={18} className="text-[var(--avd-warn)] shrink-0" /> : <CheckCircle size={18} className="text-[var(--avd-ok)] shrink-0" />}
                <div>
                  <div className="font-bold text-[14px] text-[var(--avd-fg)]">
                    {hasTie
                      ? `${tiedCandidates.length} candidatas empatadas al ${tiedCandidates[0]?.percentage.toFixed(0)}% (Canon 119: hace falta mayoría estricta >50%)`
                      : nobodyHasMajority
                      ? "Ninguna candidata alcanzó la mayoría absoluta (>50%)"
                      : "Resultados de la ronda"}
                  </div>
                  <div className="text-[12px] text-[var(--avd-fg-muted)] mt-0.5">
                    {nobodyHasMajority
                      ? "Puedes forzar su selección manualmente o pasar a la siguiente ronda."
                      : "Las candidatas con mayoría han sido seleccionadas automáticamente."}
                  </div>
                </div>
              </div>

              {/* Candidate rows */}
              <div className="px-[14px] py-[10px] flex flex-col gap-1.5">
                {inlineResults.map((r) => (
                  <div key={r.candidate_id} className={`flex items-center gap-3 px-[14px] py-[10px] rounded-[var(--avd-radius-md,10px)] ${r.is_selected ? 'bg-[color-mix(in_oklch,var(--avd-ok)_10%,transparent)] border border-[color-mix(in_oklch,var(--avd-ok)_30%,transparent)]' : 'bg-[color-mix(in_oklch,var(--avd-bg)_80%,transparent)] border border-[var(--avd-border-soft)]'}`}>
                    <div className="flex-grow">
                      <div className="font-semibold text-[14px] text-[var(--avd-fg)] flex items-center gap-2">
                        {formatCandidateName({ name: r.candidate_name, surname: r.candidate_surname })}
                        {r.is_selected && <span className="avd-chip avd-chip-ok h-[18px] text-[10px]">Seleccionada</span>}
                      </div>
                      <div className="text-[12px] text-[var(--avd-fg-muted)] mt-0.5">
                        {r.vote_count}/{currentRoundVotes || totalBallots} votos · {r.percentage.toFixed(2)}%
                      </div>
                    </div>
                    {!r.is_selected && !selectionQuotaReached && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          className="avd-btn avd-btn-sm bg-[var(--avd-ok)] text-white border-[var(--avd-ok)]"
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
                <div className="px-[14px] pb-[14px] pt-[10px] border-t border-[color-mix(in_oklch,var(--avd-border)_50%,transparent)]">
                  <button
                    className="avd-btn avd-btn-block avd-btn-primary font-semibold"
                    onClick={startNextRound}
                    disabled={isWorkflowRunning}
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
          <div className="px-4 pt-[14px] pb-2 border-b border-[var(--avd-border-soft)]">
            <h3 className="avd-section-title m-0">
              Información
              <span className="avd-hint">
                <span className="avd-pulse-dot w-1.5 h-1.5" /> En vivo
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
                <div className="avd-kpi-value text-[16px]">{projLabel}</div>
                <div className="avd-kpi-meta">{isProjectingSomething ? "En pantalla" : "Sin difundir"}</div>
              </div>
            </div>
          </div>

          {/* Conexiones en vivo */}
          <div className="border-t border-[var(--avd-border-soft)] px-4 pt-[14px] pb-2">
            <h3 className="avd-section-title m-0 mb-[10px]">
              Conexiones
              <span className="avd-hint">
                <span className="avd-pulse-dot w-1.5 h-1.5" /> Tiempo real
              </span>
            </h3>
            <div className="flex flex-col gap-[10px]">
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
                <div className="avd-meter-label mb-1.5">
                  <span>Sesiones ({seats.length})</span>
                  <span className="text-[var(--avd-fg-faint)] text-[11px]">
                    {round.join_locked ? "Bloqueada" : "Abierta"}
                  </span>
                </div>
                <div className="avd-seats-list">
                  {seats.length === 0 ? (
                    <p className="p-3 text-center text-[12px] text-[var(--avd-fg-muted)] m-0">
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
                    <div className="avd-search-wrap w-[180px]">
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
                        {hasCandidates && (
                          <button
                            className="avd-btn avd-btn-sm avd-btn-danger"
                            onClick={() => setIsDeleteAllCandidatesOpen(true)}
                          >
                            <Trash2 size={14} /> Eliminar todos
                          </button>
                        )}
                        <button className="avd-btn avd-btn-sm" onClick={() => setIsDatasetOpen(true)}>
                          <Download size={14} /> Dataset
                        </button>
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
                          {c.is_selected && <span className="avd-chip avd-chip-ok h-5 text-[11px]">Seleccionada</span>}
                          {c.is_eliminated && <span className="avd-chip avd-chip-bad h-5 text-[11px]">Eliminada</span>}
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
                              className="avd-btn avd-btn-ghost avd-btn-icon-sm text-[var(--avd-fg-faint)]"
                              onClick={() => setCandidateToDelete(c)}
                              title="Eliminar"
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
                            <div className="text-[11.5px] text-[var(--avd-fg-muted)]">{c.group_name}</div>
                          )}
                          <div className="avd-cand-card-foot">
                            <div className="flex gap-1">
                              {c.is_selected && <span className="avd-chip avd-chip-ok h-5 text-[11px]">Seleccionada</span>}
                              {c.is_eliminated && <span className="avd-chip avd-chip-bad h-5 text-[11px]">Eliminada</span>}
                            </div>
                            <div className="flex gap-0.5">
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
                  <div className="flex items-center gap-1.5">
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
          <div className="avd-dialog max-w-[400px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>Sala activa detectada</h2>
              <p>Ya existe otra sala activa: <strong>{salaConflict.title}</strong>.</p>
            </div>
            <div className="avd-dialog-body">
              <p className="text-[13px] text-[var(--avd-fg-muted)] m-0">
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
          <div className="avd-dialog max-w-[660px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head flex justify-between items-start gap-3">
              <div>
                <h2>Configuración de la votación</h2>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsSettingsOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body">
              <div className="flex flex-col gap-[14px]">
                <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">

                <div className="avd-form-field">
                  <label className="avd-label">Código de acceso</label>
                  <div className="flex gap-1.5">
                    <input
                      className="avd-input font-[var(--avd-font-mono)] tracking-[0.12em] font-bold"
                      value={configAccessCode}
                      maxLength={4}
                      onChange={(e) => setConfigAccessCode(e.target.value.toUpperCase())}
                    />
                    <button className="avd-btn avd-btn-sm shrink-0" onClick={() => setConfigAccessCode(generateAccessCode())}>
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
                  <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--avd-radius-sm)] bg-[var(--avd-brand-bg)] border border-[var(--avd-brand-border)] text-[13px]">
                    <span className="text-[var(--avd-fg-muted)]">Tipo base:</span>
                    <span className="avd-chip avd-chip-brand h-5 text-[11px]">{round.voting_type_name}</span>
                    <span className="text-[12px] text-[var(--avd-fg-faint)]">Los valores se pueden ajustar sin cambiar el tipo.</span>
                  </div>
                )}

                <div className="grid gap-3 items-start [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                  <div className="avd-form-field">
                    <label className="avd-label">Nº máx. votantes {isMaxVotantesLocked && <span className="avd-chip avd-chip-muted ml-1.5">Bloqueado</span>}</label>
                    <input
                      className={`avd-input${isMaxVotantesLocked ? " bg-[var(--avd-bg-sunken)] text-[var(--avd-fg-muted)]" : ""}`}
                      type="number"
                      min={1}
                      max={9999}
                      value={configMaxVotantes}
                      onChange={(e) => setConfigMaxVotantes(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isMaxVotantesLocked}
                    />
                    {isMaxVotantesLocked && <p className="text-[11px] text-[var(--avd-fg-faint)] mt-[3px]">Se puede configurar solo antes de abrir la sala.</p>}
                  </div>

                  <div className="avd-form-field">
                    <label className="avd-label">Total a seleccionar {isVotingStarted && <span className="avd-chip avd-chip-muted ml-1.5">Bloqueado</span>}</label>
                    <input
                      className={`avd-input${isVotingStarted ? " bg-[var(--avd-bg-sunken)] text-[var(--avd-fg-muted)]" : ""}`}
                      type="number"
                      min={1}
                      max={100}
                      value={configMaxSelected}
                      onChange={(e) => setConfigMaxSelected(Math.max(1, parseInt(e.target.value) || 1))}
                      disabled={isVotingStarted}
                    />
                    {isVotingStarted && <p className="text-[11px] text-[var(--avd-fg-faint)] mt-[3px]">No editable con votación en curso.</p>}
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
                    <p className="text-[11px] text-[var(--avd-fg-faint)] mt-[3px]">
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
            className="avd-dialog avd-dialog-wide max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="avd-dialog-head flex justify-between items-start gap-3">
              <div>
                <h2>Análisis de resultados</h2>
                <p>Distribución de votos por ronda.</p>
              </div>
              <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsAnalyticsOpen(false)}>
                <XCircle size={14} />
              </button>
            </div>
            <div className="avd-dialog-body h-[calc(90vh-80px)]">
              <ResultsAnalytics lockedRoundId={round.id} />
            </div>
          </div>
        </div>
      )}

      {/* Ballots */}
      {isBallotsOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsBallotsOpen(false); }}>
          <div
            className="avd-dialog avd-dialog-wide max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="avd-dialog-head flex justify-between items-start gap-[10px]">
              <div>
                <h2>Revisión de papeletas</h2>
                <p>Ronda {round.current_round_number} · papeletas emitidas anónimamente.</p>
              </div>
              <div className="flex gap-1.5">
                <button className="avd-btn avd-btn-sm" onClick={exportBallotsCsv}>
                  <Download size={13} /> Exportar CSV
                </button>
                <button className="avd-btn avd-btn-ghost avd-btn-icon" onClick={() => setIsBallotsOpen(false)}>
                  <XCircle size={14} />
                </button>
              </div>
            </div>
            <div className="avd-dialog-body h-[calc(90vh-80px)]">
              <BallotReview lockedRoundId={round.id} showHeader={false} />
            </div>
          </div>
        </div>
      )}

      {/* Add candidate */}
      {isAddCandidateOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsAddCandidateOpen(false); }}>
          <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head flex justify-between items-start gap-3">
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
            <div className="avd-dialog-head flex justify-between items-start gap-3">
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
            <div className="avd-dialog-head flex justify-between items-start gap-3">
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
                  <div className="flex items-center gap-2 text-[13px] text-[var(--avd-fg-muted)]">
                    <div className="w-3.5 h-3.5 border-2 border-[var(--avd-border)] border-t-[var(--avd-brand)] rounded-full animate-spin shrink-0 [animation-duration:0.7s]" />
                    Importando candidatos...
                  </div>
                )}
                <div className="border-[1.5px] border-dashed border-[var(--avd-border)] rounded-[var(--avd-radius-sm)] px-[14px] py-3 bg-[var(--avd-bg-sunken)]">
                  <input className="avd-input h-auto py-1 px-0 bg-transparent border-none shadow-none" type="file" accept=".csv,.xml,.json" onChange={handleFileImport} disabled={importingFile} />
                </div>
                <p className="text-[12px] text-[var(--avd-fg-muted)] m-0">Formatos: CSV, XML, JSON. Campos: nombre, apellido, ubicación, grupo, edad.</p>
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsImportOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Dataset */}
      {isDatasetOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDatasetOpen(false); }}>
          <div className="avd-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head flex justify-between items-start gap-3">
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
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Seleccionar directamente?</h2>
              <p>Vas a forzar la selección de este candidato ahora mismo y será marcado como seleccionado en esta ronda.</p>
            </div>
            <div className="avd-dialog-body">
              <div className="px-[14px] py-3 rounded-[var(--avd-radius-sm)] bg-[var(--avd-bg-sunken)] border border-[var(--avd-border)] text-[13px] font-semibold text-[var(--avd-fg)]">
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
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Deshacer selección?</h2>
              <p>Quitarás a este candidato de la lista de seleccionados y volverá a estar disponible.</p>
            </div>
            <div className="avd-dialog-body">
              <div className="px-[14px] py-3 rounded-[var(--avd-radius-sm)] bg-[color-mix(in_oklch,var(--avd-warn)_15%,transparent)] border border-[color-mix(in_oklch,var(--avd-warn)_30%,transparent)] text-[13px] font-semibold text-[var(--avd-warn)]">
                {formatCandidateName(candidateToUnselect)}
              </div>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setCandidateToUnselect(null)}>Cancelar</button>
              <button className="avd-btn avd-btn-sm bg-[var(--avd-warn)] text-[var(--avd-warn-fg)] border-[color-mix(in_oklch,var(--avd-warn)_50%,#000)]" onClick={() => { setCandidateToUnselect(null); unselectCandidate(candidateToUnselect.id); }}>Desmarcar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete candidate */}
      {candidateToDelete && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setCandidateToDelete(null); }}>
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Eliminar candidato?</h2>
              <p>Esta acción no se puede deshacer y el candidato se borrará de la lista.</p>
            </div>
            <div className="avd-dialog-body">
              <div className="px-[14px] py-3 rounded-[var(--avd-radius-sm)] bg-[var(--avd-bad-bg)] border border-[color-mix(in_oklch,var(--avd-bad)_25%,transparent)] text-[13px] font-semibold text-[var(--avd-bad-fg)]">
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
          <div className="avd-dialog max-w-[420px]" onClick={(e) => e.stopPropagation()}>
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

      {/* Modal: Delete all candidates */}
      {isDeleteAllCandidatesOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDeleteAllCandidatesOpen(false); }}>
          <div className="avd-dialog max-w-[440px]" onClick={(e) => e.stopPropagation()}>
            <div className="avd-dialog-head">
              <h2>¿Eliminar todos los candidatos?</h2>
              <p>Se eliminarán los <strong>{candidates.length} candidatos</strong> de «{round?.title}». Esta acción no se puede deshacer.</p>
            </div>
            <div className="avd-dialog-foot">
              <button className="avd-btn avd-btn-sm" onClick={() => setIsDeleteAllCandidatesOpen(false)} disabled={deletingAllCandidates}>Cancelar</button>
              <button className="avd-btn avd-btn-sm avd-btn-danger" onClick={handleDeleteAllCandidates} disabled={deletingAllCandidates}>
                <Trash2 size={13} /> {deletingAllCandidates ? 'Eliminando...' : 'Eliminar todos'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
