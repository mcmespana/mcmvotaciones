/**
 * Device fingerprinting utilities for vote tracking
 */

/**
 * Get basic device information
 */
export function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const platform = navigator.platform;
  const screenResolution = `${screen.width}x${screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  return {
    userAgent,
    language,
    platform,
    screenResolution,
    timezone,
  };
}

/**
 * Generate a device fingerprint hash
 */
export function generateDeviceHash(roundId: string, ipAddress?: string): string {
  const deviceInfo = getDeviceInfo();
  
  // Create a stable fingerprint based on device characteristics
  const fingerprint = [
    deviceInfo.userAgent,
    deviceInfo.language,
    deviceInfo.platform,
    deviceInfo.screenResolution,
    deviceInfo.timezone,
    roundId,
    ipAddress || 'unknown'
  ].join('|');
  
  // Use a simple hash function for browser compatibility
  return simpleHash(fingerprint);
}

/**
 * Simple hash function that works in browsers
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get IP address (this will need to be supplemented by the server)
 */
export async function getIPAddress(): Promise<string> {
  try {
    // In a real application, you'd get this from your server
    // For now, we'll use a placeholder
    return 'client-side-unknown';
  } catch (error) {
    console.warn('Failed to get IP address:', error);
    return 'unknown';
  }
}

/**
 * Check if voting is available in this browser
 */
export function isVotingAvailable(): boolean {
  // Check for required browser features
  return !!(
    navigator.userAgent &&
    screen.width &&
    screen.height &&
    typeof localStorage !== 'undefined'
  );
}

/**
 * Store vote locally to prevent multiple attempts
 */
export function markAsVoted(roundId: string): void {
  try {
    localStorage.setItem(`voted_${roundId}`, new Date().toISOString());
  } catch (error) {
    console.warn('Failed to mark as voted:', error);
  }
}

/**
 * Check if user has already voted in this round
 */
export function hasVotedLocally(roundId: string): boolean {
  try {
    return localStorage.getItem(`voted_${roundId}`) !== null;
  } catch (error) {
    console.warn('Failed to check local vote status:', error);
    return false;
  }
}

/**
 * Clear local vote data (for testing purposes)
 */
export function clearLocalVoteData(roundId?: string): void {
  try {
    if (roundId) {
      localStorage.removeItem(`voted_${roundId}`);
    } else {
      // Clear all vote data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('voted_')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to clear local vote data:', error);
  }
}