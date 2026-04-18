import { useState, useEffect } from "react";
import { Check, Trophy, MapPin, Cake, Users } from "lucide-react";
import { Chip, Surface } from "@heroui/react";
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

      <div className="relative z-10 flex min-h-screen w-full flex-col gap-10 p-8 sm:p-12 lg:p-16">
        <Surface className="rounded-[3rem] border-2 border-outline-variant/55 bg-surface-container-lowest/90 px-10 py-6 shadow-tech backdrop-blur-xl dark:border-outline-variant/65 dark:bg-surface-container-low/88 flex flex-row items-center justify-between flex-shrink-0">
          <div className="flex flex-col">
            <h1 className="text-5xl font-black tracking-tight text-foreground sm:text-6xl flex items-center gap-4">
              Resultados Finales
              <Trophy className="h-10 w-10 text-yellow-500" strokeWidth={3} />
            </h1>
            <p className="text-2xl mt-1 font-bold text-muted-foreground">{roundTitle}</p>
          </div>
          
          <div className="flex items-center gap-4 shrink-0 overflow-hidden">
            <Chip color="warning" variant="soft" size="lg" className="text-3xl font-bold px-6 py-8">🏆 {team}</Chip>
            <Chip color="accent" variant="tertiary" size="lg" className="text-3xl font-bold px-6 py-8">Ronda {roundNumber}</Chip>
            <Chip color="success" variant="soft" size="lg" className="text-3xl font-bold px-6 py-8">
              <Check className="inline h-8 w-8 mr-3" strokeWidth={4} />
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
            <div className={`grid gap-8 items-stretch pt-4 ${selectedCandidates.length <= 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {selectedCandidates.map((candidate, index) => {
                const isRevealed = index < revealedCount;
                
                if (!isRevealed) {
                  return (
                    <div key={candidate.id} className="h-full min-h-[300px] rounded-[3rem] border-4 border-dashed border-outline-variant/30 bg-surface-container-lowest/30 flex items-center justify-center animate-pulse">
                      <Trophy className="w-20 h-20 text-muted-foreground/20" />
                    </div>
                  );
                }

                return (
                  <div
                    key={candidate.id}
                    className="relative flex flex-col overflow-hidden rounded-[3rem] border-[4px] border-emerald-500/80 bg-emerald-50/90 shadow-[0_15px_40px_-15px_rgba(16,185,129,0.4)] dark:border-emerald-500/60 dark:bg-emerald-950/40 dark:shadow-[0_15px_40px_-15px_rgba(16,185,129,0.2)] transition-all duration-700 animate-in fade-in zoom-in-95"
                  >
                    {candidate.image_url ? (
                      <div className="h-64 sm:h-72 w-full overflow-hidden bg-surface-container/50">
                        <img 
                          src={candidate.image_url} 
                          alt={`${candidate.name} ${candidate.surname}`}
                          className="h-full w-full object-cover object-top"
                        />
                      </div>
                    ) : (
                      <div className="h-64 sm:h-72 w-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-900/50">
                        <Users className="w-24 h-24 text-emerald-300 dark:text-emerald-700" />
                      </div>
                    )}
                    
                    <div className="flex flex-col flex-1 p-8 text-center items-center justify-center">
                      <h2 className="text-4xl font-black text-emerald-900 dark:text-emerald-100 uppercase tracking-wide leading-tight mb-2">
                        {candidate.name} {candidate.surname}
                      </h2>
                      
                      <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                        {candidate.location && (
                          <Chip color="success" variant="tertiary" size="lg" className="text-xl font-bold px-4 py-6">
                            <MapPin className="inline w-6 h-6 mr-2" />
                            {candidate.location}
                          </Chip>
                        )}
                        {candidate.age && (
                          <Chip color="success" variant="tertiary" size="lg" className="text-xl font-bold px-4 py-6">
                            <Cake className="inline w-6 h-6 mr-2" />
                            {candidate.age} años
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
