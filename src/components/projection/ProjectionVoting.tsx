import { useEffect, useState } from "react";
import { Vote, Clock, Users } from "lucide-react";
import type { BallotSummary } from "@/hooks/useProjectionData";

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
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
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
}: ProjectionVotingProps) {
  const percentage =
    maxVotantes > 0 ? Math.min((voteCount / maxVotantes) * 100, 100) : 0;
  const [lastVoteFlash, setLastVoteFlash] = useState(false);
  const [prevVoteCount, setPrevVoteCount] = useState(voteCount);

  // Flash animation when a new vote comes in
  useEffect(() => {
    if (voteCount > prevVoteCount) {
      setLastVoteFlash(true);
      setTimeout(() => setLastVoteFlash(false), 800);
    }
    setPrevVoteCount(voteCount);
  }, [voteCount, prevVoteCount]);

  // Seat grid visualization (up to 100 seats)
  const visibleSeats = Math.min(maxVotantes, 100);
  const seatSize = visibleSeats <= 25 ? "w-6 h-6" : visibleSeats <= 50 ? "w-4 h-4" : "w-3 h-3";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-12 py-8 border-b border-white/10">
        <div>
          <h1 className="text-4xl font-bold">{roundTitle}</h1>
          <p className="text-white/50 text-lg mt-1">
            🏆 {team} · Ronda {roundNumber}
          </p>
        </div>
        <div className="flex items-center gap-8">
          {/* Connected count */}
          <div className="flex items-center gap-2 text-white/50">
            <Users className="w-5 h-5" />
            <span className="text-lg tabular-nums">{connectedCount}</span>
          </div>
          {/* Timer */}
          <div className="flex items-center gap-2 bg-white/5 px-6 py-3 rounded-xl border border-white/10">
            <Clock className="w-5 h-5 text-white/50" />
            <span className="text-3xl font-mono font-bold tabular-nums">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 py-8">
        {/* Vote counter - huge */}
        <div
          className={`text-center mb-12 transition-all duration-300 ${
            lastVoteFlash ? "scale-110" : "scale-100"
          }`}
        >
          <Vote
            className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
              lastVoteFlash ? "text-green-400" : "text-primary"
            }`}
          />
          <div className="text-9xl font-bold tabular-nums leading-none">
            {voteCount}
          </div>
          <div className="text-2xl text-white/50 mt-2">
            de {maxVotantes} votos
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-2xl mb-12">
          <div className="flex justify-between text-sm text-white/50 mb-2">
            <span>Progreso de votación</span>
            <span className="tabular-nums font-bold text-white">
              {percentage.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
              style={{
                width: `${percentage}%`,
                background:
                  percentage >= 100
                    ? "linear-gradient(90deg, #10B981, #059669)"
                    : "linear-gradient(90deg, #3B82F6, #6366F1)",
              }}
            >
              {/* Shimmer effect */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                  animation: "shimmer 2s infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Seat grid */}
        <div className="flex flex-wrap justify-center gap-1.5 max-w-xl">
          {Array.from({ length: visibleSeats }).map((_, i) => (
            <div
              key={i}
              className={`${seatSize} rounded-sm transition-all duration-500 ${
                i < voteCount
                  ? "bg-primary shadow-sm shadow-primary/30"
                  : "bg-white/10"
              }`}
              style={{
                transitionDelay: `${(i % 10) * 30}ms`,
              }}
            />
          ))}
        </div>

        {showBallotSummary && (
          <div className="w-full max-w-5xl mt-8 rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm uppercase tracking-wide text-white/70 mb-3">Resumen de papeletas (ronda actual)</p>
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
        )}

        {/* Full indicator */}
        {percentage >= 100 && (
          <div className="mt-8 bg-green-500/20 border border-green-500/30 rounded-xl px-8 py-4 text-center animate-pulse">
            <p className="text-xl font-bold text-green-400">
              ✅ Todos los votos emitidos
            </p>
          </div>
        )}
      </div>

      {/* Flash overlay on new vote */}
      {lastVoteFlash && (
        <div className="absolute inset-0 bg-green-500/5 pointer-events-none transition-opacity duration-500" />
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
