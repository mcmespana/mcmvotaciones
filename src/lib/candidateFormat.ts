/** Returns only the first surname word (e.g. "García López" → "García") */
export function formatSurname(surname: string): string {
  return surname.trim().split(/\s+/)[0] ?? surname;
}

/** Returns "Name FirstSurname" for display in all views */
export function formatCandidateName(candidate: { name: string; surname: string }): string {
  return `${candidate.name} ${formatSurname(candidate.surname)}`;
}

/** Two-letter initials for avatar fallback */
export function getInitials(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase();
}

/** Display label for round team/type chip — adds trophy prefix for competition types */
export function getRoundTeamLabel(team: string | null | undefined): string {
  if (!team) return "";
  return team === "ECE" || team === "ECL" ? `🏆 ${team}` : team;
}
