import { useState, useEffect } from "react";
import { Check, MapPin } from "lucide-react";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
import type { CandidateRow } from "@/types/db";
import { formatCandidateName } from "@/lib/candidateFormat";
import { Chip } from "./_shared";

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
    <div className="proj-page" style={{ overflow: "unset" }}>
      {/* Header */}
      <div className="proj-header">
        <div className="proj-final-header-accent" />
        <h1 className="proj-final-title">
          Resultados Finales
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--avd-warn)" stroke="none" aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </h1>
        <p className="proj-final-subtitle">{roundTitle}</p>
        <div className="proj-spacer" />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Chip kind="warn" label={(team === "ECE" || team === "ECL") ? `🏆 ${team}` : team} />
          <Chip kind="brand" label={`Ronda ${roundNumber}`} />
          <Chip kind="ok" label={`${selectedCandidates.length} elegidos`} />
        </div>
      </div>

      {/* Candidates grid */}
      <div style={{ flex: 1, padding: isCompact ? "24px 32px" : "40px 48px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
        {selectedCandidates.length === 0 ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, color: "var(--avd-fg-muted)", fontWeight: 600 }}>Nadie ha superado el 50% o no hay seleccionados.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: isCompact ? 16 : 24, gridTemplateColumns: gridCols, width: "100%", alignItems: "stretch" }}>
            {selectedCandidates.map((candidate, index) => {
              const isRevealed = index < revealedCount;

              if (!isRevealed) {
                return (
                  <div key={candidate.id} className="proj-finalist-placeholder" style={{ minHeight: isCompact ? 200 : 300 }}>
                    <svg width={isCompact ? 48 : 64} height={isCompact ? 48 : 64} viewBox="0 0 24 24" fill="var(--avd-border-strong, var(--avd-border))" stroke="none" aria-hidden>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                );
              }

              return (
                <div key={candidate.id} className="proj-finalist-card" style={{ padding: isCompact ? "24px 20px" : "36px 28px" }}>
                  <div className="proj-finalist-accent" />
                  <div className="proj-finalist-check">
                    <Check size={16} color="white" strokeWidth={3} />
                  </div>

                  <div
                    className="proj-finalist-avatar"
                    style={{ width: isCompact ? 100 : 140, height: isCompact ? 100 : 140, marginBottom: isCompact ? 16 : 24 }}
                  >
                    <CandidateAvatar
                      name={candidate.name}
                      surname={candidate.surname}
                      imageUrl={candidate.image_url}
                      size={isCompact ? "lg" : "xl"}
                      className="w-full h-full rounded-none"
                    />
                  </div>

                  <h2 style={{ fontSize: isCompact ? 20 : 26, fontWeight: 800, letterSpacing: "-0.015em", color: "var(--avd-fg)", lineHeight: 1.2, margin: "0 0 12px" }}>
                    {formatCandidateName(candidate)}
                  </h2>

                  <div className="proj-finalist-tags">
                    {candidate.selected_in_round != null && (
                      <span className="proj-finalist-tag">Ronda {candidate.selected_in_round}</span>
                    )}
                    {candidate.location && (
                      <span className="proj-finalist-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
