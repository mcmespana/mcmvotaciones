import { useState, useEffect } from "react";
import { Check, MapPin } from "lucide-react";
import type { CandidateRow } from "@/types/db";
import { formatCandidateName, getRoundTeamLabel } from "@/lib/candidateFormat";
import { PChip, ProjAvatar } from "./_shared";

type Candidate = CandidateRow;

interface ProjectionFinalResultsProps {
  roundTitle: string;
  roundNumber: number;
  team: string;
  selectedCandidates: Candidate[];
}

export function ProjectionFinalResults({
  roundTitle,
  roundNumber,
  team,
  selectedCandidates,
}: ProjectionFinalResultsProps) {
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    setRevealedCount(0);
    const interval = setInterval(() => {
      setRevealedCount((prev) => {
        if (prev >= selectedCandidates.length) { clearInterval(interval); return prev; }
        return prev + 1;
      });
    }, 800);
    return () => clearInterval(interval);
  }, [selectedCandidates.length]);

  const isCompact = selectedCandidates.length > 3;

  const gridCols =
    selectedCandidates.length <= 3
      ? `repeat(${selectedCandidates.length}, minmax(0, 1fr))`
      : selectedCandidates.length <= 4
      ? "repeat(2, minmax(0, 1fr))"
      : "repeat(3, minmax(0, 1fr))";

  return (
    <div className="proj-page overflow-visible">
      {/* Header */}
      <header className="proj-header">
        <h1 className="proj-header-title proj-header-title--flex">
          Resultados Finales
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--proj-yellow)" stroke="none" aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </h1>
        <span className="proj-header-subtitle">{roundTitle}</span>
        <div className="proj-header-meta">
          <PChip kind="yellow" label={getRoundTeamLabel(team)} />
          <PChip kind="blue" label={`Ronda ${roundNumber}`} />
          <PChip kind="emerald" label={`${selectedCandidates.length} elegidos`} />
        </div>
      </header>

      {/* Candidates grid */}
      <div className={`flex-1 flex items-center justify-center overflow-auto ${isCompact ? 'px-8 py-6' : 'px-12 py-10'}`}>
        {selectedCandidates.length === 0 ? (
          <div className="text-center">
            <div className="text-[22px] text-[var(--avd-fg-muted)] font-semibold">Nadie ha superado el 50% o no hay seleccionados.</div>
          </div>
        ) : (
          <div className={`grid w-full items-stretch ${isCompact ? 'gap-4' : 'gap-6'}`} style={{ gridTemplateColumns: gridCols }}>
            {selectedCandidates.map((candidate, index) => {
              const isRevealed = index < revealedCount;

              if (!isRevealed) {
                return (
                  <div key={candidate.id} className={`proj-finalist-placeholder ${isCompact ? 'min-h-[200px]' : 'min-h-[300px]'}`}>
                    <svg width={isCompact ? "48" : "64"} height={isCompact ? "48" : "64"} viewBox="0 0 24 24" fill="var(--avd-border-strong, var(--avd-border))" stroke="none" aria-hidden>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                );
              }

              return (
                <div key={candidate.id} className={`proj-finalist-card ${isCompact ? 'px-5 py-6' : 'px-7 py-9'}`}>
                  <div className="proj-finalist-accent" />
                  <div className="proj-finalist-check">
                    <Check size={16} color="white" strokeWidth={3} />
                  </div>

                  <div className={isCompact ? 'mb-4' : 'mb-6'}>
                    <ProjAvatar
                      name={candidate.name}
                      surname={candidate.surname}
                      imageUrl={candidate.image_url}
                      size={isCompact ? "lg" : "xl"}
                    />
                  </div>

                  <h2 className={`font-extrabold tracking-[-0.015em] text-[var(--avd-fg)] leading-[1.2] mb-3 ${isCompact ? 'text-[20px]' : 'text-[26px]'}`}>
                    {formatCandidateName(candidate)}
                  </h2>

                  <div className="proj-finalist-tags">
                    {candidate.selected_in_round != null && (
                      <span className="proj-finalist-tag">Ronda {candidate.selected_in_round}</span>
                    )}
                    {candidate.location && (
                      <span className="proj-finalist-tag inline-flex items-center gap-1">
                        <MapPin size={10} /> {candidate.location}
                      </span>
                    )}
                    {candidate.age && (
                      <span className="proj-finalist-tag">{candidate.age} años</span>
                    )}
                    {candidate.group_name && (
                      <span className="proj-finalist-tag">{candidate.group_name}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
