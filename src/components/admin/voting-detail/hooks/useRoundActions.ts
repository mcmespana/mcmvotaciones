import { ChangeEvent, useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACCESS_CODE_REGEX, generateAccessCode } from "@/lib/accessCode";
import { errorLog } from "@/lib/logger";
import { formatCandidateName } from "@/lib/candidateFormat";
import { testDatasets } from "@/lib/testDatasets";
import type { useToast } from "@/hooks/use-toast";
import type { RoundDetail, Candidate } from "./useRoundDetail";
import { type VoteExportRow, normalizeVoteCandidate, shortBallotCode, csvEscape } from "../types";

interface Options {
  roundId: string | undefined;
  round: RoundDetail | null;
  candidates: Candidate[];
  loadRound: () => Promise<void>;
  loadCandidates: () => Promise<void>;
  loadInlineResults: (n: number) => Promise<void>;
  toast: ReturnType<typeof useToast>["toast"];
  navigate: (path: string) => void;
  hasCandidates: boolean;
  selectionQuotaReached: boolean;
  selectedCandidatesCount: number;
  maxSelectedCandidates: number;
  currentRoundVotes: number;
  isMaxVotantesLocked: boolean;
  configAccessCode: string;
  setConfigAccessCode: (v: string) => void;
  configCensusMode: "maximum" | "exact";
  configMaxVotantes: number;
  setConfigMaxVotantes: (v: number) => void;
  configMaxSelected: number;
  configMaxVotesPerRound: number;
  canOpenRoom: boolean;
  canCloseRoom: boolean;
  canStartRound: boolean;
  canPauseRound: boolean;
  canResumeRound: boolean;
  canFinalizeRound: boolean;
  canStartNextRound: boolean;
  roomIsOpen: boolean;
  setForceSelectingId: (v: string | null) => void;
  importCandidates: (file: File) => void;
  isWorkflowRunning: boolean;
  setIsWorkflowRunning: (v: boolean) => void;
}

