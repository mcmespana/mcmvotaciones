import { useMemo } from "react";
import type { RoundRow } from "@/types/db";

export const WORKFLOW_STEPS = [
  { id: "open-room",        label: "Abrir sala",             sub: "Sala de espera abierta" },
  { id: "start",            label: "Iniciar votación",        sub: "Empieza el voto" },
  { id: "close-vote",       label: "Finalizar votación",      sub: "Cierra y procesa" },
  { id: "ballot-animation", label: "Animación papeletas",     sub: "Papeletas entrando en urna" },
  { id: "results",          label: "Ver resultados ronda",    sub: "Se proyectan los resultados" },
  // { id: "ballots",       label: "Ver papeletas",           sub: "Rejilla estática de papeletas" }, // desactivado temporalmente
  { id: "finish",           label: "Finalizar ronda",         sub: "Siguiente ronda o cierre" },
];

type Round = Pick<RoundRow, 'is_active' | 'is_closed' | 'is_voting_open' | 'join_locked' | 'round_finalized' | 'show_results_to_voters' | 'show_ballot_summary_projection' | 'show_ballot_animation' | 'current_round_number'>;

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
  roomIsOpen: boolean;
  canOpenRoom: boolean;
  canCloseRoom: boolean;
  canStartRound: boolean;
  canPauseRound: boolean;
  canResumeRound: boolean;
  canFinalizeRound: boolean;
  canStartNextRound: boolean;
  /** True once voting has started — gates Add/Import/Dataset/Comunica buttons */
  votingStarted: boolean;
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
        // Post-finalization stages (nuevo orden: animación → resultados → finalizar)
        if (!round.show_ballot_animation && !round.show_results_to_voters) stage = 3; // listo para lanzar animación
        else if (round.show_ballot_animation) stage = 4;  // animación en curso
        // -- Papeletas estáticas desactivadas temporalmente (era stage 4 / show_ballot_summary_projection) --
        else stage = 5; // mostrando resultados, listo para finalizar
      }
    }

    const label = !round
      ? "Acción"
      : round.is_closed ? "Votación completada"
      : canOpenRoom ? "Abrir sala"
      : canStartRound ? "Iniciar votación"
      : !round.round_finalized ? "Finalizar votación"
      : (!round.show_ballot_animation && !round.show_results_to_voters) ? "Iniciar animación papeletas"
      : round.show_ballot_animation ? "Animación en curso…"
      // -- Papeletas estáticas desactivadas temporalmente --
      // : !round.show_ballot_summary_projection ? "Ver papeletas"
      : selectionQuotaReached ? "Confirmar selección"
      : canStartNextRound ? "Finalizar ronda"
      : "Votación completada";

    const disabled = Boolean(
      isWorkflowRunning ||
      !round ||
      round.is_closed ||
      (!round.round_finalized && !canOpenRoom && !canFinalizeRound && !canStartRound) ||
      // Bloquear botón principal mientras la animación está activa (usar botón "Saltar" para avanzar)
      (round.round_finalized && round.show_ballot_animation) ||
      // -- Papeletas estáticas desactivadas temporalmente --
      // (round.round_finalized && round.show_ballot_summary_projection && !selectionQuotaReached && !canStartNextRound),
      (round.round_finalized && round.show_results_to_voters && !selectionQuotaReached && !canStartNextRound),
    );

    const votingStarted = Boolean(
      round && (round.is_active || round.is_closed || round.round_finalized || round.current_round_number > 1 || currentRoundVotes > 0)
    );

    return {
      stage, label, disabled,
      roomIsOpen, canOpenRoom, canCloseRoom,
      canStartRound, canPauseRound, canResumeRound,
      canFinalizeRound, canStartNextRound,
      votingStarted,
    };
  }, [round, hasCandidates, selectionQuotaReached, currentRoundVotes, isWorkflowRunning]);
}
