import type { MetricsResult, AnalyzedEntry, Bottleneck } from '../types.js';
import type { IAnalyzer } from '../interfaces.js';

/** Detects unoptimized large images (>500KB) */
export class LargeImagesAnalyzer implements IAnalyzer {
  readonly name = 'large-images';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const large = entries.filter(
      (e) => e.resourceType === 'image' && e.response.content.size > 500_000
    );
    if (large.length === 0) return [];

    return [
      {
        severity: 'high',
        category: 'images',
        title: 'Large images detected',
        detail: `${large.length} images exceed 500KB: ${large
          .map((e) => e.request.url.split('/').pop())
          .join(', ')}`,
        suggestion: 'Compress images, use WebP/AVIF, serve responsive sizes',
      },
    ];
  }
}

/** Detects unminified JavaScript bundles (>100KB, no .min. in path) */
export class UnminifiedJsAnalyzer implements IAnalyzer {
  readonly name = 'unminified-js';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const unminified = entries.filter(
      (e) =>
        e.resourceType === 'script' &&
        !e.request.url.includes('.min.') &&
        e.response.content.size > 100_000
    );
    if (unminified.length === 0) return [];

    return [
      {
        severity: 'high',
        category: 'javascript',
        title: 'Unminified JS bundles',
        detail: `${unminified.length} scripts >100KB appear unminified: ${unminified
          .map((e) => e.pathname.split('/').pop())
          .join(', ')}`,
        suggestion: 'Enable minification in your build step',
      },
    ];
  }
}

/** Flags requests taking >2s */
export class SlowRequestsAnalyzer implements IAnalyzer {
  readonly name = 'slow-requests';

  analyze(metrics: MetricsResult, _entries: AnalyzedEntry[]): Bottleneck[] {
    const slow = metrics.slowestEntries.filter((e) => e.time > 2000);
    if (slow.length === 0) return [];

    return [
      {
        severity: 'high',
        category: 'waterfall',
        title: 'Slow requests blocking page load',
        detail: `${slow.length} requests took >2s. Slowest: ${slow[0].request.url}`,
        suggestion:
          'Optimize server response time, add CDN, or lazy-load non-critical resources',
      },
    ];
  }
}

/** Checks for high TTFB on the document resource */
export class HighTtfbAnalyzer implements IAnalyzer {
  readonly name = 'high-ttfb';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const docs = entries.filter((e) => e.resourceType === 'document' && e.ttfb > 1000);
    if (docs.length === 0) return [];

    return [
      {
        severity: 'high',
        category: 'ttfb',
        title: 'High TTFB',
        detail: `Document TTFB is ${Math.round(docs[0].ttfb)}ms`,
        suggestion: 'Use a CDN, enable server-side caching, optimize backend queries',
      },
    ];
  }
}

/** Finds cacheable resources missing Cache-Control headers */
export class MissingCacheHeadersAnalyzer implements IAnalyzer {
  readonly name = 'missing-cache-headers';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const missing = entries.filter((e) => {
      if (e.resourceType === 'document') return false;
      const cc = e.response.headers.find(
        (h) => h.name.toLowerCase() === 'cache-control'
      );
      return !cc;
    });
    if (missing.length <= 5) return [];

    return [
      {
        severity: 'medium',
        category: 'caching',
        title: 'Missing cache headers',
        detail: `${missing.length} resources lack Cache-Control headers`,
        suggestion:
          'Set Cache-Control headers for static assets (e.g., immutable, max-age=31536000)',
      },
    ];
  }
}

/** Reports HTTP redirect chains */
export class RedirectChainsAnalyzer implements IAnalyzer {
  readonly name = 'redirect-chains';

  analyze(metrics: MetricsResult, _entries: AnalyzedEntry[]): Bottleneck[] {
    if (metrics.redirectChains.length === 0) return [];

    const totalRedirectTime = Math.round(
      metrics.redirectChains.reduce((s, c) => s + c.totalTime, 0)
    );
    return [
      {
        severity: 'medium',
        category: 'redirects',
        title: 'Redirect chains found',
        detail: `${metrics.redirectChains.length} chain(s). Total redirect time: ${totalRedirectTime}ms`,
        suggestion: 'Update links to point directly to the final URL',
      },
    ];
  }
}

