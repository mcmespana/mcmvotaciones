import { useEffect, useState } from "react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { getRoundTeamLabel } from "@/lib/candidateFormat";
import { Chip, SelectedCandidatesSidebar, BallotTicker } from "./_shared";

interface SelectedCandidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  selected_in_round: number | null;
  selected_vote_count: number | null;
}

interface ProjectionVotingProps {
  roundTitle: string;
  roundNumber: number;
  team: string;
  voteCount: number;
  maxVotantes: number;
  elapsedSeconds: number;
  connectedCount: number;
  showBallotSummary: boolean;
  ballotSummaries: BallotSummary[];
  previouslySelected: SelectedCandidate[];
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function ProjectionVoting({
  roundTitle,
  roundNumber,
  team,
  voteCount,
  maxVotantes,
  elapsedSeconds,
  connectedCount,
  showBallotSummary,
  ballotSummaries,
  previouslySelected,
}: ProjectionVotingProps) {
  const percentage = maxVotantes > 0 ? Math.min((voteCount / maxVotantes) * 100, 100) : 0;
  const [flash, setFlash] = useState(false);
  const [prev, setPrev] = useState(voteCount);

  useEffect(() => {
    let t: number | null = null;
    if (voteCount > prev) { setFlash(true); t = window.setTimeout(() => setFlash(false), 700); }
    setPrev(voteCount);
    return () => { if (t !== null) window.clearTimeout(t); };
  }, [voteCount, prev]);

  return (
    <div className="proj-page">
      {/* Ambient orbs */}
      <div className={`proj-orb w-[500px] h-[500px] blur-[90px] top-[-10%] right-[5%] [animation:proj-orb-slow-a_20s_ease-in-out_infinite] transition-[background] duration-[0.6s] ${flash ? 'bg-[color-mix(in_oklch,var(--avd-ok)_7%,transparent)]' : 'bg-[color-mix(in_oklch,var(--avd-brand)_5%,transparent)]'}`} />
      <div className="proj-orb w-[400px] h-[400px] bg-[color-mix(in_oklch,var(--avd-brand)_4%,transparent)] blur-[70px] bottom-0 left-[-5%] [animation:proj-orb-slow-b_26s_ease-in-out_infinite]" />

      {/* Header */}
      <div className="proj-header">
        <div>
          <h1 className="proj-header-title proj-header-title--lg">{roundTitle}</h1>
        </div>
        <div className="flex items-center gap-[10px] ml-2">
          <Chip kind="warn" label={getRoundTeamLabel(team)} />
          <Chip kind="brand" label={`Ronda ${roundNumber}`} />
        </div>
        <div className="proj-spacer" />
        <div className="proj-header-actions">
          <div className="proj-connected">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {connectedCount} conectados
          </div>
          <div className="proj-timer">{formatTime(elapsedSeconds)}</div>
        </div>
      </div>

      {/* Body */}
      <div className={`proj-body grid relative z-[1] ${showBallotSummary ? 'grid-cols-1' : '[grid-template-columns:1.6fr_1fr]'}`}>
        {!showBallotSummary ? (
          <>
            {/* Left: vote count */}
            <div className="proj-panel-left">
              <div className="proj-label">Votos recibidos</div>
              <div className={`proj-vote-count-row ${flash ? 'scale-[1.04]' : 'scale-100'} transition-transform`}>
                <span className={`proj-vote-num${flash ? " proj-vote-num--flash" : ""}`}>
                  {voteCount}
                </span>
                <span className="proj-vote-max">/ {maxVotantes}</span>
              </div>

              <div className="proj-progress-section">
                <div className="proj-progress-header">
                  <span className="proj-progress-label">Avance</span>
                  <span className="proj-progress-pct">{percentage.toFixed(0)}%</span>
                </div>
                <div className="proj-progress-bar">
                  <div className="proj-progress-fill" style={{ width: `${percentage}%` }} />
                </div>
              </div>

              {percentage >= 100 && (
                <div className="proj-votes-complete">
                  Todos los votos han sido emitidos.
                </div>
              )}
            </div>

            {/* Right: selected */}
            <div className="border-l border-avd-border">
              <SelectedCandidatesSidebar candidates={previouslySelected} />
            </div>
          </>
        ) : (
          /* Ballot ticker view */
          <div className="flex flex-col gap-5 py-10 px-10 min-w-0">
            <div className="proj-label">Papeletas registradas · {ballotSummaries.length} votos</div>
            <BallotTicker summaries={ballotSummaries} />
          </div>
        )}
      </div>

      {flash && <div className="proj-flash-overlay" />}
    </div>
  );
}
