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

/* ── ProjAvatar ── */
const AVATAR_COLORS = ["blue", "emerald", "yellow", "red"] as const;
type AvatarColor = (typeof AVATAR_COLORS)[number];

function pickAvatarColor(seed: string): AvatarColor {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h * 31) + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function ProjAvatar({
  name,
  surname = "",
  imageUrl,
  size = "md",
  colorOverride,
}: {
  name: string;
  surname?: string;
  imageUrl?: string | null;
  size?: "xl" | "lg" | "md" | "sm";
  colorOverride?: AvatarColor;
}) {
  const color = colorOverride ?? pickAvatarColor(name + surname);
  const initials = ((name.trim()[0] ?? "") + (surname.trim()[0] ?? "")).toUpperCase();
  if (imageUrl) {
    return (
      <div className={`proj-avatar proj-avatar-${size} proj-avatar-${color}`}>
        <img src={imageUrl} alt={name} />
      </div>
    );
  }
  return <div className={`proj-avatar proj-avatar-${size} proj-avatar-${color}`}>{initials}</div>;
}

/* ── PChip ── */
export type PChipKind = "blue" | "emerald" | "yellow" | "red" | "muted";

export function PChip({
  kind,
  label,
  pulse = false,
  lg = false,
}: {
  kind: PChipKind;
  label: string;
  pulse?: boolean;
  lg?: boolean;
}) {
  return (
    <span className={`pchip pchip-${kind}${lg ? " pchip-lg" : ""}`}>
      {pulse && <span className="dotpulse" aria-hidden />}
      {label}
    </span>
  );
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

/* ── BallotsGrid ── */

function BallotCard({ ballot }: { ballot: BallotSummary }) {
  return (
    <div className="proj-ballot">
      <div className="proj-ballot-top">
        <span className="proj-ballot-code">{ballot.voteCode}</span>
        <span className="proj-ballot-round">R{ballot.roundNumber}</span>
      </div>
      <div className="proj-ballot-sep" />
      <ul className="proj-ballot-list">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span className="n">{i + 1}.</span>
            <span className="nm">{ballot.votes[i] || "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BallotsGrid({ summaries }: { summaries: BallotSummary[] }) {
  if (summaries.length === 0) {
    return (
      <div className="grid grid-cols-4 gap-[12px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[140px] rounded-[14px] bg-[var(--avd-bg-sunken)] animate-pulse" />
        ))}
      </div>
    );
  }
  // Marquee: render twice for infinite loop. Disable animation if too few.
  const enableMarquee = summaries.length >= 8;
  if (!enableMarquee) {
    return (
      <div className="grid grid-cols-4 gap-[12px]">
        {summaries.map((b) => (
          <BallotCard key={`${b.roundNumber}-${b.voteCode}-${b.timestamp}`} ballot={b} />
        ))}
      </div>
    );
  }
  return (
    <div className="proj-ballots-scroll">
      <div className="proj-ballots-track">
        {[...summaries, ...summaries].map((b, i) => (
          <BallotCard key={`${b.roundNumber}-${b.voteCode}-${b.timestamp}-${i}`} ballot={b} />
        ))}
      </div>
    </div>
  );
}
