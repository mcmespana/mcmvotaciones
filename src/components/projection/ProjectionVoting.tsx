import { useEffect, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { Chip, card, AccentBar, SelectedCandidatesSidebar, BallotsGrid } from "./_shared";

interface SelectedCandidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  selected_in_round: number | null;
  selected_vote_count: number | null;
}

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
  previouslySelected: SelectedCandidate[];
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function label(text: string): React.ReactNode {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", marginBottom: 6 }}>{text}</div>;
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
  previouslySelected,
}: ProjectionVotingProps) {
  const percentage = maxVotantes > 0 ? Math.min((voteCount / maxVotantes) * 100, 100) : 0;
  const [flash, setFlash] = useState(false);
  const [prev, setPrev] = useState(voteCount);
  const [ballotsRef] = useAutoAnimate();

  useEffect(() => {
    let t: number | null = null;
    if (voteCount > prev) { setFlash(true); t = window.setTimeout(() => setFlash(false), 700); }
    setPrev(voteCount);
    return () => { if (t !== null) window.clearTimeout(t); };
  }, [voteCount, prev]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--avd-bg)", fontFamily: "var(--avd-font-sans)", color: "var(--avd-fg)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Ambient orbs */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: flash ? "color-mix(in oklch, var(--avd-ok) 7%, transparent)" : "color-mix(in oklch, var(--avd-brand) 5%, transparent)", filter: "blur(90px)", top: "-10%", right: "5%", animation: "proj-orb-slow-a 20s ease-in-out infinite", pointerEvents: "none", zIndex: 0, transition: "background 0.6s ease" }} />
      <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "color-mix(in oklch, var(--avd-brand) 4%, transparent)", filter: "blur(70px)", bottom: "0%", left: "-5%", animation: "proj-orb-slow-b 26s ease-in-out infinite", pointerEvents: "none", zIndex: 0 }} />
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 32px", background: "var(--avd-bg-elev)", borderBottom: "1px solid var(--avd-border)", flexShrink: 0, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, color: "var(--avd-fg)" }}>{roundTitle}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8 }}>
          <Chip kind="warn" label={(team === "ECE" || team === "ECL") ? `🏆 ${team}` : team} />
          <Chip kind="brand" label={`Ronda ${roundNumber}`} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--avd-fg-muted)", fontSize: 16, fontWeight: 600 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--avd-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {connectedCount} conectados
          </div>
          <div style={{ fontFamily: "var(--avd-font-mono)", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--avd-fg)" }}>
            {formatTime(elapsedSeconds)}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: showBallotSummary ? "1fr" : "1.6fr 1fr", gap: 0, minHeight: 0, position: "relative", zIndex: 1 }}>
        {!showBallotSummary ? (
          <>
            {/* Left: vote count */}
            <div style={{ padding: "40px 48px", borderRight: "1px solid var(--avd-border)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
              {label("Votos recibidos")}
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, transition: "transform 0.2s", transform: flash ? "scale(1.04)" : "scale(1)" }}>
                <span style={{ fontSize: 160, fontWeight: 800, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", lineHeight: 1, color: flash ? "var(--avd-ok)" : "var(--avd-fg)", transition: "color 0.3s", fontFamily: "var(--avd-font-sans)", animation: flash ? "proj-count-pop 0.4s ease-out" : undefined }}>
                  {voteCount}
                </span>
                <span style={{ fontSize: 28, fontWeight: 600, color: "var(--avd-fg-muted)" }}>/ {maxVotantes}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "var(--avd-fg-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Avance</span>
                  <span style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "var(--avd-fg)" }}>{percentage.toFixed(0)}%</span>
                </div>
                <div style={{ height: 14, borderRadius: 8, background: "var(--avd-border-soft)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${percentage}%`, background: "linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))", borderRadius: 8, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
              </div>

              {percentage >= 100 && (
                <div style={{ background: "var(--avd-ok-bg)", border: "1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)", borderRadius: 10, padding: "16px 20px", fontSize: 20, fontWeight: 700, color: "var(--avd-ok-fg)" }}>
                  Todos los votos han sido emitidos.
                </div>
              )}
            </div>

            {/* Right: selected */}
            <div style={{ borderLeft: "1px solid var(--avd-border)" }}>
              <SelectedCandidatesSidebar candidates={previouslySelected} />
            </div>
          </>
        ) : (
          /* Ballot summary view */
          <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
            {label("Papeletas registradas")}
            <div ref={ballotsRef}>
              <BallotsGrid summaries={ballotSummaries} />
            </div>
          </div>
        )}
      </div>

      {flash && <div style={{ position: "fixed", inset: 0, background: "color-mix(in oklch, var(--avd-ok) 8%, transparent)", pointerEvents: "none", transition: "opacity 0.3s" }} />}
    </div>
  );
}
