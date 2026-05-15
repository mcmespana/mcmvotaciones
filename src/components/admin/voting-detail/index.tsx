import { useCallback, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, XCircle } from "lucide-react";
import { fetchCRMPhotos } from "@/lib/sinergiaCRM";
import { ResultsAnalytics } from "@/components/admin/ResultsAnalytics";
import { BallotReview } from "@/components/voting/BallotReview";
import { useRoundWorkflow } from "@/hooks/useRoundWorkflow";
import { useRoundDetail } from "./hooks/useRoundDetail";
import { useCandidateActions } from "./hooks/useCandidateActions";
import { useRoundActions } from "./hooks/useRoundActions";
import type { Candidate } from "./hooks/useRoundDetail";
import { PageHeader } from "./PageHeader";
import { SeatsLiveCard } from "./SeatsLiveCard";
import { CandidatesPane } from "./CandidatesPane";
import { ControlsAside } from "./ControlsAside";
import { InlineResultsPanel } from "./InlineResultsPanel";
import { RoomConflictDialog } from "./dialogs/RoomConflictDialog";
import { SettingsDialog } from "./dialogs/SettingsDialog";
import { ImportDialog } from "./dialogs/ImportDialog";
import { DatasetDialog } from "./dialogs/DatasetDialog";
import { CandidateFormDialog } from "./dialogs/CandidateFormDialog";
import { CloseRoundConfirm } from "./dialogs/CloseRoundConfirm";

