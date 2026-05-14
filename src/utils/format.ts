export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function padEnd(s: string, n: number): string {
  return s + ' '.repeat(Math.max(0, n - s.length));
}

export function padStart(s: string, n: number): string {
  return ' '.repeat(Math.max(0, n - s.length)) + s;
}
