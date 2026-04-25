/**
 * Returns how many candidates a voter can pick in the current sub-round.
 *
 * Formula: min(maxVotesPerRound, remaining)
 * maxVotesPerRound = 0 → no per-round cap (legacy 3-vote behaviour).
 */
export function getMaxVotesAllowed(
  maxSelectedCandidates: number,
  selectedCandidatesCount: number,
  maxVotesPerRound = 0,
): number {
  const remaining = Math.max(maxSelectedCandidates - selectedCandidatesCount, 0);
  if (remaining === 0) return 0;

  if (maxVotesPerRound <= 0) {
    // Legacy behaviour when no per-round limit is configured
    if (remaining === 1) return 1;
    if (remaining === 2) return 2;
    return 3;
  }

  return Math.min(maxVotesPerRound, remaining);
}
