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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-fixed/65 via-surface-container-lowest to-surface-container-low text-foreground dark:from-background dark:via-surface-container-low dark:to-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-6%] top-[-5%] h-[360px] w-[360px] rounded-full bg-primary/22 blur-3xl dark:bg-primary/16" />
        <div className="absolute bottom-[-8%] right-[-10%] h-[360px] w-[360px] rounded-full bg-primary-container/20 blur-3xl dark:bg-primary-container/22" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-8 p-8 sm:p-12 lg:p-16">
        <Surface className="rounded-[3rem] border-2 border-outline-variant/55 bg-surface-container-lowest/90 p-10 flex-shrink-0 shadow-tech backdrop-blur-xl dark:border-outline-variant/65 dark:bg-surface-container-low/88">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-tight text-foreground sm:text-7xl">{roundTitle}</h1>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Chip color="warning" variant="flat" size="lg" className="text-2xl font-bold px-6 py-6">🏆 {team}</Chip>
                <Chip color="primary" variant="bordered" size="lg" className="text-2xl font-bold px-6 py-6">Ronda {roundNumber}</Chip>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3 rounded-full border-2 border-outline-variant/60 bg-surface-container-lowest/85 px-8 py-4 text-2xl font-bold text-muted-foreground dark:border-outline-variant/65 dark:bg-surface-container-low/80">
                <Users className="h-8 w-8 text-primary" />
                {connectedCount} conectados
              </div>
              <div className="flex items-center gap-3 rounded-full border-2 border-outline-variant/60 bg-surface-container-lowest/85 px-8 py-4 text-3xl font-black text-foreground dark:border-outline-variant/65 dark:bg-surface-container-low/80">
                <Clock3 className="h-8 w-8 text-primary" />
                {formatTime(elapsedSeconds)}
              </div>
            </div>
          </div>
        </Surface>

        <div className="grid flex-1 gap-10 lg:grid-cols-[1.5fr_1fr]">
          <Card className="border-2 border-outline-variant/55 bg-surface-container-lowest/90 dark:border-outline-variant/65 dark:bg-surface-container-low/84 rounded-[3rem] flex flex-col justify-center p-10">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-3xl uppercase tracking-[0.25em] text-muted-foreground text-center">
                Votos recibidos
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0 flex flex-col items-center justify-center flex-1">
              <div
                className={`text-center transition-all duration-300 w-full ${
                  lastVoteFlash ? "scale-105" : "scale-100"
                }`}
              >
                <Vote
                  className={`mx-auto mb-6 h-24 w-24 transition-colors duration-300 ${
                    lastVoteFlash ? "text-emerald-500" : "text-primary"
                  }`}
                />
                <p className="text-[12rem] font-black tabular-nums leading-none text-foreground">
                  {voteCount}
                </p>
                <p className="mt-6 text-3xl font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  de {maxVotantes} votos
                </p>
              </div>

              <div className="mt-16 w-full space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between text-2xl font-bold text-muted-foreground">
                  <span>Avance de votación</span>
                  <span className="text-foreground text-3xl">{percentage.toFixed(0)}%</span>
                </div>
                <ProgressBar
                  aria-label="Avance"
                  value={percentage}
                  maxValue={100}
                  className="w-full [&_[data-slot=progress-bar-track]]:h-8 [&_[data-slot=progress-bar-track]]:bg-surface-container-high"
                />
                <Meter
                  aria-label="Votos emitidos"
                  value={voteCount}
                  minValue={0}
                  maxValue={Math.max(maxVotantes, 1)}
                  className="w-full [&_[data-slot=meter-track]]:h-4 [&_[data-slot=meter-track]]:bg-surface-container-high"
                />
              </div>

              {percentage >= 100 && (
                <div className="mt-12 rounded-[2rem] border-2 border-emerald-300/70 bg-emerald-500/15 px-8 py-8 text-center text-3xl font-bold text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300 max-w-4xl mx-auto">
                  Todos los votos han sido emitidos.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-10">
            <Card className="border-2 border-outline-variant/55 bg-surface-container-lowest/88 dark:border-outline-variant/65 dark:bg-surface-container-low/82 rounded-[3rem] p-8 flex flex-col justify-center">
              <CardContent className="flex items-center justify-between gap-8 pt-0 px-4 pb-0">
                <div>
                  <p className="text-3xl font-bold uppercase tracking-[0.2em] text-muted-foreground">Participación</p>
                  <p className="text-6xl font-black text-foreground mt-4">{percentage.toFixed(0)}%</p>
                </div>
                <div className="relative flex h-48 w-48 items-center justify-center">
                  <ProgressCircle aria-label="Participacion" value={percentage} strokeWidth={16} className="h-48 w-48 text-primary" />
                  <BarChart3 className="absolute h-16 w-16 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-outline-variant/55 bg-surface-container-lowest/88 dark:border-outline-variant/65 dark:bg-surface-container-low/82 rounded-[3rem] p-8 flex flex-col justify-center">
              <CardHeader className="px-4 py-0 pb-6 text-center">
                <CardTitle className="text-3xl font-bold uppercase tracking-[0.25em] text-muted-foreground">
                  Estado de mesa
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-8 px-4 pb-0">
                <div className="rounded-[2rem] border-2 border-outline-variant/60 bg-surface-container-low p-8 text-center dark:border-outline-variant/65 dark:bg-surface-container/80 flex flex-col justify-center items-center">
                  <p className="text-7xl font-black tabular-nums">{connectedCount}</p>
                  <p className="text-xl font-bold uppercase tracking-wider text-muted-foreground mt-4">Conectados</p>
                </div>
                <div className="rounded-[2rem] border-2 border-outline-variant/60 bg-surface-container-low p-8 text-center dark:border-outline-variant/65 dark:bg-surface-container/80 flex flex-col justify-center items-center">
                  <p className="text-7xl font-black tabular-nums">{maxVotantes}</p>
                  <p className="text-xl font-bold uppercase tracking-wider text-muted-foreground mt-4">Meta</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showBallotSummary && (
          <Card className="border-2 border-outline-variant/55 bg-surface-container-lowest/88 dark:border-outline-variant/65 dark:bg-surface-container-low/82 rounded-[3rem] mt-6 p-8">
            <CardHeader className="px-4 pt-0">
              <CardTitle className="text-3xl font-bold uppercase tracking-[0.25em] text-muted-foreground text-center">
                Papeletas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8 px-4">
              {ballotSummaries.length === 0 ? (
                <div className="space-y-6">
                  <p className="text-2xl text-muted-foreground text-center">Aún no hay papeletas válidas registradas.</p>
                  <div className="grid gap-6 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-40 w-full rounded-[2rem]" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {ballotSummaries.map((ballot) => (
                    <div
                      key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`}
                      className="rounded-[2rem] border-2 border-outline-variant/60 bg-surface-container-lowest/90 p-8 shadow-sm dark:border-outline-variant/65 dark:bg-surface-container/80 flex flex-col justify-between"
                    >
                      <div className="mb-6 flex items-center justify-between">
                        <p className="font-mono text-2xl font-bold text-foreground">{ballot.voteCode}</p>
                        <Chip size="lg" color="primary" variant="flat" className="text-xl font-bold px-4 py-4">R{ballot.roundNumber}</Chip>
                      </div>
                      <div className="space-y-3 text-2xl font-medium text-muted-foreground">
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
