export function fmtBytes(b: number): string {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

export function fmtBytesFull(b: number): string {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB (' + b + ' B)';
  return (b / 1048576).toFixed(1) + ' MB (' + fmtBytes(b) + ')';
}

export function fmtMs(ms: number | undefined | null): string {
  if (ms == null) return '\u2014';
  if (ms < 1000) return Math.round(ms) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

export function truncate(s: string | undefined | null, n: number): string {
  return s && s.length > n ? s.slice(0, n) + '\u2026' : s || '';
}
