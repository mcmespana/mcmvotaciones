import { useState, useEffect } from "react";
import { Check, Trophy, MapPin, Cake, Tag } from "lucide-react";
import { Chip, Surface } from "@heroui/react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { CandidateAvatar } from "@/components/CandidateAvatar";
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
        if (prev >= selectedCandidates.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 800); 
    return () => clearInterval(interval);
  }, [selectedCandidates.length]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-primary-fixed/65 via-surface-container-lowest to-surface-container-low text-foreground dark:from-background dark:via-surface-container-low dark:to-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-8%] top-[-6%] h-[380px] w-[380px] rounded-full bg-emerald-500/20 blur-3xl dark:bg-emerald-500/15" />
        <div className="absolute bottom-[-10%] right-[-12%] h-[380px] w-[380px] rounded-full bg-primary-container/20 blur-3xl dark:bg-primary-container/22" />
      </div>

<div className={`relative z-10 flex min-h-screen w-full flex-col ${selectedCandidates.length > 3 ? 'gap-4 p-4 sm:p-6' : 'gap-10 p-8 sm:p-12 lg:p-16'}`}>
        <Surface className={`rounded-[2rem] md:rounded-[3rem] border-2 border-outline-variant/55 bg-surface-container-lowest/90 ${selectedCandidates.length > 3 ? 'px-6 py-4' : 'px-10 py-6'} shadow-tech backdrop-blur-xl dark:border-outline-variant/65 dark:bg-surface-container-low/88 flex flex-row items-center justify-between flex-shrink-0`}>
          <div className="flex flex-col">
            <h1 className={`${selectedCandidates.length > 3 ? 'text-3xl sm:text-4xl' : 'text-5xl sm:text-6xl'} font-black tracking-tight text-foreground flex items-center gap-4`}>
              Resultados Finales
              <Trophy className={`${selectedCandidates.length > 3 ? 'h-8 w-8' : 'h-10 w-10'} text-yellow-500`} strokeWidth={3} />
            </h1>
            <p className={`${selectedCandidates.length > 3 ? 'text-xl' : 'text-2xl mt-1'} font-bold text-muted-foreground`}>{roundTitle}</p>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0 overflow-hidden">
            <Chip color="warning" variant="soft" size={selectedCandidates.length > 3 ? "md" : "lg"} className={`${selectedCandidates.length > 3 ? 'text-xl px-4 py-6' : 'text-3xl font-bold px-6 py-8'}`}>🏆 {team}</Chip>
            <Chip color="accent" variant="tertiary" size={selectedCandidates.length > 3 ? "md" : "lg"} className={`${selectedCandidates.length > 3 ? 'text-xl px-4 py-6' : 'text-3xl font-bold px-6 py-8'}`}>Ronda {roundNumber}</Chip>
            <Chip color="success" variant="soft" size={selectedCandidates.length > 3 ? "md" : "lg"} className={`${selectedCandidates.length > 3 ? 'text-xl px-4 py-6' : 'text-3xl font-bold px-6 py-8'}`}>
              <Check className={`inline ${selectedCandidates.length > 3 ? 'h-5 w-5 mr-1' : 'h-8 w-8 mr-3'}`} strokeWidth={4} />
              {selectedCandidates.length} elegidos
            </Chip>
          </div>
        </Surface>

        <div className="flex-1 flex flex-col justify-center">
          {selectedCandidates.length === 0 ? (
            <div className="text-center">
              <p className="text-4xl text-muted-foreground font-bold">Nadie ha superado el 50% o no hay seleccionados.</p>
            </div>
          ) : (
            <div className={`grid gap-4 md:gap-6 items-stretch pt-2 md:pt-4 ${selectedCandidates.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : selectedCandidates.length <= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-3'}`}>
              {selectedCandidates.map((candidate, index) => {
                const isRevealed = index < revealedCount;
                const isCompact = selectedCandidates.length > 3;

                if (!isRevealed) {
                  return (
                    <div key={candidate.id} className={`h-full min-h-[200px] md:min-h-[280px] ${isCompact ? 'rounded-[2rem]' : 'rounded-[3rem]'} border-4 border-dashed border-outline-variant/30 bg-surface-container-lowest/30 flex items-center justify-center animate-pulse`}>
                      <Trophy className="w-16 h-16 md:w-20 md:h-20 text-muted-foreground/20" />
                    </div>
                  );
                }

                return (
                  <div
                    key={candidate.id}
                    className={`relative flex flex-col items-center overflow-hidden ${isCompact ? 'rounded-3xl p-4 md:p-6' : 'rounded-[3rem] p-8 md:p-10'} border-2 border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-xl shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-700 animate-in fade-in zoom-in-95 group`}
                  >
                    <div className="absolute top-0 left-0 w-full h-32 md:h-40 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />

                    <div className={`relative z-10 border-4 border-surface shadow-md flex-shrink-0 group-hover:border-emerald-500/50 transition-colors duration-500 rounded-full overflow-hidden ${isCompact ? 'h-28 w-28 md:h-36 md:w-36' : 'h-48 w-48 md:h-56 md:w-56'}`}>
                      <CandidateAvatar
                        name={candidate.name}
                        surname={candidate.surname}
                        imageUrl={candidate.image_url}
                        size={isCompact ? "lg" : "xl"}
                        className="w-full h-full rounded-none"
                      />
                    </div>

                    <div className={`flex flex-col flex-1 w-full mt-4 md:mt-6 text-center items-center justify-start z-10`}>
                      <h2 className={`${isCompact ? 'text-xl md:text-2xl' : 'text-3xl md:text-4xl'} font-extrabold text-foreground tracking-tight leading-tight mb-3`}>
                        {formatCandidateName(candidate)}
                      </h2>

                      <div className={`flex flex-wrap items-center justify-center gap-2 md:gap-3 w-full`}>
                        {candidate.location && (
                          <Chip color="success" variant="flat" size={isCompact ? "sm" : "md"} className={`${isCompact ? 'text-xs md:text-sm font-medium px-2 py-1' : 'text-base font-semibold px-3 py-2'}`}>
                            <MapPin className={`inline ${isCompact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} opacity-70`} />
                            {candidate.location}
                          </Chip>
                        )}
                        {candidate.age && (
                          <Chip color="success" variant="flat" size={isCompact ? "sm" : "md"} className={`${isCompact ? 'text-xs md:text-sm font-medium px-2 py-1' : 'text-base font-semibold px-3 py-2'}`}>
                            <Cake className={`inline ${isCompact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} opacity-70`} />
                            {candidate.age} años
                          </Chip>
                        )}
                        {candidate.group_name && (
                          <Chip color="success" variant="flat" size={isCompact ? "sm" : "md"} className={`${isCompact ? 'text-xs md:text-sm font-medium px-2 py-1' : 'text-base font-semibold px-3 py-2'}`}>
                            <Tag className={`inline ${isCompact ? 'w-3 h-3 mr-1' : 'w-4 h-4 mr-1.5'} opacity-70`} />
                            {candidate.group_name}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
