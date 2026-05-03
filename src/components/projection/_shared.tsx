import { Check } from "lucide-react";
import { formatCandidateName } from "@/lib/candidateFormat";
import type { BallotSummary } from "@/hooks/useProjectionData";
import "./projection.css";

/* ── Chip helpers ── */

export type ChipKind = "ok" | "warn" | "brand" | "muted";

const kindClass: Record<ChipKind, string> = {
  ok:    "avd-chip-ok",
  warn:  "avd-chip-warn",
  brand: "avd-chip-brand",
  muted: "avd-chip-muted",
};

const sizeClass: Record<"sm" | "md" | "lg", string> = {
  sm: "",
  md: "avd-chip-md",
  lg: "avd-chip-lg",
};

export function Chip({ kind, label, size = "md" }: { kind: ChipKind; label: string; size?: "sm" | "md" | "lg" }): React.ReactNode {
  return <span className={`avd-chip ${kindClass[kind]} ${sizeClass[size]}`}>{label}</span>;
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
  return color
    ? <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, opacity: 0.9 }} />
    : <div className="avd-accent-bar" />;
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

export function SelectedCandidatesSidebar({ candidates }: { candidates: SelectedCandidate[] }) {
  return (
    <div className="avd-selected-sidebar">
      <div className="avd-selected-sidebar-header">
        <Check size={18} color="var(--avd-ok)" strokeWidth={3} />
        <span className="avd-selected-sidebar-label">Seleccionadas</span>
        {candidates.length > 0 && (
          <span className="avd-selected-sidebar-count">{candidates.length}</span>
        )}
      </div>
      <div className="avd-selected-sidebar-list">
        {candidates.length === 0 ? (
          <div className="avd-selected-sidebar-empty">
            Ninguna candidata<br />seleccionada aún
          </div>
        ) : (
          candidates.map((c) => (
            <div key={c.id} className="avd-selected-sidebar-row">
              <div style={{ minWidth: 0 }}>
                <div className="avd-selected-sidebar-name">{formatCandidateName(c)}</div>
                {c.location && <div className="avd-selected-sidebar-loc">{c.location}</div>}
              </div>
              {c.selected_in_round && (
                <span className="avd-selected-sidebar-round">R{c.selected_in_round}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── BallotsGrid ── */

export function BallotsGrid({ summaries }: { summaries: BallotSummary[] }) {
  if (summaries.length === 0) {
    return (
      <div className="avd-ballots-grid-loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="avd-ballots-grid-skeleton" />
        ))}
      </div>
    );
  }
  return (
    <div className="avd-ballots-grid">
      {summaries.map((ballot) => (
        <div key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`} className="avd-card avd-ballot-card">
          <AccentBar />
          <div className="avd-ballot-card-header">
            <span className="avd-ballot-code">{ballot.voteCode}</span>
            <span className="avd-ballot-round-chip">R{ballot.roundNumber}</span>
          </div>
          <div className="avd-ballot-votes">
            <span><span className="avd-ballot-vote-num">1.</span>{ballot.votes[0] || "—"}</span>
            <span><span className="avd-ballot-vote-num">2.</span>{ballot.votes[1] || "—"}</span>
            <span><span className="avd-ballot-vote-num">3.</span>{ballot.votes[2] || "—"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
