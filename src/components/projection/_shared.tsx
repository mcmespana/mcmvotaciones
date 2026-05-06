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
    ? <div className="absolute top-0 left-0 right-0 h-[3px] opacity-90" style={{ background: color }} />
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
              <div className="min-w-0">
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

/* ── BallotCard (shared) ── */

function BallotCard({ ballot }: { ballot: BallotSummary }) {
  return (
    <div className="proj-ballot-card">
      <div className="proj-ballot-card-accent" />
      <div className="proj-ballot-card-top">
        <span className="proj-ballot-card-code">{ballot.voteCode}</span>
        <span className="proj-ballot-card-round">R{ballot.roundNumber}</span>
      </div>
      <div className="proj-ballot-card-sep" />
      <ol className="proj-ballot-card-votes">
        {ballot.votes.filter(Boolean).map((v, i) => (
          <li key={i} className="proj-ballot-card-vote">
            <span className="proj-ballot-card-vote-n">{i + 1}</span>
            <span className="proj-ballot-card-vote-name">{v}</span>
          </li>
        ))}
        {ballot.votes.filter(Boolean).length === 0 && (
          <li className="proj-ballot-card-vote proj-ballot-card-vote--empty">Sin votos</li>
        )}
      </ol>
    </div>
  );
}

/* ── BallotsGrid (used in Results static view) ── */

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
        <BallotCard key={`${ballot.roundNumber}-${ballot.voteCode}-${ballot.timestamp}`} ballot={ballot} />
      ))}
    </div>
  );
}

/* ── BallotTicker (used in Voting live view) ── */

export function BallotTicker({ summaries }: { summaries: BallotSummary[] }) {
  if (summaries.length === 0) {
    return (
      <div className="proj-ballot-ticker-empty">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="proj-ballot-ticker-skeleton" />
        ))}
      </div>
    );
  }
  // Duplicate for seamless infinite loop
  const looped = [...summaries, ...summaries];
  const durationS = Math.max(24, summaries.length * 8);

  return (
    <div className="proj-ballot-ticker-wrap">
      <div className="proj-ballot-ticker" style={{ animationDuration: `${durationS}s` }}>
        {looped.map((ballot, i) => (
          <BallotCard key={`${i}-${ballot.voteCode}`} ballot={ballot} />
        ))}
      </div>
    </div>
  );
}
