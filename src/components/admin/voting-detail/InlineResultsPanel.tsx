import { AlertTriangle, Check, CheckCircle, RefreshCw, Undo2 } from "lucide-react";
import { formatCandidateName } from "@/lib/candidateFormat";
import type { InlineResult, RoundDetail } from "./hooks/useRoundDetail";

interface Props {
  round: RoundDetail;
  inlineResults: InlineResult[];
  currentRoundVotes: number;
  selectionQuotaReached: boolean;
  canStartNextRound: boolean;
  isWorkflowRunning: boolean;
  forceSelectingId: string | null;
  forceSelectCandidate: (id: string) => void;
  unselectCandidate: (id: string) => void;
  startNextRound: () => void;
  compact?: boolean;
}

export function InlineResultsPanel({
  round, inlineResults, currentRoundVotes, selectionQuotaReached, canStartNextRound, isWorkflowRunning,
  forceSelectingId, forceSelectCandidate, unselectCandidate, startNextRound, compact,
}: Props) {
  const allBlank = inlineResults.length === 0 && currentRoundVotes > 0;
  if (!(round.round_finalized && !round.is_closed && (inlineResults.length > 0 || allBlank))) return null;

  const totalBallots = inlineResults.length > 0 ? Math.max(...inlineResults.map(r => r.vote_count), 1) : 0;
  const tiedCandidates = inlineResults.filter(r => !r.has_majority && r.vote_count > 0 && !r.is_selected);
  const hasTie = tiedCandidates.length >= 2 && tiedCandidates[0]?.vote_count === tiedCandidates[1]?.vote_count;
  const nobodyHasMajority = allBlank || inlineResults.every(r => !r.has_majority);

  return (
    <section className={compact ? "mb-3" : "px-[var(--avd-page-px,24px)] mb-4"}>
      <div className={`rounded-[var(--avd-radius-lg,14px)] overflow-hidden ${nobodyHasMajority ? 'border border-[color-mix(in_oklch,var(--avd-warn)_40%,transparent)] bg-[color-mix(in_oklch,var(--avd-warn)_6%,var(--avd-bg))]' : 'border border-[color-mix(in_oklch,var(--avd-ok)_40%,transparent)] bg-[color-mix(in_oklch,var(--avd-ok)_6%,var(--avd-bg))]'}`}>
        {/* Header */}
        <div className="px-[18px] py-[14px] border-b border-[color-mix(in_oklch,var(--avd-border)_50%,transparent)] flex items-center gap-[10px]">
          {nobodyHasMajority ? <AlertTriangle size={18} className="text-[var(--avd-warn)] shrink-0" /> : <CheckCircle size={18} className="text-[var(--avd-ok)] shrink-0" />}
          <div>
            <div className="font-bold text-[14px] text-[var(--avd-fg)]">
              {allBlank
                ? `${currentRoundVotes} voto${currentRoundVotes !== 1 ? 's' : ''} en blanco — nadie votó por ningún candidato`
                : hasTie
                ? `${tiedCandidates.length} candidatas empatadas al ${tiedCandidates[0]?.percentage.toFixed(0)}% (Canon 119: hace falta mayoría estricta >50%)`
                : nobodyHasMajority
                ? "Ninguna candidata alcanzó la mayoría absoluta (>50%)"
                : "Resultados de la ronda"}
            </div>
            <div className="text-[12px] text-[var(--avd-fg-muted)] mt-0.5">
              {allBlank
                ? "Puedes pasar a la siguiente ronda."
                : nobodyHasMajority
                ? "Puedes forzar su selección manualmente o pasar a la siguiente ronda."
                : "Las candidatas con mayoría han sido seleccionadas automáticamente."}
            </div>
          </div>
        </div>

        {/* Candidate rows (only when non-blank votes exist) */}
        {inlineResults.length > 0 && (
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
        )}

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
}
