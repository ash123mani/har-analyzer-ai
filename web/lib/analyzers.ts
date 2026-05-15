import type { AnalyzedEntry, Bottleneck, Metrics } from './types';

const THRESHOLDS = {
  largeImage: 500_000,
  unminifiedJs: 100_000,
  slowRequest: 2000,
  highTtfb: 1000,
  missingCacheMin: 5,
  largeBundle: 500_000,
  noEtagMin: 5,
  serialMin: 3,
  renderBlocking: 50_000,
  thirdParty: 20,
};

export function largeImagesAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const l = entries.filter(e => e.resourceType === 'image' && (e.response?.content?.size || 0) > THRESHOLDS.largeImage);
  return l.length ? [{
    severity: 'high', title: 'Large Images',
    detail: `${l.length} images exceed ${THRESHOLDS.largeImage / 1000}KB`,
    suggestion: 'Compress images, use WebP/AVIF, serve responsive sizes',
  }] : [];
}

export function unminifiedJsAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const u = entries.filter(e =>
    e.resourceType === 'script' &&
    !e.request.url.includes('.min.') &&
    (e.response?.content?.size || 0) > THRESHOLDS.unminifiedJs
  );
  return u.length ? [{
    severity: 'high', title: 'Unminified JS',
    detail: `${u.length} scripts >${THRESHOLDS.unminifiedJs / 1000}KB appear unminified`,
    suggestion: 'Enable minification in your build step',
  }] : [];
}

export function slowRequestsAnalyzer(metrics: Metrics, _entries: AnalyzedEntry[]): Bottleneck[] {
  const s = metrics.slowestEntries.filter(e => e.time > THRESHOLDS.slowRequest);
  return s.length ? [{
    severity: 'high', title: 'Slow Requests',
    detail: `${s.length} requests >${THRESHOLDS.slowRequest}ms`,
    suggestion: 'Optimize server response, add CDN, lazy-load non-critical resources',
  }] : [];
}

export function highTtfbAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const d = entries.filter(e => e.resourceType === 'document' && e.ttfb > THRESHOLDS.highTtfb);
  return d.length ? [{
    severity: 'high', title: 'High TTFB',
    detail: `Document TTFB is ${Math.round(d[0].ttfb)}ms`,
    suggestion: 'Use CDN, enable server-side caching, optimize backend queries',
  }] : [];
}

export function missingCacheAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const c = entries.filter(e =>
    e.resourceType !== 'document' &&
    !e.response?.headers?.find((h: { name: string }) => h.name.toLowerCase() === 'cache-control')
  );
  return c.length > THRESHOLDS.missingCacheMin ? [{
    severity: 'medium', title: 'Missing Cache Headers',
    detail: `${c.length} resources lack Cache-Control`,
    suggestion: 'Set Cache-Control headers for static assets',
  }] : [];
}

export function redirectChainsAnalyzer(metrics: Metrics, _entries: AnalyzedEntry[]): Bottleneck[] {
  if (!metrics.redirectChains.length) return [];
  const t = Math.round(metrics.redirectChains.reduce((s, c) => s + c.totalTime, 0));
  return [{
    severity: 'medium', title: 'Redirect Chains',
    detail: `${metrics.redirectChains.length} chain(s), ${t}ms total`,
    suggestion: 'Update links to point directly to final URL',
  }];
}

export function missingEtagAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const cacheable = new Set(['script', 'stylesheet', 'image', 'font']);
  const no = entries.filter(e =>
    cacheable.has(e.resourceType) &&
    !e.response?.headers?.some((h: { name: string }) => h.name.toLowerCase() === 'etag') &&
    !e.response?.headers?.some((h: { name: string }) => h.name.toLowerCase() === 'last-modified')
  );
  return no.length > THRESHOLDS.noEtagMin ? [{
    severity: 'medium', title: 'Missing ETag/Last-Modified',
    detail: `${no.length} cacheable resources lack validation headers`,
    suggestion: 'Add ETag or Last-Modified headers',
  }] : [];
}

export function renderBlockingAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const b = entries.filter(e => e.isBlocking && (e.response?.content?.size || 0) > THRESHOLDS.renderBlocking);
  return b.length ? [{
    severity: 'high', title: 'Render-Blocking Resources',
    detail: `${b.length} blocking resources >${THRESHOLDS.renderBlocking / 1000}KB`,
    suggestion: 'Inline critical CSS, defer non-critical CSS/JS',
  }] : [];
}

export function largeBundleAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const large = entries.filter(e =>
    (e.resourceType === 'script' || e.resourceType === 'stylesheet') &&
    (e.response?.content?.size || 0) > THRESHOLDS.largeBundle
  );
  return large.length ? [{
    severity: 'high', title: 'Large JS/CSS Bundles',
    detail: `${large.length} bundles >${THRESHOLDS.largeBundle / 1000}KB: ${large.map(e => e.pathname.split('/').pop()).join(', ')}`,
    suggestion: 'Code-split large bundles, tree-shake unused exports, lazy-load',
  }] : [];
}

export function serialRequestsAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const byHost = new Map<string, AnalyzedEntry[]>();
  for (const e of entries) {
    if (!e.hostname) continue;
    const arr = byHost.get(e.hostname) || [];
    arr.push(e);
    byHost.set(e.hostname, arr);
  }
  const results: Bottleneck[] = [];
  for (const [host, reqs] of byHost) {
    const sorted = [...reqs].sort(
      (a, b) => new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime(),
    );
    let serialCount = 0;
    let prevEnd = 0;
    for (const r of sorted) {
      const start = new Date(r.startedDateTime).getTime();
      if (prevEnd > 0 && start >= prevEnd) serialCount++;
      else if (prevEnd > 0) serialCount = 0;
      prevEnd = start + r.time;
    }
    if (serialCount >= THRESHOLDS.serialMin) {
      results.push({
        severity: 'medium', title: `Serial Requests to ${host}`,
        detail: `${serialCount + 1} consecutive requests to ${host} are serial (not parallel)`,
        suggestion: 'Enable HTTP/2 multiplexing, use connection keepalive, or parallelize resource loading',
      });
    }
  }
  return results;
}

export function thirdPartyAnalyzer(_metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  const main = entries[0]?.hostname;
  if (!main) return [];
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.hostname) counts.set(e.hostname, (counts.get(e.hostname) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([h, c]) => c > THRESHOLDS.thirdParty && h !== main)
    .map(([h, c]) => ({
      severity: 'low' as const, title: `High Traffic to ${h}`,
      detail: `${c} requests to third-party ${h}`,
      suggestion: 'Evaluate if all third-party resources are necessary',
    }));
}

const analyzerFns: ((metrics: Metrics, entries: AnalyzedEntry[]) => Bottleneck[])[] = [
  largeImagesAnalyzer, unminifiedJsAnalyzer, slowRequestsAnalyzer,
  highTtfbAnalyzer, missingCacheAnalyzer, redirectChainsAnalyzer,
  missingEtagAnalyzer, renderBlockingAnalyzer, largeBundleAnalyzer,
  serialRequestsAnalyzer, thirdPartyAnalyzer,
];

export function runAnalyzers(metrics: Metrics, entries: AnalyzedEntry[]): Bottleneck[] {
  return analyzerFns.flatMap(fn => fn(metrics, entries));
}
