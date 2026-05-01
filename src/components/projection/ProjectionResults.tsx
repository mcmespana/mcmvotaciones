import { useState, useEffect, useMemo } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Check } from "lucide-react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { formatCandidateName } from "@/lib/candidateFormat";
import { Chip, BallotsGrid } from "./_shared";

interface Candidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  group_name: string | null;
  age: number | null;
  image_url: string | null;
  is_eliminated: boolean;
  is_selected: boolean;
  selected_in_round: number | null;
}

interface RoundResult {
  candidate_id: string;
  vote_count: number;
  percentage: number;
}

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
    <div style={{ width: 320, flexShrink: 0, background: "var(--avd-bg-elev)", borderLeft: "1px solid var(--avd-border)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--avd-border)", display: "flex", alignItems: "center", gap: 10 }}>
        <Check size={16} color="var(--avd-ok)" strokeWidth={3} />
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)" }}>Seleccionados</span>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {selectedCandidates.map((c) => (
          <div key={c.id} style={{ padding: "16px 24px", borderBottom: "1px solid var(--avd-border-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--avd-ok-fg)", lineHeight: 1.2 }}>{formatCandidateName(c)}</div>
              {c.selected_in_round != null && (
                <span style={{ background: "var(--avd-brand-bg)", color: "var(--avd-brand-subtle)", border: "1px solid var(--avd-brand-border)", borderRadius: 9999, padding: "2px 10px", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>R{c.selected_in_round}</span>
              )}
            </div>
            {c.location && <div style={{ fontSize: 14, color: "var(--avd-fg-muted)", fontWeight: 500, marginTop: 4 }}>{c.location}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--avd-bg)", fontFamily: "var(--avd-font-sans)", color: "var(--avd-fg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 32px", background: "var(--avd-bg-elev)", borderBottom: "1px solid var(--avd-border)", flexShrink: 0, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>Resultados — Ronda {roundNumber}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
          <Chip kind="warn" label={(team === "ECE" || team === "ECL") ? `🏆 ${team}` : team} />
          <Chip kind="brand" label={roundTitle} />
          {selectedCandidates.length > 0 && <Chip kind="ok" label={`${selectedCandidates.length} seleccionados`} />}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 14, color: "var(--avd-fg-muted)", fontWeight: 600 }}>{displayResults.length} candidatos votados</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {!showBallotSummary ? (
          <>
            <div style={{ flex: 1, padding: "28px 36px", overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
              {displayResults.length === 0 && (
                <div style={{ fontSize: 18, color: "var(--avd-fg-muted)", textAlign: "center", padding: 40 }}>No hay resultados para mostrar.</div>
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
                    return <div key={result.candidate_id} style={{ height: 120, borderRadius: 12, background: "var(--avd-bg-sunken)", animation: "pulse 1.5s ease-in-out infinite" }} />;
                  }
                  return <ResultRow key={result.candidate_id} cand={cand} result={result} rank={rank} isTop={isTop} pct={pct} animated />;
                })}
              </div>

              {/* Resto (6+): grid estático debajo */}
              {restResults.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginTop: 4 }}>
                    Resto de candidatos
                  </div>
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
            <div style={{ flex: 1, padding: "28px 36px", overflow: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginBottom: 20 }}>Papeletas registradas</div>
              <div ref={ballotsRef}>
                <BallotsGrid summaries={ballotSummaries} />
              </div>
            </div>
            {selectedSidebar || (
              <div style={{ width: 280, flexShrink: 0, background: "var(--avd-bg-elev)", borderLeft: "1px solid var(--avd-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
  const accentColor = isTop
    ? "var(--avd-ok-600, #16a34a)"
    : "var(--avd-brand-600)";

  return (
    <div style={{
      background: isTop ? "var(--avd-ok-bg)" : "var(--avd-surface)",
      border: `1px solid ${isTop ? "color-mix(in oklch, var(--avd-ok) 35%, transparent)" : "var(--avd-border)"}`,
      borderRadius: 12,
      padding: "18px 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
      position: "relative",
      overflow: "hidden",
      ...(animated ? { animation: "fadeIn 0.35s ease-out" } : {}),
    }}>
      {/* Left accent bar */}
      <div style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3, background: accentColor }} />

      {/* Rank bubble */}
      <div style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: isTop ? "var(--avd-ok)" : "var(--avd-brand-bg)", color: isTop ? "white" : "var(--avd-brand)", fontWeight: 800, fontSize: 18 }}>
        {isTop ? <Check size={20} strokeWidth={3} /> : rank}
      </div>

      {/* Name + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: isTop ? "var(--avd-ok-fg)" : "var(--avd-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
          {formatCandidateName(cand)}
          {isTop && (
            <span style={{ fontSize: 11, fontWeight: 700, background: "var(--avd-ok)", color: "white", borderRadius: 9999, padding: "1px 8px", flexShrink: 0 }}>SELECCIONADO</span>
          )}
        </div>
        {cand.location && <div style={{ fontSize: 13, color: "var(--avd-fg-muted)", marginTop: 2 }}>{cand.location}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 4, background: "var(--avd-border-soft)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: isTop ? "var(--avd-ok)" : "var(--avd-brand-600)", borderRadius: 4, transition: "width 1s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--avd-fg)", minWidth: 46, textAlign: "right" }}>{result.percentage.toFixed(1)}%</span>
        </div>
      </div>

      {/* Vote count */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 44, fontWeight: 800, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1, color: "var(--avd-fg)" }}>{result.vote_count}</div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--avd-fg-subtle)" }}>votos</div>
      </div>
    </div>
  );
}
