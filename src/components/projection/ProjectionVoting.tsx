import { useEffect, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { getRoundTeamLabel } from "@/lib/candidateFormat";
import { PChip, AccentBar, SelectedCandidatesSidebar, BallotsGrid } from "./_shared";

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
  const [ballotsRef] = useAutoAnimate();

  useEffect(() => {
    let t: number | null = null;
    if (voteCount > prev) { setFlash(true); t = window.setTimeout(() => setFlash(false), 700); }
    setPrev(voteCount);
    return () => { if (t !== null) window.clearTimeout(t); };
  }, [voteCount, prev]);

  return (
    <div className="proj-page">
      {/* Ambient orbs */}
      <div className="proj-orb proj-orb-a" style={flash ? { background: 'color-mix(in oklch, var(--proj-emerald) 9%, transparent)' } : undefined} />
      <div className="proj-orb proj-orb-b" />

      {/* Header */}
      <header className="proj-topbar">
        <div className="proj-logo">C</div>
        <span className="proj-wordmark">VotacionesMCM</span>
        <div className="proj-topbar-divider" />
        <h1 className="proj-topbar-title">{roundTitle}</h1>
        <PChip kind="yellow" label={getRoundTeamLabel(team)} />
        <PChip kind="blue" label={`Ronda ${roundNumber}`} />
        <PChip kind="emerald" label="En curso" pulse />
        <div className="proj-topbar-meta">
          <div className="proj-conn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="tabular-nums">{connectedCount} conectados</span>
          </div>
          <div className="proj-timer">{formatTime(elapsedSeconds)}</div>
        </div>
      </header>

      {/* Body */}
      <div
        className="proj-body relative z-[1]"
        style={{ display: 'grid', gridTemplateColumns: '1fr 380px' }}
      >
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

            <SelectedCandidatesSidebar candidates={previouslySelected} />
          </>
        ) : (
          <>
            <div className="proj-ballots-panel">
              <div className="proj-ballots-meta">
                <div className="proj-ballots-label mb-0">Papeletas registradas</div>
                <div className="proj-ballots-count">
                  <strong>{ballotSummaries.length}</strong> emitidas
                </div>
              </div>
              <div ref={ballotsRef} className="flex-1 min-h-0 flex flex-col">
                <BallotsGrid summaries={ballotSummaries} />
              </div>
            </div>
            <SelectedCandidatesSidebar candidates={previouslySelected} />
          </>
        )}
      </div>

      {flash && <div className="proj-flash-overlay" />}
    </div>
  );
}
