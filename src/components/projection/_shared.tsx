import { Check } from "lucide-react";
import { formatCandidateName } from "@/lib/candidateFormat";
import type { BallotSummary } from "@/hooks/useProjectionData";

/* ── Chip helpers ── */

export type ChipKind = "ok" | "warn" | "brand" | "muted";

export function chipStyle(kind: ChipKind, size: "sm" | "md" | "lg" = "md"): React.CSSProperties {
  const h = size === "lg" ? 44 : size === "md" ? 36 : 28;
  const fs = size === "lg" ? 17 : size === "md" ? 15 : 13;
  const px = size === "lg" ? 22 : size === "md" ? 16 : 12;
  const base: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", height: h, padding: `0 ${px}px`,
    borderRadius: 9999, fontSize: fs, fontWeight: 700, letterSpacing: "-0.005em",
    whiteSpace: "nowrap", border: "1px solid", fontFamily: "var(--avd-font-sans)",
  };
  if (kind === "ok")    return { ...base, background: "var(--avd-ok-bg)",    color: "var(--avd-ok-fg)",        borderColor: "color-mix(in oklch, var(--avd-ok) 30%, transparent)" };
  if (kind === "warn")  return { ...base, background: "var(--avd-warn-bg)",  color: "var(--avd-warn-fg)",      borderColor: "color-mix(in oklch, var(--avd-warn) 32%, transparent)" };
  if (kind === "brand") return { ...base, background: "var(--avd-brand-bg)", color: "var(--avd-brand-subtle)", borderColor: "var(--avd-brand-border)" };
  return                      { ...base, background: "var(--avd-bg-sunken)", color: "var(--avd-fg-muted)",    borderColor: "var(--avd-border-soft)" };
}

export function Chip({ kind, label, size = "md" }: { kind: ChipKind; label: string; size?: "sm" | "md" | "lg" }): React.ReactNode {
  return <span style={chipStyle(kind, size)}>{label}</span>;
}

export function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "var(--avd-surface)",
    border: "1px solid var(--avd-border)",
    borderRadius: 14,
    position: "relative",
    overflow: "hidden",
    ...extra,
  };
}

export function AccentBar({ color }: { color?: string }): React.ReactNode {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 3,
      background: color || "linear-gradient(90deg, var(--avd-brand-400), var(--avd-brand-600))",
      opacity: 0.9,
    }} />
  );
}

/* ── ProjectionHeader ── */

interface ProjectionHeaderProps {
  title: string;
  roundNumber?: number;
  team?: string;
  extras?: React.ReactNode;
  size?: "sm" | "lg";
  accentGradient?: string;
}

export function ProjectionHeader({ title, roundNumber, team, extras, size = "sm", accentGradient }: ProjectionHeaderProps) {
  const titleSize = size === "lg" ? 72 : 26;
  const isTeamType = team === "ECE" || team === "ECL";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "16px 32px",
      background: "var(--avd-bg-elev)", borderBottom: "1px solid var(--avd-border)",
      flexShrink: 0, flexWrap: "wrap", position: "relative",
    }}>
      {accentGradient && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentGradient }} />
      )}
      <h1 style={{ fontSize: titleSize, fontWeight: 800, letterSpacing: "-0.02em", margin: 0, color: "var(--avd-fg)" }}>
        {title}
      </h1>
      {(team || roundNumber != null) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
          {team && <span style={chipStyle("warn", "md")}>{isTeamType ? `🏆 ${team}` : team}</span>}
          {roundNumber != null && <span style={chipStyle("brand", "md")}>Ronda {roundNumber}</span>}
        </div>
      )}
      {extras}
    </div>
  );
}

/* ── SelectedCandidatesSidebar ── */

interface SelectedCandidate {
  id: string;
  name: string;
  surname: string;
  location: string | null;
  selected_in_round: number | null;
  selected_vote_count?: number | null;
}

interface SelectedCandidatesSidebarProps {
  candidates: SelectedCandidate[];
}

export function SelectedCandidatesSidebar({ candidates }: SelectedCandidatesSidebarProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: "var(--avd-bg-elev)" }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--avd-border)", display: "flex", alignItems: "center", gap: 10 }}>
        <Check size={18} color="var(--avd-ok)" strokeWidth={3} />
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--avd-fg-subtle)", flex: 1 }}>Seleccionadas</span>
        {candidates.length > 0 && (
          <span style={{ fontSize: 22, fontWeight: 800, color: "var(--avd-ok)", fontVariantNumeric: "tabular-nums" }}>{candidates.length}</span>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {candidates.length === 0 ? (
          <div style={{ padding: "28px 24px", fontSize: 15, color: "var(--avd-fg-muted)", fontWeight: 500, textAlign: "center", lineHeight: 1.5 }}>
            Ninguna candidata<br />seleccionada aún
          </div>
        ) : (
          candidates.map((c) => (
            <div key={c.id} style={{ padding: "14px 24px", borderBottom: "1px solid var(--avd-border-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "var(--avd-ok-fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {formatCandidateName(c)}
                </div>
                {c.location && (
                  <div style={{ fontSize: 12, color: "var(--avd-fg-muted)", fontWeight: 500, marginTop: 2 }}>{c.location}</div>
                )}
              </div>
              {c.selected_in_round && (
                <span style={{ flexShrink: 0, background: "var(--avd-ok-bg)", color: "var(--avd-ok-fg)", border: "1px solid color-mix(in oklch, var(--avd-ok) 30%, transparent)", borderRadius: 9999, padding: "2px 10px", fontSize: 13, fontWeight: 700 }}>
                  R{c.selected_in_round}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── BallotsGrid ── */

interface BallotsGridProps {
  summaries: BallotSummary[];
}

export function BallotsGrid({ summaries }: BallotsGridProps) {
  if (summaries.length === 0) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 140, borderRadius: 12, background: "var(--avd-bg-sunken)", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
      {summaries.map((ballot) => (
        <div key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`} style={{ ...card({ padding: "24px 28px" }) }}>
          <AccentBar />
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
  );
}
