import type { MetricsResult, AnalyzedEntry, Bottleneck } from '../types.js';
import type { IAnalyzer } from '../interfaces.js';

/** Detects unoptimized large images (>500KB) */
export class LargeImagesAnalyzer implements IAnalyzer {
  readonly name = 'large-images';

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] | null {
    const large = entries.filter(
      (e) => e.resourceType === 'image' && e.response.content.size > 500_000
    );
    if (large.length === 0) return null;

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

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] | null {
    const unminified = entries.filter(
      (e) =>
        e.resourceType === 'script' &&
        !e.request.url.includes('.min.') &&
        e.response.content.size > 100_000
    );
    if (unminified.length === 0) return null;

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

  analyze(metrics: MetricsResult, _entries: AnalyzedEntry[]): Bottleneck[] | null {
    const slow = metrics.slowestEntries.filter((e) => e.time > 2000);
    if (slow.length === 0) return null;

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

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] | null {
    const docs = entries.filter((e) => e.resourceType === 'document' && e.ttfb > 1000);
    if (docs.length === 0) return null;

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

  analyze(_metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] | null {
    const missing = entries.filter((e) => {
      if (e.resourceType === 'document') return false;
      const cc = e.response.headers.find(
        (h) => h.name.toLowerCase() === 'cache-control'
      );
      return !cc;
    });
    if (missing.length <= 5) return null;

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

  analyze(metrics: MetricsResult, _entries: AnalyzedEntry[]): Bottleneck[] | null {
    if (metrics.redirectChains.length === 0) return null;

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

/** Warns about excessive requests to third-party hosts */
export class ThirdPartyAnalyzer implements IAnalyzer {
  readonly name = 'third-party';

  analyze(metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] | null {
    const mainHost = entries[0]?.hostname;
    if (!mainHost) return null;

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

    return results.length > 0 ? results : null;
  }
}
