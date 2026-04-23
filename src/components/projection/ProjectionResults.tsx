import { useState, useEffect, useMemo } from "react";
import { Check, Users } from "lucide-react";
import { Chip, Skeleton, Surface } from "@heroui/react";
import { Card, CardContent } from "@/components/ui/card";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { formatCandidateName } from "@/lib/candidateFormat";

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

function ResultCard({
  candidate,
  result,
  rank,
  isTopCandidate,
  boundedPercentage,
  animated,
}: {
  candidate: { id: string; name: string; surname: string; location: string | null };
  result: RoundResult;
  rank: number;
  isTopCandidate: boolean;
  boundedPercentage: number;
  animated: boolean;
}) {
  return (
    <div
      className={`relative h-full overflow-hidden rounded-[2rem] border-[3px] p-6 transition-all duration-700 ${
        animated ? "animate-in fade-in zoom-in-95" : ""
      } ${
        isTopCandidate
          ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/35"
          : "border-outline-variant/70 bg-surface-container-lowest/90 dark:border-outline-variant/65 dark:bg-surface-container-low/82"
      }`}
    >
      <div className="flex flex-wrap items-center gap-6">
        <div
          className={`flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full text-3xl font-black ${
            isTopCandidate ? "bg-emerald-600 text-white" : "bg-primary-fixed text-primary"
          }`}
        >
          {isTopCandidate ? <Check className="h-12 w-12" strokeWidth={4} /> : rank}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-4xl font-bold text-foreground">
            {formatCandidateName(candidate)}
          </p>
          {candidate.location && (
            <p className="text-2xl mt-1 text-muted-foreground">{candidate.location}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-6xl font-black tabular-nums text-foreground">{result.vote_count}</p>
          <p className="text-xl uppercase tracking-widest text-muted-foreground mt-1">votos</p>
        </div>
      </div>
      <div className="relative mt-8 flex items-center gap-6">
        <div className="relative h-6 w-full overflow-hidden rounded-full border border-outline-variant/60 bg-surface-container-high/80">
          <div
            className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-out ${
              isTopCandidate
                ? "bg-emerald-500"
                : "bg-yellow-300 dark:bg-yellow-400 shadow-[0_0_22px_rgba(250,204,21,0.35)]"
            }`}
            style={{
              width: boundedPercentage > 0 ? `${boundedPercentage}%` : "0%",
              minWidth: boundedPercentage > 0 ? "0.5rem" : "0",
            }}
          />
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-red-500/80 z-10" />
        </div>
        <span className="w-32 text-right text-4xl font-black tabular-nums text-foreground">
          {result.percentage.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

const TOP_N = 5;
const REVEAL_INTERVAL_MS = 700; // faster animation for Top 5

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

  // For display: top-down (highest first)
  const displayResults = useMemo(
    () => [...results].sort((a, b) => b.vote_count - a.vote_count),
    [results]
  );

  // Top N candidates to animate (bottom-up reveal = ascending order of rank)
  const top5Sorted = useMemo(
    () => displayResults.slice(0, TOP_N).reverse(), // rank 5→1
    [displayResults]
  );
  const restResults = useMemo(
    () => displayResults.slice(TOP_N), // shown static at bottom
    [displayResults]
  );

  const selectedIds = useMemo(
    () => new Set(selectedCandidates.map((candidate) => candidate.id)),
    [selectedCandidates]
  );

  // Rank with ties: same vote_count → same rank number
  const rankByCandidateId = useMemo(() => {
    const map = new Map<string, number>();
    let rank = 1;
    for (let i = 0; i < displayResults.length; i++) {
      if (i > 0 && displayResults[i].vote_count < displayResults[i - 1].vote_count) {
        rank = i + 1;
      }
      map.set(displayResults[i].candidate_id, rank);
    }
    return map;
  }, [displayResults]);

  useEffect(() => {
    setRevealedCount(0);
    setShowSelected(false);

    const totalToReveal = top5Sorted.length;
    let count = 0;
    const interval = setInterval(() => {
      count++;
      setRevealedCount(count);
      if (count >= totalToReveal) {
        clearInterval(interval);
        setTimeout(() => setShowSelected(true), 800);
      }
    }, REVEAL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [top5Sorted.length]);

  // Set of revealed candidate IDs (only top 5 animate)
  const revealedIds = new Set(
    top5Sorted.slice(0, revealedCount).map((r) => r.candidate_id)
  );

  // Render the Selected Candidates Sidebar (used in both views if needed, or primarily in ballot view)
  const renderSelectedSidebar = () => {
    // Show sidebar if either they are revealed (showSelected) or if we are skipping to ballots view.
    if ((!showSelected && !showBallotSummary) || selectedCandidates.length === 0) return null;
    return (
      <aside className="h-full rounded-[3rem] border-2 border-outline-variant/45 bg-surface-container-lowest/82 p-10 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] backdrop-blur-sm dark:border-outline-variant/60 dark:bg-surface-container-low/75">
        <div className="mb-8 flex items-center gap-4 justify-center">
          <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-300" strokeWidth={4} />
          <h3 className="text-3xl font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-200">
            Seleccionados
          </h3>
        </div>

        <div className="divide-y-4 divide-outline-variant/65 dark:divide-outline-variant/75">
          {selectedCandidates.map((candidate) => (
            <div key={candidate.id} className="py-6 first:pt-4">
              <p className="text-3xl font-black text-emerald-800 dark:text-emerald-100">
                {formatCandidateName(candidate)}
              </p>
              {candidate.location && (
                <p className="text-xl mt-2 font-bold text-emerald-700/85 dark:text-emerald-300/85">
                  {candidate.location}
                </p>
              )}
            </div>
          ))}
        </div>
      </aside>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-fixed/65 via-surface-container-lowest to-surface-container-low text-foreground dark:from-background dark:via-surface-container-low dark:to-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-6%] h-[380px] w-[380px] rounded-full bg-primary/22 blur-3xl dark:bg-primary/16" />
        <div className="absolute bottom-[-10%] right-[-12%] h-[380px] w-[380px] rounded-full bg-primary-container/20 blur-3xl dark:bg-primary-container/22" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-10 p-8 sm:p-12 lg:p-16">
        {/* ONE-LINE HEADER */}
        <Surface className="rounded-[3rem] border-2 border-outline-variant/55 bg-surface-container-lowest/90 px-10 py-6 shadow-tech backdrop-blur-xl dark:border-outline-variant/65 dark:bg-surface-container-low/88 flex flex-row items-center justify-between flex-shrink-0">
          <h1 className="text-5xl font-black tracking-tight text-foreground sm:text-6xl max-w-[40%] truncate">
            Resultados - Ronda {roundNumber}
          </h1>
          <div className="flex items-center gap-4 shrink-0 overflow-hidden">
            <Chip color="warning" variant="soft" size="lg" className="text-2xl font-bold px-6 py-6">🏆 {team}</Chip>
            <Chip color="accent" variant="tertiary" size="lg" className="text-2xl font-bold px-6 py-6">{roundTitle}</Chip>
            <Chip color="default" variant="tertiary" size="lg" className="text-2xl font-bold px-6 py-6">
              <Users className="inline h-6 w-6 mr-2" />
              {displayResults.length} votadas
            </Chip>
            <Chip color="success" variant="soft" size="lg" className="text-2xl font-bold px-6 py-6">
              <Check className="inline h-6 w-6 mr-2" strokeWidth={3} />
              {selectedCandidates.length} seleccionados
            </Chip>
          </div>
        </Surface>

        <Card className="border-0 bg-transparent shadow-none flex-1 flex flex-col">
          <CardContent className="px-0 py-0 flex-1 flex flex-col pt-2">
            {!showBallotSummary ? (
              // RESULTS VIEW
              <div
                className={`grid gap-10 flex-1 ${
                  showSelected && selectedCandidates.length > 0
                    ? "items-stretch lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
                    : "grid-cols-1"
                }`}
              >
                <section className="h-full w-full rounded-[3rem] border-2 border-outline-variant/45 bg-surface-container-lowest/82 p-10 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] backdrop-blur-sm dark:border-outline-variant/60 dark:bg-surface-container-low/75 flex flex-col gap-4">
                  {displayResults.length === 0 && (
                    <p className="text-2xl text-muted-foreground text-center">No hay resultados para mostrar.</p>
                  )}

                  {/* Rest (position 6+): static, shown at bottom first */}
                  {restResults.length > 0 && (
                    <div className="grid gap-4 md:grid-cols-2">
                      {restResults.map((result) => {
                        const candidate = candidates.find((c) => c.id === result.candidate_id);
                        if (!candidate) return null;
                        const rank = rankByCandidateId.get(result.candidate_id) ?? 0;
                        const isTopCandidate = selectedIds.has(result.candidate_id);
                        const boundedPercentage = Math.min(Math.max(result.percentage, 0), 100);
                        return (
                          <ResultCard
                            key={result.candidate_id}
                            candidate={candidate}
                            result={result}
                            rank={rank}
                            isTopCandidate={isTopCandidate}
                            boundedPercentage={boundedPercentage}
                            animated={false}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Top 5: animated bottom-up */}
                  <div className="grid gap-6 md:grid-cols-2 flex-1 items-start content-start">
                    {top5Sorted.map((result) => {
                      const candidate = candidates.find((c) => c.id === result.candidate_id);
                      if (!candidate) return null;
                      const isRevealed = revealedIds.has(result.candidate_id);
                      const isTopCandidate = selectedIds.has(result.candidate_id);
                      const rank = rankByCandidateId.get(result.candidate_id) ?? 0;
                      const boundedPercentage = Math.min(Math.max(result.percentage, 0), 100);

                      if (!isRevealed) {
                        return <Skeleton key={result.candidate_id} className="h-40 w-full rounded-[2rem]" />;
                      }

                      return (
                        <ResultCard
                          key={result.candidate_id}
                          candidate={candidate}
                          result={result}
                          rank={rank}
                          isTopCandidate={isTopCandidate}
                          boundedPercentage={boundedPercentage}
                          animated
                        />
                      );
                    })}
                  </div>
                </section>

                {renderSelectedSidebar()}
              </div>
            ) : (
              // BALLOTS VIEW
              <div className="grid gap-10 flex-1 items-stretch lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
                <section className="h-full w-full rounded-[3rem] border-2 border-outline-variant/45 bg-surface-container-lowest/82 p-10 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] backdrop-blur-sm dark:border-outline-variant/60 dark:bg-surface-container-low/75 flex flex-col">
                  <h3 className="mb-8 text-4xl font-bold text-foreground uppercase tracking-widest text-center">
                    Papeletas Registradas
                  </h3>
                  {ballotSummaries.length === 0 ? (
                    <div className="space-y-6">
                      <p className="text-2xl text-muted-foreground text-center">Aún no hay papeletas válidas registradas.</p>
                      <div className="grid gap-6 grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <Skeleton key={index} className="h-40 w-full rounded-[2rem]" />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-8 grid-cols-2 lg:grid-cols-3">
                      {ballotSummaries.map((ballot) => (
                        <div
                          key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`}
                          className="ticket-card rounded-[2rem] border-[3px] p-8 shadow-sm flex flex-col justify-between"
                        >
                          <div className="mb-0 space-y-4 text-3xl font-medium text-foreground">
                            {ballot.votes.map((vote, idx) => (
                              <p key={idx}>
                                <span className="text-muted-foreground mr-3 font-bold">{idx + 1}.</span> 
                                {vote || "-"}
                              </p>
                            ))}
                          </div>
                          <div className="ticket-divider mt-8 text-right border-t-2 border-dashed pt-4">
                            <p className="ticket-code font-mono text-2xl font-bold tracking-widest">{ballot.voteCode}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {renderSelectedSidebar() || (
                  <aside className="h-full rounded-[3rem] border-2 border-outline-variant/45 bg-surface-container-lowest/50 p-10 flex flex-col items-center justify-center text-center">
                    <p className="text-muted-foreground text-2xl font-bold mb-2">Ningún seleccionado</p>
                    <p className="text-muted-foreground/80 text-xl">Ningún candidato ha superado el 50% de los votos.</p>
                  </aside>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
