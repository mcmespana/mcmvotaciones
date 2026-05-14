import { useState, useEffect, useMemo } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Check } from "lucide-react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import type { CandidateRow, RoundResultRow } from "@/types/db";
import { formatCandidateName, getRoundTeamLabel } from "@/lib/candidateFormat";
import { PChip, ProjAvatar, BallotsGrid } from "./_shared";

type Candidate = CandidateRow;
type RoundResult = Pick<RoundResultRow, 'candidate_id' | 'vote_count' | 'percentage'>;

interface ProjectionResultsProps {
  roundTitle: string;
  roundNumber: number;
  team: string;
  results: RoundResult[];
  candidates: Candidate[];
  selectedCandidates: Candidate[];
  showBallotSummary: boolean;
  ballotSummaries: BallotSummary[];
}

const TOP_N = 5;
const REVEAL_MS = 700;

export function ProjectionResults({
  roundTitle,
  roundNumber,
  team,
  results,
  candidates,
  selectedCandidates,
  showBallotSummary,
  ballotSummaries,
}: ProjectionResultsProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [showSelected, setShowSelected] = useState(false);
  const [ballotsRef] = useAutoAnimate();

  const displayResults = useMemo(() => [...results].sort((a, b) => b.vote_count - a.vote_count), [results]);
  const top5Sorted = useMemo(() => displayResults.slice(0, TOP_N), [displayResults]);
  const restResults = useMemo(() => displayResults.slice(TOP_N), [displayResults]);
  const selectedIds = useMemo(() => new Set(selectedCandidates.map((c) => c.id)), [selectedCandidates]);

  const rankById = useMemo(() => {
    const map = new Map<string, number>();
    let rank = 1;
    for (let i = 0; i < displayResults.length; i++) {
      if (i > 0 && displayResults[i].vote_count < displayResults[i - 1].vote_count) rank = i + 1;
      map.set(displayResults[i].candidate_id, rank);
    }
    return map;
  }, [displayResults]);

  useEffect(() => {
    setRevealedCount(0);
    setShowSelected(false);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= top5Sorted.length) { clearInterval(interval); setTimeout(() => setShowSelected(true), 800); }
    }, REVEAL_MS);
    return () => clearInterval(interval);
  }, [top5Sorted.length]);

  const revealedIds = new Set(top5Sorted.slice(0, revealedCount).map((r) => r.candidate_id));

  const selectedSidebar = (showSelected || showBallotSummary) && selectedCandidates.length > 0 && (
    <div className="proj-sidebar">
      <div className="proj-sidebar-header">
        <Check size={16} color="var(--avd-ok)" strokeWidth={3} />
        <span className="proj-sidebar-label">Seleccionados</span>
      </div>
      <div className="proj-sidebar-body">
        {selectedCandidates.map((c) => (
          <div key={c.id} className="proj-sidebar-item">
            <ProjAvatar name={c.name} surname={c.surname} imageUrl={c.image_url} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="proj-sidebar-item-row">
                <div className="proj-sidebar-name">{formatCandidateName(c)}</div>
                {c.selected_in_round != null && (
                  <span className="proj-sidebar-round">R{c.selected_in_round}</span>
                )}
              </div>
              {c.location && <div className="proj-sidebar-loc">{c.location}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="proj-page overflow-visible relative">
      {/* Ambient orbs */}
      <div className="proj-orb proj-orb-a" />
      <div className="proj-orb proj-orb-b" />
      {/* Header */}
      <header className="proj-topbar">
        <div className="proj-logo">C</div>
        <span className="proj-wordmark">VotacionesMCM</span>
        <div className="proj-topbar-divider" />
        <h1 className="proj-topbar-title">{roundTitle}</h1>
        <PChip kind="yellow" label={getRoundTeamLabel(team)} />
        <PChip kind="blue" label={`Ronda ${roundNumber}`} />
        {selectedCandidates.length > 0 && <PChip kind="emerald" label={`${selectedCandidates.length} seleccionados`} />}
        <div className="proj-topbar-meta">
          <span className="proj-header-side">{displayResults.length} candidatos votados</span>
        </div>
      </header>

      {/* Body */}
      <div className="proj-body">
        {!showBallotSummary ? (
          <>
            <div className="proj-results-main">
              {displayResults.length === 0 && (
                <div className="proj-results-empty">No hay resultados para mostrar.</div>
              )}

              {/* Top 5: animated — primero para jerarquía visual */}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
                {top5Sorted.map((result) => {
                  const cand = candidates.find((c) => c.id === result.candidate_id);
                  if (!cand) return null;
                  const isRevealed = revealedIds.has(result.candidate_id);
                  const isTop = selectedIds.has(result.candidate_id);
                  const rank = rankById.get(result.candidate_id) ?? 0;
                  const pct = Math.min(Math.max(result.percentage, 0), 100);
                  if (!isRevealed) {
                    return <div key={result.candidate_id} className="proj-row-skeleton" />;
                  }
                  return <ResultRow key={result.candidate_id} cand={cand} result={result} rank={rank} isTop={isTop} pct={pct} animated />;
                })}
              </div>

              {/* Resto (6+): grid estático debajo */}
              {restResults.length > 0 && (
                <>
                  <div className="proj-results-rest-label">Resto de candidatos</div>
                  <div className="grid grid-cols-2 gap-[10px]">
                    {restResults.map((result) => {
                      const cand = candidates.find((c) => c.id === result.candidate_id);
                      if (!cand) return null;
                      const rank = rankById.get(result.candidate_id) ?? 0;
                      const isTop = selectedIds.has(result.candidate_id);
                      const pct = Math.min(Math.max(result.percentage, 0), 100);
                      return <ResultRow key={result.candidate_id} cand={cand} result={result} rank={rank} isTop={isTop} pct={pct} animated={false} />;
                    })}
                  </div>
                </>
              )}
            </div>
            {selectedSidebar}
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
            {selectedSidebar || (
              <div className="proj-sidebar-empty">
                <div className="text-center p-6">
                  <div className="text-base font-bold text-avd-fg-muted">Sin seleccionados</div>
                  <div className="text-[13px] text-[var(--avd-fg-faint)] mt-[6px]">Ningún candidato superó el 50%.</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  cand,
  result,
  rank,
  isTop,
  pct,
  animated,
}: {
  cand: { name: string; surname: string; location: string | null; image_url?: string | null };
  result: RoundResult;
  rank: number;
  isTop: boolean;
  pct: number;
  animated: boolean;
}) {
  return (
    <div className={`proj-row${isTop ? " proj-row--top" : ""}${!animated ? " proj-row--static" : ""}`}>
      <div className="proj-avatar-wrap">
        <ProjAvatar name={cand.name} surname={cand.surname} imageUrl={cand.image_url} size="md" />
        <div className={`proj-rank-num${isTop ? " proj-rank-num--top" : ""}`}>
          {isTop ? "✓" : rank}
        </div>
      </div>
      <div className="min-w-0">
        <div className="proj-row-name">
          {formatCandidateName(cand)}
          {isTop && <span className="proj-selected-badge">Seleccionado</span>}
        </div>
        {cand.location && <div className="proj-row-loc">{cand.location}</div>}
        <div className="proj-row-bar-wrap">
          <div className="proj-row-bar">
            <div className="proj-row-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="proj-row-pct">{result.percentage.toFixed(1)}%</span>
        </div>
      </div>
      <div className="proj-row-votes">
        <div className="proj-row-votes-num">{result.vote_count}</div>
        <div className="proj-row-votes-unit">votos</div>
      </div>
    </div>
  );
}
