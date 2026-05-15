import type { MetricsResult, AnalyzedEntry, Bottleneck } from '../types.js';
import type { AnalyzerFn } from '../interfaces.js';
import type { AnalyzerConfig } from '../config.js';

const DEFAULTS = {
  largeImageThreshold: 500_000,
  unminifiedJsThreshold: 100_000,
  slowRequestThreshold: 2000,
  highTtfbThreshold: 1000,
  missingCacheHeadersThreshold: 5,
  largeBundleThreshold: 500_000,
  noEtagThreshold: 5,
  serialRequestMinCount: 3,
  renderBlockingThreshold: 50_000,
  thirdPartyRequestThreshold: 20,
};

export function largeImagesAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const threshold = cfg?.largeImageThreshold ?? DEFAULTS.largeImageThreshold;
  return (_metrics, entries) => {
    const large = entries.filter(
      (e) => e.resourceType === 'image' && e.response.content.size > threshold
    );
    if (large.length === 0) return [];
    return [{
      severity: 'high',
      category: 'images',
      title: 'Large images detected',
      detail: `${large.length} images exceed ${(threshold / 1000).toFixed(0)}KB: ${large.map((e) => e.request.url.split('/').pop()).join(', ')}`,
      suggestion: 'Compress images, use WebP/AVIF, serve responsive sizes',
    }];
  };
}

export function unminifiedJsAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const threshold = cfg?.unminifiedJsThreshold ?? DEFAULTS.unminifiedJsThreshold;
  return (_metrics, entries) => {
    const unminified = entries.filter(
      (e) =>
        e.resourceType === 'script' &&
        !e.request.url.includes('.min.') &&
        e.response.content.size > threshold
    );
    if (unminified.length === 0) return [];
    return [{
      severity: 'high',
      category: 'javascript',
      title: 'Unminified JS bundles',
      detail: `${unminified.length} scripts >${(threshold / 1000).toFixed(0)}KB appear unminified: ${unminified.map((e) => e.pathname.split('/').pop()).join(', ')}`,
      suggestion: 'Enable minification in your build step',
    }];
  };
}

export function slowRequestsAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const threshold = cfg?.slowRequestThreshold ?? DEFAULTS.slowRequestThreshold;
  return (metrics, _entries) => {
    const slow = metrics.slowestEntries.filter((e) => e.time > threshold);
    if (slow.length === 0) return [];
    return [{
      severity: 'high',
      category: 'waterfall',
      title: 'Slow requests blocking page load',
      detail: `${slow.length} requests took >${threshold}ms. Slowest: ${slow[0].request.url}`,
      suggestion: 'Optimize server response time, add CDN, or lazy-load non-critical resources',
    }];
  };
}

export function highTtfbAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const threshold = cfg?.highTtfbThreshold ?? DEFAULTS.highTtfbThreshold;
  return (_metrics, entries) => {
    const docs = entries.filter((e) => e.resourceType === 'document' && e.ttfb > threshold);
    if (docs.length === 0) return [];
    return [{
      severity: 'high',
      category: 'ttfb',
      title: 'High TTFB',
      detail: `Document TTFB is ${Math.round(docs[0].ttfb)}ms`,
      suggestion: 'Use a CDN, enable server-side caching, optimize backend queries',
    }];
  };
}

export function missingCacheHeadersAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const minCount = cfg?.missingCacheHeadersThreshold ?? DEFAULTS.missingCacheHeadersThreshold;
  return (_metrics, entries) => {
    const missing = entries.filter((e) => {
      if (e.resourceType === 'document') return false;
      return !e.response.headers.find((h) => h.name.toLowerCase() === 'cache-control');
    });
    if (missing.length <= minCount) return [];
    return [{
      severity: 'medium',
      category: 'caching',
      title: 'Missing cache headers',
      detail: `${missing.length} resources lack Cache-Control headers`,
      suggestion: 'Set Cache-Control headers for static assets (e.g., immutable, max-age=31536000)',
    }];
  };
}

export function redirectChainsAnalyzer(_cfg?: AnalyzerConfig): AnalyzerFn {
  return (metrics, _entries) => {
    if (metrics.redirectChains.length === 0) return [];
    const totalRedirectTime = Math.round(metrics.redirectChains.reduce((s, c) => s + c.totalTime, 0));
    return [{
      severity: 'medium',
      category: 'redirects',
      title: 'Redirect chains found',
      detail: `${metrics.redirectChains.length} chain(s). Total redirect time: ${totalRedirectTime}ms`,
      suggestion: 'Update links to point directly to the final URL',
    }];
  };
}

