/** Format bytes to a human-readable string (e.g., "1.5 MB") */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format milliseconds to a human-readable string (e.g., "2.3 s") */
export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** Pad a string on the right to minimum width */
export function padEnd(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length));
}

/** Pad a string on the left to minimum width */
export function padStart(s: string, n: number): string {
  return ' '.repeat(Math.max(0, n - s.length)) + s;
}
