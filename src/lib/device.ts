/**
 * Device fingerprinting utilities for vote tracking
 * Enhanced fingerprinting with WebGL, Canvas, device memory, etc.
 */

// Extended Navigator interface for device memory
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * Get enhanced device information including advanced fingerprinting
 */
export function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const language = navigator.language;
  const languages = navigator.languages?.join(',') || navigator.language;
  const platform = navigator.platform;
  const vendor = navigator.vendor || '';
  const screenResolution = `${screen.width}x${screen.height}x${screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const deviceMemory = (navigator as NavigatorWithDeviceMemory).deviceMemory || 'unknown';
  const hardwareConcurrency = navigator.hardwareConcurrency || 'unknown';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  
  // WebGL fingerprinting
  const webGLInfo = getWebGLInfo();
  
  // Canvas fingerprinting
  const canvasFingerprint = getCanvasFingerprint();
  
  return {
    userAgent,
    language,
    languages,
    platform,
    vendor,
    screenResolution,
    timezone,
    deviceMemory,
    hardwareConcurrency,
    maxTouchPoints,
    webGLInfo,
    canvasFingerprint,
  };
}

/**
 * Get WebGL renderer information for fingerprinting
 */
function getWebGLInfo(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'no-debug-info';
    
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    
    return `${vendor}|${renderer}`;
  } catch (error) {
    return 'webgl-error';
  }
}

/**
 * Generate a canvas fingerprint
 */
function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('MCM Votaciones 🗳️', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Canvas FP', 4, 17);
    
    return simpleHash(canvas.toDataURL());
  } catch (error) {
    return 'canvas-error';
  }
}

/**
 * Generate an enhanced device fingerprint hash
 */
export function generateDeviceHash(roundId: string, ipAddress?: string): string {
  const deviceInfo = getDeviceInfo();
  
  // Create a comprehensive fingerprint based on device characteristics
  const fingerprint = [
    deviceInfo.userAgent,
    deviceInfo.language,
    deviceInfo.languages,
    deviceInfo.platform,
    deviceInfo.vendor,
    deviceInfo.screenResolution,
    deviceInfo.timezone,
    deviceInfo.deviceMemory,
    deviceInfo.hardwareConcurrency,
    deviceInfo.maxTouchPoints,
    deviceInfo.webGLInfo,
    deviceInfo.canvasFingerprint,
    roundId,
    ipAddress || 'unknown'
  ].join('|');
  
  // Use a simple hash function for browser compatibility
  return simpleHash(fingerprint);
}

/**
 * Generate or retrieve a persistent browser instance ID
 * This ID is stored in both localStorage and a cookie for redundancy
 */
export function generateBrowserInstanceId(): string {
  const STORAGE_KEY = 'mcm_browser_instance_id';
  const COOKIE_NAME = 'mcm_browser_id';
  const COOKIE_EXPIRY_DAYS = 365;
  
  try {
    // Try to get from localStorage first
    let instanceId = localStorage.getItem(STORAGE_KEY);
    
    // If not in localStorage, try cookie
    if (!instanceId) {
      instanceId = getCookie(COOKIE_NAME);
    }
    
    // If still not found, generate a new one
    if (!instanceId) {
      instanceId = generateUUID();
    }
    
    // Store in both localStorage and cookie
    localStorage.setItem(STORAGE_KEY, instanceId);
    setCookie(COOKIE_NAME, instanceId, COOKIE_EXPIRY_DAYS);
    
    return instanceId;
  } catch (error) {
    console.warn('Failed to generate/retrieve browser instance ID:', error);
    // Fallback to a session-based ID (will change on browser restart)
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get a cookie value by name
 */
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set a cookie
 */
function setCookie(name: string, value: string, days: number): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure`;
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
export function markAsVoted(roundId: string, roundNumber: number): void {
  try {
    localStorage.setItem(`voted_${roundId}_round_${roundNumber}`, new Date().toISOString());
  } catch (error) {
    console.warn('Failed to mark as voted:', error);
  }
}

/**
 * Check if user has already voted in this round
 */
export function hasVotedLocally(roundId: string, roundNumber: number): boolean {
  try {
    return localStorage.getItem(`voted_${roundId}_round_${roundNumber}`) !== null;
  } catch (error) {
    console.warn('Failed to check local vote status:', error);
    return false;
  }
}

/**
 * Clear local vote data (for testing purposes)
 */
export function clearLocalVoteData(roundId?: string, roundNumber?: number): void {
  try {
    if (roundId) {
      if (typeof roundNumber === 'number') {
        localStorage.removeItem(`voted_${roundId}_round_${roundNumber}`);
      } else {
        // Remove all rounds for this roundId
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(`voted_${roundId}_round_`)) {
            localStorage.removeItem(key);
          }
        });
      }
    } else {
      // Clear all vote data
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('voted_') && key.includes('_round_')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to clear local vote data:', error);
  }
}