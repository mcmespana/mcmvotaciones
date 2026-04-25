import { useState, useEffect } from "react";
import { Check, MapPin, Cake, Tag } from "lucide-react";
import { CandidateAvatar } from "@/components/voting/CandidateAvatar";
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

function chip(kind: "ok" | "warn" | "brand", label: string): React.ReactNode {
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", height: 36, padding: "0 16px", borderRadius: 9999, fontSize: 15, fontWeight: 700, letterSpacing: "-0.005em", whiteSpace: "nowrap", border: "1px solid", fontFamily: "var(--avd-font-sans)" };
  if (kind === "ok")   return <span style={{ ...base, background: "var(--avd-ok-bg)",    color: "var(--avd-ok-fg)",        borderColor: "color-mix(in oklch, var(--avd-ok) 30%, transparent)" }}>{label}</span>;
  if (kind === "warn") return <span style={{ ...base, background: "var(--avd-warn-bg)",  color: "var(--avd-warn-fg)",      borderColor: "color-mix(in oklch, var(--avd-warn) 32%, transparent)" }}>{label}</span>;
  return                     <span style={{ ...base, background: "var(--avd-brand-bg)", color: "var(--avd-brand-subtle)", borderColor: "var(--avd-brand-border)" }}>{label}</span>;
}

function tagChip(label: string): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: "0 12px", borderRadius: 9999, fontSize: 13, fontWeight: 600, border: "1px solid color-mix(in oklch, var(--avd-ok) 35%, transparent)", background: "var(--avd-ok-bg)", color: "var(--avd-ok-fg)", whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--avd-bg)", fontFamily: "var(--avd-font-sans)", color: "var(--avd-fg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 32px", background: "var(--avd-bg-elev)", borderBottom: "1px solid var(--avd-border)", flexShrink: 0, flexWrap: "wrap", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600), var(--avd-ok-500))" }} />
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
          Resultados Finales
          <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--avd-warn)" stroke="none" aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: "var(--avd-fg-muted)", fontWeight: 600 }}>{roundTitle}</p>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {chip("warn", `🏆 ${team}`)}
          {chip("brand", `Ronda ${roundNumber}`)}
          {chip("ok", `${selectedCandidates.length} elegidos`)}
        </div>
      </div>

      {/* Candidates grid */}
      <div style={{ flex: 1, padding: isCompact ? "24px 32px" : "40px 48px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
        {selectedCandidates.length === 0 ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, color: "var(--avd-fg-muted)", fontWeight: 600 }}>Nadie ha superado el 50% o no hay seleccionados.</div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gap: isCompact ? 16 : 24,
            gridTemplateColumns: selectedCandidates.length <= 3
              ? `repeat(${selectedCandidates.length}, minmax(0, 1fr))`
              : selectedCandidates.length <= 4
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(3, minmax(0, 1fr))",
            width: "100%",
            alignItems: "stretch",
          }}>
            {selectedCandidates.map((candidate, index) => {
              const isRevealed = index < revealedCount;

              if (!isRevealed) {
                return (
                  <div key={candidate.id} style={{
                    borderRadius: 14,
                    border: "2px dashed var(--avd-border)",
                    background: "var(--avd-bg-sunken)",
                    minHeight: isCompact ? 200 : 300,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}>
                    <svg width={isCompact ? 48 : 64} height={isCompact ? 48 : 64} viewBox="0 0 24 24" fill="var(--avd-border-strong)" stroke="none" aria-hidden>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                );
              }

              return (
                <div key={candidate.id} style={{
                  background: "var(--avd-surface)",
                  border: "1px solid var(--avd-border)",
                  borderRadius: 14,
                  padding: isCompact ? "24px 20px" : "36px 28px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  animation: "fadeInScale 0.4s ease-out",
                }}>
                  {/* top accent */}
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--avd-ok-500), var(--avd-ok-600))" }} />

                  {/* selected badge */}
                  <div style={{ position: "absolute", top: 16, right: 16, width: 28, height: 28, borderRadius: "50%", background: "var(--avd-ok)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Check size={16} color="white" strokeWidth={3} />
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: isCompact ? 100 : 140,
                    height: isCompact ? 100 : 140,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "3px solid var(--avd-border)",
                    flexShrink: 0,
                    marginBottom: isCompact ? 16 : 24,
                  }}>
                    <CandidateAvatar
                      name={candidate.name}
                      surname={candidate.surname}
                      imageUrl={candidate.image_url}
                      size={isCompact ? "lg" : "xl"}
                      className="w-full h-full rounded-none"
                    />
                  </div>

                  {/* Name */}
                  <h2 style={{ fontSize: isCompact ? 20 : 26, fontWeight: 800, letterSpacing: "-0.015em", color: "var(--avd-fg)", lineHeight: 1.2, margin: "0 0 12px" }}>
                    {formatCandidateName(candidate)}
                  </h2>

                  {/* Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                    {candidate.location && tagChip(`📍 ${candidate.location}`)}
                    {candidate.age && tagChip(`${candidate.age} años`)}
                    {candidate.group_name && tagChip(candidate.group_name)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
