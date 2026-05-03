import { useState, useEffect, useMemo } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Check } from "lucide-react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import type { CandidateRow, RoundResultRow } from "@/types/db";
import { formatCandidateName } from "@/lib/candidateFormat";
import { Chip, BallotsGrid } from "./_shared";

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
            <div className="proj-sidebar-item-row">
              <div className="proj-sidebar-name">{formatCandidateName(c)}</div>
              {c.selected_in_round != null && (
                <span className="proj-sidebar-round">R{c.selected_in_round}</span>
              )}
            </div>
            {c.location && <div className="proj-sidebar-loc">{c.location}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="proj-page" style={{ overflow: "unset" }}>
      {/* Header */}
      <div className="proj-header">
        <h1 className="proj-header-title">{roundTitle}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
          <Chip kind="warn" label={(team === "ECE" || team === "ECL") ? `🏆 ${team}` : team} />
          <Chip kind="brand" label={`Ronda ${roundNumber}`} />
          {selectedCandidates.length > 0 && <Chip kind="ok" label={`${selectedCandidates.length} seleccionados`} />}
        </div>
        <div className="proj-spacer" />
        <div className="proj-header-meta">{displayResults.length} candidatos votados</div>
      </div>

      {/* Body */}
      <div className="proj-body">
        {!showBallotSummary ? (
          <>
            <div className="proj-results-main">
              {displayResults.length === 0 && (
                <div className="proj-results-empty">No hay resultados para mostrar.</div>
              )}

              {/* Top 5: animated — primero para jerarquía visual */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {top5Sorted.map((result) => {
                  const cand = candidates.find((c) => c.id === result.candidate_id);
                  if (!cand) return null;
                  const isRevealed = revealedIds.has(result.candidate_id);
                  const isTop = selectedIds.has(result.candidate_id);
                  const rank = rankById.get(result.candidate_id) ?? 0;
                  const pct = Math.min(Math.max(result.percentage, 0), 100);
                  if (!isRevealed) {
                    return <div key={result.candidate_id} className="proj-skeleton" />;
                  }
                  return <ResultRow key={result.candidate_id} cand={cand} result={result} rank={rank} isTop={isTop} pct={pct} animated />;
                })}
              </div>

              {/* Resto (6+): grid estático debajo */}
              {restResults.length > 0 && (
                <>
                  <div className="proj-results-rest-label">Resto de candidatos</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
              <div className="proj-ballots-label">Papeletas registradas</div>
              <div ref={ballotsRef}>
                <BallotsGrid summaries={ballotSummaries} />
              </div>
            </div>
            {selectedSidebar || (
              <div className="proj-sidebar-empty">
                <div style={{ textAlign: "center", padding: 24 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--avd-fg-muted)" }}>Sin seleccionados</div>
                  <div style={{ fontSize: 13, color: "var(--avd-fg-faint)", marginTop: 6 }}>Ningún candidato superó el 50%.</div>
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
  cand: { name: string; surname: string; location: string | null };
  result: RoundResult;
  rank: number;
  isTop: boolean;
  pct: number;
  animated: boolean;
}) {
  return (
    <div className={`proj-result-row${isTop ? " proj-result-row--top" : ""}${!animated ? " proj-result-row--static" : ""}`}>
      <div className={`proj-result-accent${isTop ? " proj-result-accent--top" : ""}`} />

      <div className={`proj-rank-bubble${isTop ? " proj-rank-bubble--top" : ""}`}>
        {isTop ? <Check size={20} strokeWidth={3} /> : rank}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={`proj-result-name${isTop ? " proj-result-name--top" : ""}`}>
          {formatCandidateName(cand)}
          {isTop && <span className="proj-selected-badge">SELECCIONADO</span>}
        </div>
        {cand.location && <div className="proj-result-location">{cand.location}</div>}
        <div className="proj-result-bar-row">
          <div className="proj-result-bar">
            <div className={`proj-result-bar-fill${isTop ? " proj-result-bar-fill--top" : ""}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="proj-result-pct">{result.percentage.toFixed(1)}%</span>
        </div>
      </div>

      <div className="proj-result-vote-block">
        <div className="proj-result-votes-num">{result.vote_count}</div>
        <div className="proj-result-votes-unit">votos</div>
      </div>
    </div>
  );
}
