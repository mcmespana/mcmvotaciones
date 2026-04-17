import { useEffect, useState } from "react";
import { BarChart3, Clock3, Users, Vote } from "lucide-react";
import { Chip, Meter, ProgressBar, ProgressCircle, Skeleton, Surface } from "@heroui/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    let timeoutId: number | null = null;

    if (voteCount > prevVoteCount) {
      setLastVoteFlash(true);
      timeoutId = window.setTimeout(() => setLastVoteFlash(false), 800);
    }

    setPrevVoteCount(voteCount);

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [voteCount, prevVoteCount]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-900 dark:from-slate-950 dark:via-blue-950/40 dark:to-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6%] top-[-5%] h-[360px] w-[360px] rounded-full bg-blue-500/25 blur-3xl dark:bg-blue-500/15" />
        <div className="absolute bottom-[-8%] right-[-10%] h-[360px] w-[360px] rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/20" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <Surface className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_32px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/75">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">{roundTitle}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip color="warning" variant="flat" className="font-semibold">🏆 {team}</Chip>
                <Chip color="primary" variant="bordered" className="font-semibold">Ronda {roundNumber}</Chip>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                <Users className="h-4 w-4" />
                {connectedCount} conectados
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100">
                <Clock3 className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                {formatTime(elapsedSeconds)}
              </div>
            </div>
          </div>
        </Surface>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-cyan-300/50 bg-white/85 dark:border-cyan-400/20 dark:bg-slate-900/75">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
                Votos recibidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-center transition-all duration-300 ${
                  lastVoteFlash ? "scale-105" : "scale-100"
                }`}
              >
                <Vote
                  className={`mx-auto mb-2 h-12 w-12 transition-colors duration-300 ${
                    lastVoteFlash ? "text-emerald-500" : "text-cyan-600 dark:text-cyan-300"
                  }`}
                />
                <p className="text-7xl font-black tabular-nums leading-none text-slate-900 dark:text-white sm:text-8xl">
                  {voteCount}
                </p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  de {maxVotantes} votos
                </p>
              </div>

              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span>Avance de votacion</span>
                  <span className="text-slate-900 dark:text-white">{percentage.toFixed(0)}%</span>
                </div>
                <ProgressBar
                  aria-label="Avance"
                  value={percentage}
                  maxValue={100}
                  className="w-full [&_[data-slot=progress-bar-track]]:h-4 [&_[data-slot=progress-bar-track]]:bg-slate-200 dark:[&_[data-slot=progress-bar-track]]:bg-slate-700"
                />
                <Meter
                  aria-label="Votos emitidos"
                  value={voteCount}
                  minValue={0}
                  maxValue={Math.max(maxVotantes, 1)}
                  className="w-full [&_[data-slot=meter-track]]:h-2 [&_[data-slot=meter-track]]:bg-slate-200 dark:[&_[data-slot=meter-track]]:bg-slate-700"
                />
              </div>

              {percentage >= 100 && (
                <div className="mt-6 rounded-2xl border border-emerald-300/70 bg-emerald-500/15 px-4 py-3 text-center text-sm font-bold text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300">
                  Todos los votos han sido emitidos.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-slate-300/70 bg-white/80 dark:border-slate-700 dark:bg-slate-900/75">
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Participacion</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{percentage.toFixed(0)}%</p>
                </div>
                <div className="relative flex h-24 w-24 items-center justify-center">
                  <ProgressCircle aria-label="Participacion" value={percentage} className="h-24 w-24 text-blue-600 dark:text-blue-300" />
                  <BarChart3 className="absolute h-7 w-7 text-blue-700 dark:text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-300/70 bg-white/80 dark:border-slate-700 dark:bg-slate-900/75">
              <CardHeader>
                <CardTitle className="text-base uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
                  Estado de mesa
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 pt-2">
                <div className="rounded-2xl border border-slate-300/80 bg-slate-100/90 p-3 text-center dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-2xl font-black tabular-nums">{connectedCount}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Conectados</p>
                </div>
                <div className="rounded-2xl border border-slate-300/80 bg-slate-100/90 p-3 text-center dark:border-slate-700 dark:bg-slate-800/70">
                  <p className="text-2xl font-black tabular-nums">{maxVotantes}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Meta</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showBallotSummary && (
          <Card className="border-slate-300/70 bg-white/80 dark:border-slate-700 dark:bg-slate-900/75">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
                Papeletas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {ballotSummaries.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 dark:text-slate-300">Aun no hay papeletas validas registradas.</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-28 w-full rounded-2xl" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {ballotSummaries.map((ballot) => (
                    <div
                      key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`}
                      className="rounded-2xl border border-slate-300/80 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{ballot.voteCode}</p>
                        <Chip size="sm" color="primary" variant="flat">R{ballot.roundNumber}</Chip>
                      </div>
                      <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        <p>1. {ballot.votes[0] || "-"}</p>
                        <p>2. {ballot.votes[1] || "-"}</p>
                        <p>3. {ballot.votes[2] || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {lastVoteFlash && (
          <div className="pointer-events-none absolute inset-0 bg-emerald-500/10 transition-opacity duration-500" />
        )}
      </div>
    </div>
  );
}
