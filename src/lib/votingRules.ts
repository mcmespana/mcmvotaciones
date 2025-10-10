/**
 * Given the maximum number of candidates that can be selected and how many
 * fueron seleccionados hasta el momento, devuelve la cantidad de votos que
 * cada votante puede emitir en la ronda actual.
 */
export function getMaxVotesAllowed(maxSelectedCandidates: number, selectedCandidatesCount: number): number {
  const remaining = Math.max(maxSelectedCandidates - selectedCandidatesCount, 0);

  if (remaining === 0) return 0;
  if (remaining === 1) return 1;
  if (remaining === 2) return 2;
  return 3;
}
