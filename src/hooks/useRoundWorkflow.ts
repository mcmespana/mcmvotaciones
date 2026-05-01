import { useMemo } from "react";

interface Round {
  is_active: boolean;
  is_closed: boolean;
  is_voting_open: boolean;
  join_locked: boolean;
  round_finalized: boolean;
  show_results_to_voters: boolean;
  show_ballot_summary_projection: boolean;
}

interface UseRoundWorkflowInput {
  round: Round | null;
  hasCandidates: boolean;
  selectionQuotaReached: boolean;
  currentRoundVotes: number;
  isWorkflowRunning: boolean;
}

export interface RoundWorkflow {
  stage: number;
  label: string;
  disabled: boolean;
  color: "brand" | "ok" | "warn" | "muted";
  roomIsOpen: boolean;
  canOpenRoom: boolean;
  canCloseRoom: boolean;
  canStartRound: boolean;
  canPauseRound: boolean;
  canResumeRound: boolean;
  canFinalizeRound: boolean;
  canStartNextRound: boolean;
}

export function useRoundWorkflow({
  round,
  hasCandidates,
  selectionQuotaReached,
  currentRoundVotes,
  isWorkflowRunning,
}: UseRoundWorkflowInput): RoundWorkflow {
  return useMemo(() => {
    const roomIsOpen = Boolean(round && round.is_active && !round.is_voting_open && !round.is_closed);
    const canOpenRoom = Boolean(round && hasCandidates && !selectionQuotaReached && !round.is_closed && !round.is_voting_open && !round.is_active);
    const canCloseRoom = Boolean(round && roomIsOpen);
    const canStartRound = Boolean(round && hasCandidates && !selectionQuotaReached && !round.is_closed && round.is_active && !round.is_voting_open && !round.round_finalized && !round.join_locked);
    const canPauseRound = Boolean(round && round.is_active && round.is_voting_open && !round.round_finalized && !round.is_closed);
    const canResumeRound = Boolean(round && round.is_active && !round.is_voting_open && round.join_locked && !round.round_finalized && !round.is_closed);
    const canFinalizeRound = Boolean(round && round.is_active && (round.is_voting_open || round.join_locked) && currentRoundVotes > 0 && !round.round_finalized && !round.is_closed);
    const canStartNextRound = Boolean(round && !selectionQuotaReached && round.is_active && round.round_finalized && !round.is_closed);

    let stage = 0;
    if (round) {
      if (round.is_closed) stage = 6;
      else if (!round.round_finalized) {
        if (round.is_voting_open) stage = 2;
        else if (round.is_active) stage = 1;
        else stage = 0;
      } else {
        if (!round.show_results_to_voters) stage = 3;
        else if (!round.show_ballot_summary_projection) stage = 4;
        else stage = 5;
      }
    }

    const label = !round
      ? "Acción"
      : round.is_closed ? "Votación completada"
      : canOpenRoom ? "Abrir sala"
      : canStartRound ? "Iniciar votación"
      : !round.round_finalized ? "Finalizar votación"
      : !round.show_results_to_voters ? "Ver resultados ronda"
      : !round.show_ballot_summary_projection ? "Ver papeletas"
      : selectionQuotaReached ? "Confirmar selección"
      : canStartNextRound ? "Finalizar ronda"
      : "Votación completada";

    const disabled = Boolean(
      isWorkflowRunning ||
      !round ||
      round.is_closed ||
      (!round.round_finalized && !canOpenRoom && !canFinalizeRound && !canStartRound) ||
      (round.round_finalized && round.show_ballot_summary_projection && !selectionQuotaReached && !canStartNextRound),
    );

    const color: RoundWorkflow["color"] =
      !round || round.is_closed ? "muted"
      : round.is_voting_open ? "ok"
      : round.round_finalized ? "warn"
      : round.is_active ? "brand"
      : "muted";

    return {
      stage, label, disabled, color,
      roomIsOpen, canOpenRoom, canCloseRoom,
      canStartRound, canPauseRound, canResumeRound,
      canFinalizeRound, canStartNextRound,
    };
  }, [round, hasCandidates, selectionQuotaReached, currentRoundVotes, isWorkflowRunning]);
}
