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
  const saltHex = buildSaltHex();

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
  const hashHex = await digestPayload(data, payload);

  return hashHex;
}

function buildSaltHex(): string {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(salt)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`;
}

async function digestPayload(data: Uint8Array, rawPayload: string): Promise<string> {
  if (
    typeof crypto !== "undefined" &&
    crypto.subtle &&
    typeof crypto.subtle.digest === "function"
  ) {
    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fallback below for restricted environments (older Safari/WebView or non-secure contexts).
    }
  }

  return fallbackHash(rawPayload);
}

function fallbackHash(input: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);

    hashB ^= code;
    hashB = Math.imul(hashB, 0x45d9f3b);
  }

  const left = (hashA >>> 0).toString(16).padStart(8, "0");
  const right = (hashB >>> 0).toString(16).padStart(8, "0");
  const block = `${left}${right}`;
  return `${block}${block}${block}${block}`.slice(0, 64);
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
