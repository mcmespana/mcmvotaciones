import { useState, useEffect, useMemo } from "react";
import { Award, Medal, Trophy } from "lucide-react";
import { Chip, Meter, Skeleton, Surface, Tabs } from "@heroui/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const selectedIds = useMemo(
    () => new Set(selectedCandidates.map((candidate) => candidate.id)),
    [selectedCandidates]
  );

  const rankingIndexByCandidateId = useMemo(
    () => new Map(displayResults.map((result, index) => [result.candidate_id, index])),
    [displayResults]
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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-900 dark:from-slate-950 dark:via-blue-950/40 dark:to-slate-950 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-6%] h-[380px] w-[380px] rounded-full bg-cyan-500/25 blur-3xl dark:bg-cyan-500/15" />
        <div className="absolute bottom-[-10%] right-[-12%] h-[380px] w-[380px] rounded-full bg-indigo-500/20 blur-3xl dark:bg-indigo-500/20" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Surface className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-[0_32px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur-md dark:border-white/10 dark:bg-slate-900/75">
          <div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Resultados - Ronda {roundNumber}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip color="warning" variant="flat" className="font-semibold">🏆 {team}</Chip>
                <Chip color="primary" variant="bordered" className="font-semibold">{roundTitle}</Chip>
                <Chip color="default" variant="bordered" className="font-semibold">{displayResults.length} evaluadas</Chip>
                <Chip color="success" variant="flat" className="font-semibold">{selectedCandidates.length} seleccionados</Chip>
                <Chip color="primary" variant="flat" className="font-semibold">Ronda {roundNumber}</Chip>
              </div>
            </div>
          </div>
        </Surface>

        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="px-0 pt-2">
            <Tabs.Root
              key={showBallotSummary ? "ballots" : "results"}
              defaultSelectedKey={showBallotSummary ? "ballots" : "results"}
              className="w-full"
            >

              <Tabs.Panel id="results" className="pt-2">
                <div
                  className={`grid gap-6 ${
                    showSelected && selectedCandidates.length > 0
                      ? "items-stretch lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]"
                      : "grid-cols-1"
                  }`}
                >
                  <section className="h-full rounded-2xl bg-white/60 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] backdrop-blur-sm dark:bg-slate-900/55">
                    <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-slate-100">Resultados</h3>
                    {displayResults.length === 0 && (
                      <p className="text-sm text-slate-600 dark:text-slate-300">No hay resultados para mostrar.</p>
                    )}
                    <div className="grid gap-3 md:grid-cols-2">
                      {displayResults.map((result) => {
                        const candidate = candidates.find((c) => c.id === result.candidate_id);
                        if (!candidate) {
                          return null;
                        }

                        const isRevealed = revealedIds.has(result.candidate_id);
                        const isTopCandidate = selectedIds.has(result.candidate_id);
                        const rankingIndex = rankingIndexByCandidateId.get(result.candidate_id) ?? 0;
                        const medal = rankingIndex < 3 ? MEDAL_ICONS[rankingIndex] : null;
                        const MedalIcon = medal?.icon;

                        if (!isRevealed) {
                          return <Skeleton key={result.candidate_id} className="h-28 w-full rounded-2xl" />;
                        }

                        return (
                          <div
                            key={result.candidate_id}
                            className={`h-full rounded-2xl border-2 p-4 transition-all duration-700 ${
                              isTopCandidate
                                ? "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/35"
                                : "border-slate-300/75 bg-white/90 dark:border-slate-700 dark:bg-slate-900/75"
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-3">
                              <div
                                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-black ${
                                  medal
                                    ? `${medal.bg} ${medal.color}`
                                    : isTopCandidate
                                      ? "bg-emerald-600 text-white"
                                      : "bg-blue-500/15 text-blue-700 dark:bg-blue-500/25 dark:text-blue-200"
                                }`}
                              >
                                {MedalIcon ? <MedalIcon className="h-6 w-6" /> : rankingIndex + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
                                    {candidate.name} {candidate.surname}
                                  </p>
                                  {isTopCandidate && (
                                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                      SELECCIONADO
                                    </span>
                                  )}
                                </div>
                                {candidate.location && (
                                  <p className="text-sm text-slate-500 dark:text-slate-400">{candidate.location}</p>
                                )}
                              </div>

                              <div className="text-right">
                                <p className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                                  {result.vote_count}
                                </p>
                                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">votos</p>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-3">
                              <Meter
                                aria-label={`Porcentaje ${candidate.name} ${candidate.surname}`}
                                value={result.vote_count}
                                minValue={0}
                                maxValue={Math.max(maxVotes, 1)}
                                className="w-full [&_[data-slot=meter-track]]:h-2.5 [&_[data-slot=meter-track]]:bg-slate-200 dark:[&_[data-slot=meter-track]]:bg-slate-700"
                              />
                              <span className="w-20 text-right text-lg font-black tabular-nums text-slate-900 dark:text-slate-100">
                                {result.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {showSelected && selectedCandidates.length > 0 && (
                    <aside className="h-full rounded-2xl bg-white/60 p-4 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.7)] backdrop-blur-sm dark:bg-slate-900/55">
                      <div className="mb-3 flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                        <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-200">Seleccionados</h3>
                      </div>

                      <div className="divide-y divide-slate-300/70 dark:divide-slate-700/80">
                        {selectedCandidates.map((candidate) => (
                          <div key={candidate.id} className="py-3 first:pt-1">
                            <p className="font-bold text-emerald-800 dark:text-emerald-100">
                              {candidate.name} {candidate.surname}
                            </p>
                            {candidate.location && (
                              <p className="text-sm text-emerald-700/85 dark:text-emerald-300/85">{candidate.location}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </aside>
                  )}
                </div>
              </Tabs.Panel>

              {showBallotSummary && (
                <Tabs.Panel id="ballots" className="pt-2">
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
                </Tabs.Panel>
              )}
            </Tabs.Root>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
