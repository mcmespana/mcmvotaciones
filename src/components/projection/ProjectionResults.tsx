import { useState, useEffect, useMemo } from "react";
import { Trophy, Award, Medal } from "lucide-react";
import type { BallotSummary } from "@/hooks/useProjectionData";

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

const MEDAL_ICONS = [
  { icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/20" },
  { icon: Award, color: "text-gray-300", bg: "bg-gray-400/20" },
  { icon: Medal, color: "text-amber-600", bg: "bg-amber-600/20" },
];

const REVEAL_INTERVAL_MS = 1500; // Time per candidate reveal

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
  // Reveal candidates one by one from bottom to top
  const [revealedCount, setRevealedCount] = useState(0);
  const [showSelected, setShowSelected] = useState(false);

  // Results sorted by votes ascending (reveal bottom-up)
  const sortedResults = useMemo(
    () => [...results].sort((a, b) => a.vote_count - b.vote_count),
    [results]
  );

  // For display: top-down (highest first)
  const displayResults = useMemo(
    () => [...results].sort((a, b) => b.vote_count - a.vote_count),
    [results]
  );

  useEffect(() => {
    setRevealedCount(0);
    setShowSelected(false);

    // Reveal results one by one
    const totalToReveal = sortedResults.length;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= totalToReveal) {
        clearInterval(interval);
        // Show selected candidates after all results revealed
        setTimeout(() => setShowSelected(true), 1000);
      }
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [sortedResults.length]);

  // Set of revealed candidate IDs (reveal from bottom = lowest votes first)
  const revealedIds = new Set(
    sortedResults.slice(0, revealedCount).map((r) => r.candidate_id)
  );

  const maxVotes = displayResults.length > 0 ? displayResults[0].vote_count : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-12 py-8 border-b border-white/10 text-center">
        <h1 className="text-4xl font-bold mb-1">
          📊 Resultados — Ronda {roundNumber}
        </h1>
        <p className="text-white/50 text-lg">
          {roundTitle} · 🏆 {team}
        </p>
      </div>

      <div className="flex-1 flex gap-8 px-12 py-8 overflow-hidden">
        {/* Results list (left side - larger) */}
        <div className="flex-1 overflow-y-auto pr-4 space-y-3">
          {displayResults.map((result, index) => {
            const candidate = candidates.find(
              (c) => c.id === result.candidate_id
            );
            if (!candidate) return null;

            const isRevealed = revealedIds.has(result.candidate_id);
            const isTopCandidate = candidate.is_selected;
            const medal = index < 3 ? MEDAL_ICONS[index] : null;
            const MedalIcon = medal?.icon;
            const barWidth = maxVotes > 0 ? (result.vote_count / maxVotes) * 100 : 0;

            return (
              <div
                key={result.candidate_id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-700 ${
                  isRevealed
                    ? isTopCandidate
                      ? "bg-green-500/10 border-green-500/30 scale-100 opacity-100"
                      : "bg-white/5 border-white/10 scale-100 opacity-100"
                    : "bg-transparent border-transparent scale-95 opacity-0"
                }`}
              >
                {/* Position */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xl ${
                    medal
                      ? `${medal.bg} ${medal.color}`
                      : isTopCandidate
                      ? "bg-green-500/20 text-green-400"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {MedalIcon ? (
                    <MedalIcon className="w-7 h-7" />
                  ) : isTopCandidate ? (
                    "✓"
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-bold truncate">
                      {candidate.name} {candidate.surname}
                    </span>
                    {isTopCandidate && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white font-medium flex-shrink-0">
                        SELECCIONADO
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          isTopCandidate ? "bg-green-500" : "bg-primary"
                        }`}
                        style={{
                          width: isRevealed ? `${barWidth}%` : "0%",
                          transitionDelay: "300ms",
                        }}
                      />
                    </div>
                    <span className="text-lg font-bold tabular-nums w-20 text-right">
                      {isRevealed ? `${result.percentage.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>

                {/* Vote count */}
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-bold tabular-nums">
                    {isRevealed ? result.vote_count : "?"}
                  </div>
                  <div className="text-xs text-white/40 uppercase">votos</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected candidates panel (right side) */}
        {showSelected && selectedCandidates.length > 0 && (
          <div
            className="w-80 flex-shrink-0 border-l border-white/10 pl-8 transition-all duration-1000 animate-in slide-in-from-right"
          >
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-7 h-7 text-yellow-400" />
              Seleccionados
            </h2>
            <div className="space-y-4">
              {selectedCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30"
                >
                  <div className="font-bold text-lg text-green-300">
                    {candidate.name} {candidate.surname}
                  </div>
                  {candidate.location && (
                    <div className="text-sm text-green-400/60 mt-1">
                      📍 {candidate.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showBallotSummary && (
        <div className="px-12 pb-8">
          <div className="w-full rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm uppercase tracking-wide text-white/70 mb-3">Papeletas publicadas</p>
            {ballotSummaries.length === 0 ? (
              <p className="text-sm text-white/50">Aun no hay papeletas validas registradas.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {ballotSummaries.map((ballot) => (
                  <div key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-sm font-bold">{ballot.voteCode}</p>
                      <p className="text-xs text-white/50">R{ballot.roundNumber}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>1. {ballot.votes[0] || "-"}</p>
                      <p>2. {ballot.votes[1] || "-"}</p>
                      <p>3. {ballot.votes[2] || "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
