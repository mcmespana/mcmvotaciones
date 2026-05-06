import { Copy, Globe, Pause, Play, RefreshCw, Sparkles, XCircle } from "lucide-react";
import type { RoundDetail } from "./hooks/useRoundDetail";

interface Props {
  round: RoundDetail;
  canPauseRound: boolean;
  canResumeRound: boolean;
  canCloseRoom: boolean;
  pauseRound: () => void;
  resumeRound: () => void;
  callCloseRoom: () => void;
  publicCandidatesUrl: string;
  copyPublicCandidatesLink: () => void;
  togglePublicCandidates: () => void;
  toggleGallery: () => void;
  selectionQuotaReached: boolean;
  canStartNextRound: boolean;
  startNextRound: () => void;
  isWorkflowRunning: boolean;
  setIsCloseRoundConfirmOpen: (v: boolean) => void;
}

export function ControlsAside({
  round, canPauseRound, canResumeRound, canCloseRoom,
  pauseRound, resumeRound, callCloseRoom,
  publicCandidatesUrl, copyPublicCandidatesLink, togglePublicCandidates, toggleGallery,
  selectionQuotaReached, canStartNextRound, startNextRound, isWorkflowRunning,
  setIsCloseRoundConfirmOpen,
}: Props) {
  return (
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
  );
}
