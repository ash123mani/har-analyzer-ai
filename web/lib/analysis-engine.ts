import type { HarEntry, AnalyzedEntry, Metrics, Stats, RedirectChain } from './types';
import { tagEntries } from './third-party';

function safeTiming(v: number | undefined | null): number {
  return v == null || v < 0 ? 0 : v;
}

function classifyResourceType(url: string, mime: string): string {
  if (mime.includes('text/html')) return 'document';
  if (mime.includes('text/css')) return 'stylesheet';
  if (mime.includes('javascript') || mime.includes('ecmascript')) return 'script';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('font')) return 'font';
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  if (ext === 'css') return 'stylesheet';
  if (['js', 'mjs', 'cjs'].includes(ext)) return 'script';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico'].includes(ext)) return 'image';
  if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext)) return 'font';
  return 'other';
}

export function analyzeEntries(entries: HarEntry[]): AnalyzedEntry[] {
  const withMeta: AnalyzedEntry[] = entries
    .filter((e): e is HarEntry => e != null)
    .map(e => {
      let hostname = '';
      let pathname = '';
      let reqUrl = '';
      try {
        reqUrl = (e.request?.url) || '';
        const u = new URL(reqUrl);
        hostname = u.hostname;
        pathname = u.pathname;
      } catch {
        /* invalid URL */
      }
      const ct = (e.response?.content?.mimeType) || '';
      const rt = classifyResourceType(reqUrl, ct);
      return {
        ...e,
        resourceType: rt,
        hostname,
        pathname,
        ttfb: safeTiming(e.timings?.wait),
        isBlocking: rt === 'document' || rt === 'stylesheet',
        service: null,
      };
    });
  return tagEntries(withMeta);
}

export function findRedirectChains(entries: AnalyzedEntry[]): RedirectChain[] {
  const byUrl = new Map<string, AnalyzedEntry>();
  for (const e of entries) {
    try { byUrl.set(e.request.url, e); } catch { /* skip */ }
  }
  const chains: RedirectChain[] = [];
  const seen = new Set<AnalyzedEntry>();
  for (const e of entries) {
    try {
      if (!e.response?.redirectURL || !e.response.status || e.response.status < 300 || e.response.status >= 400) continue;
      if (seen.has(e)) continue;
      const chain: AnalyzedEntry[] = [];
      let cur: AnalyzedEntry | undefined = e;
      let totalTime = 0;
      while (cur && cur.response?.redirectURL) {
        seen.add(cur);
        chain.push(cur);
        totalTime += cur.time || 0;
        cur = byUrl.get(cur.response.redirectURL);
      }
      if (cur && chain.length > 0) {
        seen.add(cur);
        chain.push(cur);
        totalTime += cur.time || 0;
      }
      if (chain.length > 1) {
        chains.push({
          initialUrl: chain[0].request.url || '',
          finalUrl: chain[chain.length - 1].request.url || '',
          entries: chain,
          totalTime,
        });
      }
    } catch { /* skip */ }
  }
  return chains;
}

function stats(arr: number[]): Stats {
  if (!arr.length) return { min: 0, max: 0, avg: 0 };
  return {
    min: Math.min(...arr),
    max: Math.max(...arr),
    avg: arr.reduce((a, b) => a + b, 0) / arr.length,
  };
}

export function computeMetrics(
  entries: AnalyzedEntry[],
  redirectChains: RedirectChain[],
  pageTimings?: { onContentLoad?: number; onLoad?: number }
): Metrics {
  const totalRequests = entries.length;
  const totalSize = entries.reduce((s, e) => s + ((e.response?.content?.size) || 0), 0);
  const slowestEntries = [...entries].sort((a, b) => b.time - a.time).slice(0, 5);
  const blockingEntries = entries.filter(e => e.isBlocking);
  const ttfbTimes = entries.map(e => e.ttfb).filter(t => t > 0);
  const dnsTimes = entries.map(e => safeTiming(e.timings?.dns)).filter(t => t > 0);
  const connectTimes = entries
    .map(e => safeTiming(e.timings?.connect) - safeTiming(e.timings?.ssl))
    .filter(t => t > 0);
  const byType: Record<string, { count: number; totalSize: number; totalTime: number }> = {};
  for (const e of entries) {
    const t = e.resourceType;
    if (!byType[t]) byType[t] = { count: 0, totalSize: 0, totalTime: 0 };
    byType[t].count++;
    byType[t].totalSize += e.response?.content?.size || 0;
    byType[t].totalTime += e.time || 0;
  }
  const waterfall = [...entries].sort(
    (a, b) => new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime(),
  );
  const totalTime =
    waterfall.length > 0
      ? new Date(waterfall[waterfall.length - 1].startedDateTime).getTime() +
        (waterfall[waterfall.length - 1].time || 0) -
        new Date(waterfall[0].startedDateTime).getTime()
      : 0;
  return {
    totalRequests,
    totalSize,
    totalTime,
    onContentLoad: pageTimings?.onContentLoad,
    onLoad: pageTimings?.onLoad,
    slowestEntries,
    blockingEntries,
    redirectChains,
    ttfbStats: stats(ttfbTimes),
    dnsStats: stats(dnsTimes),
    connectStats: stats(connectTimes),
    byType,
    waterfall,
  };
}
