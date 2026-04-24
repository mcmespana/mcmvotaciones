import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import type { BallotSummary } from "@/hooks/useProjectionData";
import { formatCandidateName } from "@/lib/candidateFormat";

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

type ChipKind = "ok" | "warn" | "brand" | "muted";
function chip(kind: ChipKind, label: string, size: "md" | "lg" = "md"): React.ReactNode {
  const h = size === "lg" ? 44 : 36;
  const fs = size === "lg" ? 17 : 15;
  const px = size === "lg" ? 22 : 16;
  const base: React.CSSProperties = { display: "inline-flex", alignItems: "center", height: h, padding: `0 ${px}px`, borderRadius: 9999, fontSize: fs, fontWeight: 700, letterSpacing: "-0.005em", whiteSpace: "nowrap", border: "1px solid", fontFamily: "var(--avd-font-sans)" };
  let colors: React.CSSProperties;
  if (kind === "ok")    colors = { background: "var(--avd-ok-bg)",    color: "var(--avd-ok-fg)",         borderColor: "color-mix(in oklch, var(--avd-ok) 30%, transparent)" };
  else if (kind === "warn")  colors = { background: "var(--avd-warn-bg)",  color: "var(--avd-warn-fg)",       borderColor: "color-mix(in oklch, var(--avd-warn) 32%, transparent)" };
  else if (kind === "brand") colors = { background: "var(--avd-brand-bg)", color: "var(--avd-brand-subtle)",  borderColor: "var(--avd-brand-border)" };
  else                       colors = { background: "var(--avd-bg-sunken)",color: "var(--avd-fg-muted)",     borderColor: "var(--avd-border-soft)" };
  return <span style={{ ...base, ...colors }}>{label}</span>;
}

function card(extra?: React.CSSProperties): React.CSSProperties {
  return { background: "var(--avd-surface)", border: "1px solid var(--avd-border)", borderRadius: 14, position: "relative", overflow: "hidden", ...extra };
}

function accentBar(color?: string): React.ReactNode {
  return <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color || "linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))", opacity: 0.9 }} />;
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

  useEffect(() => {
    let t: number | null = null;
    if (voteCount > prev) { setFlash(true); t = window.setTimeout(() => setFlash(false), 700); }
    setPrev(voteCount);
    return () => { if (t !== null) window.clearTimeout(t); };
  }, [voteCount, prev]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--avd-bg)", fontFamily: "var(--avd-font-sans)", color: "var(--avd-fg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 32px", background: "var(--avd-bg-elev)", borderBottom: "1px solid var(--avd-border)", flexShrink: 0, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, color: "var(--avd-fg)" }}>{roundTitle}</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 8 }}>
          {chip("warn", `🏆 ${team}`, "md")}
          {chip("brand", `Ronda ${roundNumber}`, "md")}
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
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: showBallotSummary ? "1fr" : "1.6fr 1fr", gap: 0, minHeight: 0 }}>
        {!showBallotSummary ? (
          <>
            {/* Left: vote count */}
            <div style={{ padding: "40px 48px", borderRight: "1px solid var(--avd-border)", display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
              {label("Votos recibidos")}
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, transition: "transform 0.2s", transform: flash ? "scale(1.04)" : "scale(1)" }}>
                <span style={{ fontSize: 160, fontWeight: 800, letterSpacing: "-0.05em", fontVariantNumeric: "tabular-nums", lineHeight: 1, color: flash ? "var(--avd-ok)" : "var(--avd-fg)", transition: "color 0.3s", fontFamily: "var(--avd-font-sans)" }}>
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
            <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid var(--avd-border)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--avd-border)", display: "flex", alignItems: "center", gap: 10 }}>
                <Check size={18} color="var(--avd-ok)" strokeWidth={3} />
                <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", flex: 1 }}>Seleccionados</span>
                {previouslySelected.length > 0 && (
                  <span style={{ fontSize: 36, fontWeight: 800, color: "var(--avd-ok)", fontVariantNumeric: "tabular-nums" }}>{previouslySelected.length}</span>
                )}
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
                {previouslySelected.length === 0 ? (
                  <div style={{ padding: "32px 24px", fontSize: 18, color: "var(--avd-fg-muted)", fontWeight: 500, textAlign: "center" }}>
                    Ningún candidato seleccionado aún
                  </div>
                ) : (
                  previouslySelected.map((c) => (
                    <div key={c.id} style={{ padding: "16px 24px", borderBottom: "1px solid var(--avd-border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--avd-ok-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {formatCandidateName(c)}
                        </div>
                        {c.location && (
                          <div style={{ fontSize: 14, color: "var(--avd-fg-muted)", fontWeight: 500, marginTop: 2 }}>{c.location}</div>
                        )}
                      </div>
                      {c.selected_in_round && (
                        <span style={{ flexShrink: 0, background: "var(--avd-ok-bg)", color: "var(--avd-ok-fg)", border: "1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)", borderRadius: 9999, padding: "2px 12px", fontSize: 14, fontWeight: 700 }}>
                          R{c.selected_in_round}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* Ballot summary view */
          <div style={{ padding: "32px 40px", display: "flex", flexDirection: "column", gap: 24 }}>
            {label("Papeletas registradas")}
            {ballotSummaries.length === 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: 140, borderRadius: 12, background: "var(--avd-bg-sunken)", animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {ballotSummaries.map((ballot) => (
                  <div key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`} style={{ ...card({ padding: "24px 28px" }) }}>
                    {accentBar()}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <span style={{ fontFamily: "var(--avd-font-mono)", fontSize: 18, fontWeight: 700, color: "var(--avd-fg)" }}>{ballot.voteCode}</span>
                      <span style={{ background: "var(--avd-brand-bg)", color: "var(--avd-brand-subtle)", border: "1px solid var(--avd-brand-border)", borderRadius: 9999, padding: "2px 12px", fontSize: 13, fontWeight: 700 }}>R{ballot.roundNumber}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 18, color: "var(--avd-fg-muted)", fontWeight: 500 }}>
                      <span><span style={{ color: "var(--avd-fg-faint)", marginRight: 8 }}>1.</span>{ballot.votes[0] || "—"}</span>
                      <span><span style={{ color: "var(--avd-fg-faint)", marginRight: 8 }}>2.</span>{ballot.votes[1] || "—"}</span>
                      <span><span style={{ color: "var(--avd-fg-faint)", marginRight: 8 }}>3.</span>{ballot.votes[2] || "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {flash && <div style={{ position: "fixed", inset: 0, background: "color-mix(in oklch, var(--avd-ok) 8%, transparent)", pointerEvents: "none", transition: "opacity 0.3s" }} />}
    </div>
  );
}
