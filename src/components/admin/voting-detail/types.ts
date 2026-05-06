export interface VoteExportRow {
  round_number: number;
  vote_hash: string | null;
  created_at: string;
  is_invalidated: boolean;
  invalidation_reason: string | null;
  candidate: { name: string; surname: string } | Array<{ name: string; surname: string }> | null;
}

export const normalizeVoteCandidate = (candidate: VoteExportRow["candidate"]) =>
  Array.isArray(candidate) ? candidate[0] : candidate;

export function shortBallotCode(hash: string | null): string {
  if (!hash) return "sin_hash";
  return `VT-${hash.slice(0, 4).toUpperCase()}-${hash.slice(4, 8).toUpperCase()}`;
}

export function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