export function largeBundleAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const threshold = cfg?.largeBundleThreshold ?? DEFAULTS.largeBundleThreshold;
  return (_metrics, entries) => {
    const large = entries.filter(
      (e) =>
        (e.resourceType === 'script' || e.resourceType === 'stylesheet') &&
        e.response.content.size > threshold
    );
    if (large.length === 0) return [];
    return [{
      severity: 'high',
      category: 'bundles',
      title: 'Large JS/CSS bundles',
      detail: `${large.length} bundles >${(threshold / 1000).toFixed(0)}KB: ${large.map((e) => e.pathname.split('/').pop()).join(', ')}`,
      suggestion: 'Code-split large bundles, tree-shake unused exports, lazy-load',
    }];
  };
}

export function noEtagAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const minCount = cfg?.noEtagThreshold ?? DEFAULTS.noEtagThreshold;
  return (_metrics, entries) => {
    const cacheableTypes = new Set(['script', 'stylesheet', 'image', 'font']);
    const missing = entries.filter((e) => {
      if (!cacheableTypes.has(e.resourceType)) return false;
      const hasEtag = e.response.headers.some((h) => h.name.toLowerCase() === 'etag');
      const hasLastModified = e.response.headers.some((h) => h.name.toLowerCase() === 'last-modified');
      return !hasEtag && !hasLastModified;
    });
    if (missing.length <= minCount) return [];
    return [{
      severity: 'medium',
      category: 'caching',
      title: 'Missing ETag or Last-Modified headers',
      detail: `${missing.length} cacheable resources lack both ETag and Last-Modified`,
      suggestion: 'Add ETag or Last-Modified headers to enable conditional revalidation',
    }];
  };
}

export function serialRequestsAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const minSerial = cfg?.serialRequestMinCount ?? DEFAULTS.serialRequestMinCount;
  return (_metrics, entries) => {
    const byHost = new Map<string, AnalyzedEntry[]>();
    for (const e of entries) {
      if (!e.hostname) continue;
      if (!byHost.has(e.hostname)) byHost.set(e.hostname, []);
      byHost.get(e.hostname)!.push(e);
    }

    const results: Bottleneck[] = [];

    for (const [host, reqs] of byHost) {
      const sorted = [...reqs].sort(
        (a, b) => new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime()
      );

      let serialCount = 0;
      let prevEnd = 0;

      for (const r of sorted) {
        const start = new Date(r.startedDateTime).getTime();
        if (prevEnd > 0 && start >= prevEnd) {
          serialCount++;
        } else if (prevEnd > 0) {
          serialCount = 0;
        }
        prevEnd = start + r.time;
      }

      if (serialCount >= minSerial) {
        results.push({
          severity: 'medium',
          category: 'waterfall',
          title: `Serial requests to ${host}`,
          detail: `${serialCount + 1} consecutive requests to ${host} are serial (not parallel)`,
          suggestion: 'Enable HTTP/2 multiplexing, use connection keepalive, or parallelize resource loading',
        });
      }
    }

    return results;
  };
}

export function renderBlockingAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const threshold = cfg?.renderBlockingThreshold ?? DEFAULTS.renderBlockingThreshold;
  return (_metrics, entries) => {
    const largeBlocking = entries.filter((e) => e.isBlocking && e.response.content.size > threshold);
    if (largeBlocking.length === 0) return [];
    return [{
      severity: 'high',
      category: 'critical-path',
      title: 'Render-blocking resources',
      detail: `${largeBlocking.length} blocking resources >${(threshold / 1000).toFixed(0)}KB: ${largeBlocking.map((e) => e.pathname.split('/').pop()).join(', ')}`,
      suggestion: 'Inline critical CSS, defer non-critical CSS/JS, use media queries on stylesheets',
    }];
  };
}

export function thirdPartyAnalyzer(cfg?: AnalyzerConfig): AnalyzerFn {
  const threshold = cfg?.thirdPartyRequestThreshold ?? DEFAULTS.thirdPartyRequestThreshold;
  return (_metrics, entries) => {
    const mainHost = entries[0]?.hostname;
    if (!mainHost) return [];

    const hostCounts = new Map<string, number>();
    for (const e of entries) {
      if (!e.hostname) continue;
      hostCounts.set(e.hostname, (hostCounts.get(e.hostname) ?? 0) + 1);
    }

    const results: Bottleneck[] = [];
    for (const [host, count] of hostCounts) {
      if (count > threshold && host !== mainHost) {
        results.push({
          severity: 'low',
          category: 'third-party',
          title: `High request count to ${host}`,
          detail: `${count} requests to ${host}`,
          suggestion: 'Evaluate if all third-party resources are necessary',
        });
      }
    }

    return results;
  };
}