/** Detects bundles (>500KB) regardless of .min. status */
export class LargeBundleAnalyzer implements IAnalyzer {
  readonly name = 'large-bundles';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const large = entries.filter(
      (e) =>
        (e.resourceType === 'script' || e.resourceType === 'stylesheet') &&
        e.response.content.size > 500_000
    );
    if (large.length === 0) return [];

    return [
      {
        severity: 'high',
        category: 'bundles',
        title: 'Large JS/CSS bundles',
        detail: `${large.length} bundles >500KB: ${large
          .map((e) => e.pathname.split('/').pop())
          .join(', ')}`,
        suggestion: 'Code-split large bundles, tree-shake unused exports, lazy-load',
      },
    ];
  }
}

/** Flags missing ETag/Last-Modified on cacheable resources */
export class NoEtagAnalyzer implements IAnalyzer {
  readonly name = 'missing-etag';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const cacheableTypes = new Set(['script', 'stylesheet', 'image', 'font']);
    const missing = entries.filter((e) => {
      if (!cacheableTypes.has(e.resourceType)) return false;
      const hasEtag = e.response.headers.some((h) => h.name.toLowerCase() === 'etag');
      const hasLastModified = e.response.headers.some(
        (h) => h.name.toLowerCase() === 'last-modified'
      );
      return !hasEtag && !hasLastModified;
    });
    if (missing.length <= 5) return [];

    return [
      {
        severity: 'medium',
        category: 'caching',
        title: 'Missing ETag or Last-Modified headers',
        detail: `${missing.length} cacheable resources lack both ETag and Last-Modified`,
        suggestion: 'Add ETag or Last-Modified headers to enable conditional revalidation',
      },
    ];
  }
}

/** Detects serial (non-parallel) request patterns to the same host */
export class SerialRequestsAnalyzer implements IAnalyzer {
  readonly name = 'serial-requests';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const byHost = new Map<string, AnalyzedEntry[]>();
    for (const e of entries) {
      if (!e.hostname) continue;
      if (!byHost.has(e.hostname)) byHost.set(e.hostname, []);
      byHost.get(e.hostname)!.push(e);
    }

    const results: Bottleneck[] = [];

    for (const [host, reqs] of byHost) {
      const sorted = [...reqs].sort(
        (a, b) =>
          new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime()
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

      if (serialCount >= 3) {
        results.push({
          severity: 'medium',
          category: 'waterfall',
          title: `Serial requests to ${host}`,
          detail: `${serialCount + 1} consecutive requests to ${host} are serial (not parallel)`,
          suggestion:
            'Enable HTTP/2 multiplexing, use connection keepalive, or parallelize resource loading',
        });
      }
    }

    return results;
  }
}

/** Identifies render-blocking resources (CSS/JS that block paint) */
export class RenderBlockingAnalyzer implements IAnalyzer {
  readonly name = 'render-blocking';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const blocking = entries.filter((e) => e.isBlocking);
    const largeBlocking = blocking.filter((e) => e.response.content.size > 50_000);
    if (largeBlocking.length === 0) return [];

    return [
      {
        severity: 'high',
        category: 'critical-path',
        title: 'Render-blocking resources',
        detail: `${largeBlocking.length} blocking resources >50KB: ${largeBlocking
          .map((e) => e.pathname.split('/').pop())
          .join(', ')}`,
        suggestion:
          'Inline critical CSS, defer non-critical CSS/JS, use media queries on stylesheets',
      },
    ];
  }
}

/** Warns about excessive requests to third-party hosts */
export class ThirdPartyAnalyzer implements IAnalyzer {
  readonly name = 'third-party';

  analyze(metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const mainHost = entries[0]?.hostname;
    if (!mainHost) return [];

    const hostCounts = new Map<string, number>();
    for (const e of entries) {
      if (!e.hostname) continue;
      hostCounts.set(e.hostname, (hostCounts.get(e.hostname) ?? 0) + 1);
    }

    const results: Bottleneck[] = [];
    for (const [host, count] of hostCounts) {
      if (count > 20 && host !== mainHost) {
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
  }
}