export function AdminVotingDetail() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  /* Data (loading, realtime channel, config sync) */
  const {
    round, candidates, seats, seatStatus, currentRoundVotes, loading, inlineResults, now,
    liveSeatIds, presenceChecking, checkPresence, releaseSeat, releaseGhostSeats,
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
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [refetchingPhotos, setRefetchingPhotos] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isBallotsOpen, setIsBallotsOpen] = useState(false);
  const [candidatesRef] = useAutoAnimate();

  /* ── Derived state ── */

  const activeCandidatesCount = useMemo(() => candidates.filter((c) => !c.is_eliminated).length, [candidates]);
  const selectedCandidatesCount = useMemo(() => candidates.filter((c) => c.is_selected).length, [candidates]);
  const hasCandidatesWithCrm = useMemo(() => candidates.some((c) => c.crm_id), [candidates]);
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

  /* ── Round actions hook ── */
  const {
    savingConfig, salaConflict, setSalaConflict,
    loadingDataset, selectedDatasetId, setSelectedDatasetId,
    isCloseRoundConfirmOpen, setIsCloseRoundConfirmOpen,
    isDeleteAllCandidatesOpen, setIsDeleteAllCandidatesOpen,
    deletingAllCandidates,
    isDatasetOpen, setIsDatasetOpen,
    resolveRoomConflict, callCloseRoom, closeVoting,
    startNextRound, runProjectionWorkflowStep, toggleGallery, togglePublicCandidates,
    pauseRound, resumeRound, forceSelectCandidate, saveConfig, exportBallotsCsv,
    copyText, handleFileImport, loadDataset, openComunicaImport, handleDeleteAllCandidates,
  } = useRoundActions({
    roundId, round, candidates, loadRound, loadCandidates, loadInlineResults, toast, navigate,
    hasCandidates, selectionQuotaReached, selectedCandidatesCount, maxSelectedCandidates,
    currentRoundVotes, isMaxVotantesLocked,
    configAccessCode, setConfigAccessCode, configCensusMode, configMaxVotantes, setConfigMaxVotantes,
    configMaxSelected, configMaxVotesPerRound,
    canOpenRoom, canCloseRoom, canStartRound, canPauseRound, canResumeRound, canFinalizeRound, canStartNextRound,
    roomIsOpen, setForceSelectingId, importCandidates,
    isWorkflowRunning, setIsWorkflowRunning,
  });

  const openAnalyticsDialog = useCallback(() => { setIsAnalyticsOpen(true); }, []);
  const openBallotsDialog = useCallback(() => { setIsBallotsOpen(true); }, []);

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

  const copyPublicCandidatesLink = useCallback(async () => {
    if (publicCandidatesUrl) await copyText(publicCandidatesUrl, "Enlace público copiado.");
  }, [copyText, publicCandidatesUrl]);

  const refetchPhotos = useCallback(async () => {
    if (!roundId || refetchingPhotos) return;
    const photoCandidates = candidates
      .filter((c) => c.crm_id)
      .map((c) => ({ crm_id: c.crm_id!, candidate_id: c.id }));
    if (!photoCandidates.length) return;
    setRefetchingPhotos(true);
    try {
      const SESSIONKEY_USER = 'crm_user';
      const SESSIONKEY_PASS = 'crm_pass';
      const user = sessionStorage.getItem(SESSIONKEY_USER) ?? undefined;
      const pass = sessionStorage.getItem(SESSIONKEY_PASS) ?? undefined;
      const credentials = user && pass ? { user, pass } : undefined;
      const result = await fetchCRMPhotos(photoCandidates, roundId, credentials);
      toast({ title: `Fotos actualizadas`, description: `${result.uploaded} importadas · ${result.failed} sin foto en CRM` });
      await loadCandidates();
    } catch (err) {
      toast({ title: "Error al importar fotos", description: String(err), variant: "destructive" });
    } finally {
      setRefetchingPhotos(false);
    }
  }, [roundId, candidates, refetchingPhotos, toast, loadCandidates]);

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

      <PageHeader
        round={round} now={now} theme={theme} setTheme={setTheme} statusChip={statusChip} copyText={copyText}
        openAnalyticsDialog={openAnalyticsDialog} openBallotsDialog={openBallotsDialog}
        exportBallotsCsv={exportBallotsCsv} setIsSettingsOpen={setIsSettingsOpen}
        stage={stage} workflowActionLabel={workflowActionLabel} workflowActionDisabled={workflowActionDisabled}
        isWorkflowRunning={isWorkflowRunning} runProjectionWorkflowStep={runProjectionWorkflowStep}
        activeCandidatesCount={activeCandidatesCount}
      />

      {/* ═══ Main grid ═══ */}
      <div className="avd-page-main">

        {/* ── Main: candidates (65%) ── */}
        <CandidatesPane
          candidates={candidates} filteredCandidates={filteredCandidates}
          selectedCandidatesCount={selectedCandidatesCount} activeCandidatesCount={activeCandidatesCount}
          hasCandidates={hasCandidates} isVotingStarted={isVotingStarted}
          candidateView={candidateView} setCandidateView={setCandidateView}
          candidateSearch={candidateSearch} setCandidateSearch={setCandidateSearch}
          openAddCandidateDialog={openAddCandidateDialog} setIsImportOpen={setIsImportOpen}
          openComunicaImport={openComunicaImport} setIsDeleteAllCandidatesOpen={setIsDeleteAllCandidatesOpen}
          setIsDatasetOpen={setIsDatasetOpen} hasCandidatesWithCrm={hasCandidatesWithCrm}
          refetchingPhotos={refetchingPhotos} onRefetchPhotos={refetchPhotos}
          openEditCandidateDialog={openEditCandidateDialog}
          setCandidateToSelect={setCandidateToSelect} setCandidateToUnselect={setCandidateToUnselect}
          setCandidateToDelete={setCandidateToDelete} candidatesRef={candidatesRef} initials={initials}
          topPanel={
            <InlineResultsPanel
              round={round} inlineResults={inlineResults} currentRoundVotes={currentRoundVotes}
              selectionQuotaReached={selectionQuotaReached} canStartNextRound={canStartNextRound}
              isWorkflowRunning={isWorkflowRunning} forceSelectingId={forceSelectingId}
              forceSelectCandidate={forceSelectCandidate} unselectCandidate={unselectCandidate}
              startNextRound={startNextRound} compact
            />
          }
        />

        {/* ── Right sidebar (35%): controls + connections ── */}
        <aside className="avd-col avd-col-right">
          <ControlsAside
            round={round} canPauseRound={canPauseRound} canResumeRound={canResumeRound} canCloseRoom={canCloseRoom}
            pauseRound={pauseRound} resumeRound={resumeRound} callCloseRoom={callCloseRoom}
            publicCandidatesUrl={publicCandidatesUrl} copyPublicCandidatesLink={copyPublicCandidatesLink}
            togglePublicCandidates={togglePublicCandidates} toggleGallery={toggleGallery}
            selectionQuotaReached={selectionQuotaReached} canStartNextRound={canStartNextRound}
            startNextRound={startNextRound} isWorkflowRunning={isWorkflowRunning}
            setIsCloseRoundConfirmOpen={setIsCloseRoundConfirmOpen}
          />
          <SeatsLiveCard
            round={round} seats={seats} seatStatus={seatStatus}
            currentRoundVotes={currentRoundVotes} occupiedPct={occupiedPct} votesPct={votesPct}
            liveSeatIds={liveSeatIds} presenceChecking={presenceChecking}
            checkPresence={checkPresence} releaseSeat={releaseSeat} releaseGhostSeats={releaseGhostSeats}
          />
        </aside>
      </div>

      {/* ═══ Dialogs ═══ */}

      <RoomConflictDialog salaConflict={salaConflict} setSalaConflict={setSalaConflict} resolveRoomConflict={resolveRoomConflict} />

      <SettingsDialog
        isSettingsOpen={isSettingsOpen} setIsSettingsOpen={setIsSettingsOpen} round={round}
        configAccessCode={configAccessCode} setConfigAccessCode={setConfigAccessCode}
        configCensusMode={configCensusMode} setConfigCensusMode={setConfigCensusMode}
        configMaxVotantes={configMaxVotantes} setConfigMaxVotantes={setConfigMaxVotantes}
        configMaxSelected={configMaxSelected} setConfigMaxSelected={setConfigMaxSelected}
        configMaxVotesPerRound={configMaxVotesPerRound} setConfigMaxVotesPerRound={setConfigMaxVotesPerRound}
        isMaxVotantesLocked={isMaxVotantesLocked} isVotingStarted={isVotingStarted}
        savingConfig={savingConfig} saveConfig={saveConfig}
      />

      {/* Analytics */}
      {isAnalyticsOpen && (
        <div className="avd-dialog-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsAnalyticsOpen(false); }}>
          <div className="avd-dialog avd-dialog-wide max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
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
          <div className="avd-dialog avd-dialog-wide max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
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

      <CandidateFormDialog
        isAddCandidateOpen={isAddCandidateOpen} setIsAddCandidateOpen={setIsAddCandidateOpen}
        isEditCandidateOpen={isEditCandidateOpen} setIsEditCandidateOpen={setIsEditCandidateOpen}
        candidateForm={candidateForm} setCandidateForm={setCandidateForm}
        addCandidate={addCandidate} updateCandidate={updateCandidate}
        candidateToSelect={candidateToSelect} setCandidateToSelect={setCandidateToSelect}
        quickSelectCandidate={quickSelectCandidate}
        candidateToUnselect={candidateToUnselect} setCandidateToUnselect={setCandidateToUnselect}
        unselectCandidate={unselectCandidate}
        candidateToDelete={candidateToDelete} setCandidateToDelete={setCandidateToDelete}
        deleteCandidate={deleteCandidate}
      />

      <ImportDialog
        isImportOpen={isImportOpen} setIsImportOpen={setIsImportOpen}
        importingFile={importingFile} handleFileImport={handleFileImport}
      />

      <DatasetDialog
        isDatasetOpen={isDatasetOpen} setIsDatasetOpen={setIsDatasetOpen}
        selectedDatasetId={selectedDatasetId} setSelectedDatasetId={setSelectedDatasetId}
        loadingDataset={loadingDataset} loadDataset={loadDataset}
      />

      <CloseRoundConfirm
        isCloseRoundConfirmOpen={isCloseRoundConfirmOpen} setIsCloseRoundConfirmOpen={setIsCloseRoundConfirmOpen}
        closeVoting={closeVoting}
        isDeleteAllCandidatesOpen={isDeleteAllCandidatesOpen} setIsDeleteAllCandidatesOpen={setIsDeleteAllCandidatesOpen}
        deletingAllCandidates={deletingAllCandidates} handleDeleteAllCandidates={handleDeleteAllCandidates}
        candidates={candidates} round={round}
      />

    </div>
  );
}

export default AdminVotingDetail;
