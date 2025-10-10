const DEBUG_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEBUG_LOGS === 'true';

export function debugLog(message?: unknown, ...optionalParams: unknown[]): void {
  if (!DEBUG_ENABLED) return;
  if (optionalParams.length === 0) {
    console.log(message);
  } else {
    console.log(message, ...optionalParams);
  }
}