export function useRoundActions(opts: Options) {
  const {
    roundId, round, candidates, loadRound, loadCandidates, loadInlineResults, toast, navigate,
    hasCandidates, selectionQuotaReached, selectedCandidatesCount, maxSelectedCandidates,
    currentRoundVotes, isMaxVotantesLocked,
    configAccessCode, setConfigAccessCode, configCensusMode, configMaxVotantes, setConfigMaxVotantes,
    configMaxSelected, configMaxVotesPerRound,
    canOpenRoom, canCloseRoom, canStartRound, canPauseRound, canResumeRound, canFinalizeRound, canStartNextRound,
    roomIsOpen, setForceSelectingId, importCandidates,
    isWorkflowRunning, setIsWorkflowRunning,
  } = opts;

  const [savingConfig, setSavingConfig] = useState(false);
  const [salaConflict, setSalaConflict] = useState<{ id: string; title: string } | null>(null);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(testDatasets[0]?.id ?? "");
  const [isCloseRoundConfirmOpen, setIsCloseRoundConfirmOpen] = useState(false);
  const [isDeleteAllCandidatesOpen, setIsDeleteAllCandidatesOpen] = useState(false);
  const [deletingAllCandidates, setDeletingAllCandidates] = useState(false);
  const [isDatasetOpen, setIsDatasetOpen] = useState(false);

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

  const resolveRoomConflict = async () => {
    if (!salaConflict || !roundId) return;
    await supabase.from("rounds").update({ is_active: false, is_voting_open: false, updated_at: new Date().toISOString() }).eq("id", salaConflict.id);
    setSalaConflict(null);
    const opened = await callOpenRoom(true);
    if (opened) await callStartRound(true);
  };

  const callCloseRoom = async () => {
    if (!roundId || !canCloseRoom) return;
    try {
      await supabase.from("rounds").update({ is_active: false, is_voting_open: false, join_locked: false, updated_at: new Date().toISOString() }).eq("id", roundId);
      toast({ title: "Sala cerrada", description: "La sala se cerró correctamente." });
      await loadRound();
    } catch { toast({ title: "Error", description: "No se pudo cerrar la sala", variant: "destructive" }); }
  };

  const closeVoting = async () => {
    if (!roundId) return;
    setIsCloseRoundConfirmOpen(false);
    const { error } = await supabase.from("rounds").update({
      is_closed: true,
      is_active: false,
      is_voting_open: false,
      join_locked: true,
      round_finalized: true,
      show_results_to_voters: false,
      show_ballot_summary_projection: false,
      show_final_gallery_projection: false,
      updated_at: new Date().toISOString(),
    }).eq("id", roundId);
    if (error) { toast({ title: "Error", description: "No se pudo cerrar la votación", variant: "destructive" }); return; }
    toast({ title: "Votación cerrada", description: "Activa la galería final cuando quieras mostrarla" });
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
    await loadInlineResults(round.current_round_number);
  };

  const startNextRound = async () => {
    if (!roundId || !canStartNextRound) return;
    const { data, error } = await supabase.rpc("start_new_round", { p_round_id: roundId });
    if (error) { toast({ title: "Error", description: "No se pudo iniciar la siguiente ronda", variant: "destructive" }); return; }
    const parsed = data as { round_number?: number };
    await supabase.from("rounds").update({ is_active: true, is_closed: false, round_finalized: false, is_voting_open: true, join_locked: true, show_results_to_voters: false, show_ballot_summary_projection: false, show_final_gallery_projection: false, updated_at: new Date().toISOString() }).eq("id", roundId);
    toast({ title: "Siguiente ronda iniciada", description: `Ronda ${parsed?.round_number || "nueva"} en curso` });
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
      if (!round.show_results_to_voters) {
        const { error } = await supabase.from("rounds").update({ show_results_to_voters: true, updated_at: new Date().toISOString() }).eq("id", roundId);
        if (error) { toast({ title: "Error", description: "No se pudo activar proyección de resultados", variant: "destructive" }); return; }
        await loadRound();
        return;
      }
      if (!round.show_ballot_summary_projection) {
        const { error } = await supabase.from("rounds").update({ show_ballot_summary_projection: true, updated_at: new Date().toISOString() }).eq("id", roundId);
        if (error) { toast({ title: "Error", description: "No se pudo activar proyección de papeletas", variant: "destructive" }); return; }
        await loadRound();
        return;
      }
      if (selectionQuotaReached) { await confirmSelection(); return; }
      if (canStartNextRound) { await startNextRound(); return; }
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  const toggleGallery = async () => {
    if (!roundId || !round?.round_finalized || !round.is_closed) return;
    const nextOn = !round.show_final_gallery_projection;
    if (nextOn) {
      // Atomic: close any other open galleries in one statement (no TOCTOU race).
      const { data: closedOthers } = await supabase
        .from("rounds")
        .update({ show_final_gallery_projection: false, updated_at: new Date().toISOString() })
        .eq("show_final_gallery_projection", true)
        .neq("id", roundId)
        .select("title");
      if (closedOthers && closedOthers.length > 0) {
        toast({ title: `Galería de "${closedOthers[0].title}" cerrada`, description: "No puede haber dos galerías activas simultáneamente." });
      }
    }
    const update: Record<string, unknown> = { show_final_gallery_projection: nextOn, updated_at: new Date().toISOString() };
    if (nextOn) {
      // When showing the gallery, stop projecting per-round results to avoid stale projection
      update.show_results_to_voters = false;
      update.show_ballot_summary_projection = false;
    }
    const { error } = await supabase.from("rounds").update(update).eq("id", roundId);
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
      const { data: files } = await supabase.storage.from('candidate-photos').list(roundId);
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${roundId}/${file.name}`);
        await supabase.storage.from('candidate-photos').remove(filePaths);
      }

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

  return {
    // states
    savingConfig, salaConflict, setSalaConflict,
    loadingDataset, selectedDatasetId, setSelectedDatasetId,
    isCloseRoundConfirmOpen, setIsCloseRoundConfirmOpen,
    isDeleteAllCandidatesOpen, setIsDeleteAllCandidatesOpen,
    deletingAllCandidates,
    isDatasetOpen, setIsDatasetOpen,
    // actions
    callOpenRoom, callStartRound, resolveRoomConflict, callCloseRoom, closeVoting, confirmSelection,
    finalizeRound, startNextRound, runProjectionWorkflowStep, toggleGallery, togglePublicCandidates,
    pauseRound, resumeRound, forceSelectCandidate, saveConfig, exportBallotsCsv,
    copyText, handleFileImport, loadDataset, openComunicaImport, handleDeleteAllCandidates,
  };
}
