/**
 * Vote hashing utilities using Web Crypto API (SHA-256)
 * Generates a verifiable hash for each vote to ensure integrity and auditability.
 */

/**
 * Generate a SHA-256 hash of the vote data.
 * Returns the full hex digest.
 */
export async function generateVoteHash(
  roundId: string,
  candidateIds: string[],
  deviceHash: string,
  roundNumber: number
): Promise<string> {
  const timestamp = new Date().toISOString();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const payload = [
    roundId,
    candidateIds.sort().join(","), // sort for determinism
    deviceHash,
    roundNumber.toString(),
    timestamp,
    saltHex,
  ].join("|");

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex;
}

/**
 * Format a full hex hash into a user-friendly vote code.
 * Example output: "VT-A3F2-8K1D"
 */
export function formatVoteCode(fullHash: string): string {
  // Take first 8 hex chars and convert to uppercase
  const short = fullHash.slice(0, 8).toUpperCase();
  // Split into two groups of 4
  return `VT-${short.slice(0, 4)}-${short.slice(4, 8)}`;
}

/**
 * Generate and format a vote hash in one step.
 * Returns both the full hash and the user-friendly code.
 */
export async function createVoteReceipt(
  roundId: string,
  candidateIds: string[],
  deviceHash: string,
  roundNumber: number
): Promise<{ fullHash: string; voteCode: string }> {
  const fullHash = await generateVoteHash(
    roundId,
    candidateIds,
    deviceHash,
    roundNumber
  );
  return {
    fullHash,
    voteCode: formatVoteCode(fullHash),
  };
}
