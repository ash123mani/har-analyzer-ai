import { describe, it, expect } from 'vitest';
import {
  largeImagesAnalyzer,
  unminifiedJsAnalyzer,
  slowRequestsAnalyzer,
  highTtfbAnalyzer,
  missingCacheHeadersAnalyzer,
  redirectChainsAnalyzer,
  largeBundleAnalyzer,
  noEtagAnalyzer,
  serialRequestsAnalyzer,
  renderBlockingAnalyzer,
  thirdPartyAnalyzer,
} from '../src/analyzers/index.js';
import { runAnalyzers } from '../src/analyzers/index.js';
import type { MetricsResult, AnalyzedEntry } from '../src/types.js';

function makeEntry(overrides: Partial<AnalyzedEntry> = {}): AnalyzedEntry {
  return {
    startedDateTime: '2024-01-01T00:00:00Z',
    time: 100,
    request: { method: 'GET', url: 'https://example.com/file.js', httpVersion: 'HTTP/2', headers: [], queryString: [], cookies: [], headersSize: 0, bodySize: 0 },
    response: { status: 200, statusText: 'OK', httpVersion: 'HTTP/2', headers: [], cookies: [], content: { size: 1000, mimeType: 'application/javascript' }, redirectURL: '', headersSize: 0, bodySize: 0 },
    cache: {},
    timings: { dns: 0, connect: 0, ssl: 0, wait: 10, receive: 10, send: 0 },
    resourceType: 'script',
    hostname: 'example.com',
    pathname: '/file.js',
    ttfb: 10,
    isBlocking: false,
    ...overrides,
  };
}

function makeMetrics(overrides: Partial<MetricsResult> = {}): MetricsResult {
  return {
    totalRequests: 0,
    totalSize: 0,
    totalTime: 0,
    slowestEntries: [],
    blockingEntries: [],
    redirectChains: [],
    ttfbStats: { min: 0, max: 0, avg: 0 },
    dnsStats: { min: 0, max: 0, avg: 0 },
    connectStats: { min: 0, max: 0, avg: 0 },
    byType: {},
    waterfall: [],
    ...overrides,
  };
}

describe('largeImagesAnalyzer', () => {
  it('detects images exceeding threshold', () => {
    const entries = [
      makeEntry({ resourceType: 'image', response: { ...makeEntry().response, content: { size: 600_000, mimeType: 'image/jpeg' } } }),
    ];
    const results = largeImagesAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
    expect(results[0].severity).toBe('high');
    expect(results[0].category).toBe('images');
  });

  it('skips small images', () => {
    const entries = [
      makeEntry({ resourceType: 'image', response: { ...makeEntry().response, content: { size: 1000, mimeType: 'image/jpeg' } } }),
    ];
    const results = largeImagesAnalyzer()(makeMetrics(), entries);
    expect(results).toEqual([]);
  });

  it('respects custom threshold', () => {
    const entries = [
      makeEntry({ resourceType: 'image', response: { ...makeEntry().response, content: { size: 3000, mimeType: 'image/jpeg' } } }),
    ];
    const results = largeImagesAnalyzer({ largeImageThreshold: 2000 })(makeMetrics(), entries);
    expect(results.length).toBe(1);
  });
});

describe('unminifiedJsAnalyzer', () => {
  it('detects unminified JS', () => {
    const entries = [
      makeEntry({ resourceType: 'script', request: { ...makeEntry().request, url: 'https://example.com/app.js' }, response: { ...makeEntry().response, content: { size: 200_000, mimeType: 'application/javascript' } } }),
    ];
    const results = unminifiedJsAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
  });

  it('skips minified JS', () => {
    const entries = [
      makeEntry({ resourceType: 'script', request: { ...makeEntry().request, url: 'https://example.com/app.min.js' } }),
    ];
    const results = unminifiedJsAnalyzer()(makeMetrics(), entries);
    expect(results).toEqual([]);
  });
});

describe('slowRequestsAnalyzer', () => {
  it('detects slow requests', () => {
    const slowEntry = makeEntry({ time: 5000 });
    const metrics = makeMetrics({ slowestEntries: [slowEntry] });
    const results = slowRequestsAnalyzer()(metrics, []);
    expect(results.length).toBe(1);
  });

  it('skips fast requests', () => {
    const metrics = makeMetrics({ slowestEntries: [makeEntry({ time: 100 })] });
    const results = slowRequestsAnalyzer()(metrics, []);
    expect(results).toEqual([]);
  });
});

describe('highTtfbAnalyzer', () => {
  it('detects high TTFB on documents', () => {
    const entries = [
      makeEntry({ resourceType: 'document', ttfb: 2000 }),
    ];
    const results = highTtfbAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
  });
});

describe('missingCacheHeadersAnalyzer', () => {
  it('detects missing cache headers', () => {
    const entries = Array(10).fill(null).map(() =>
      makeEntry({ resourceType: 'script', response: { ...makeEntry().response, headers: [] } })
    );
    const results = missingCacheHeadersAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
    expect(results[0].severity).toBe('medium');
  });

  it('skips when few resources lack cache headers', () => {
    const entries = Array(3).fill(null).map(() =>
      makeEntry({ resourceType: 'script', response: { ...makeEntry().response, headers: [] } })
    );
    const results = missingCacheHeadersAnalyzer()(makeMetrics(), entries);
    expect(results).toEqual([]);
  });
});

describe('redirectChainsAnalyzer', () => {
  it('detects redirect chains', () => {
    const metrics = makeMetrics({
      redirectChains: [{ initialUrl: 'https://a.com', finalUrl: 'https://b.com', entries: [], totalTime: 200 }],
    });
    const results = redirectChainsAnalyzer()(metrics, []);
    expect(results.length).toBe(1);
  });
});

describe('largeBundleAnalyzer', () => {
  it('detects large JS bundles', () => {
    const entries = [
      makeEntry({ resourceType: 'script', response: { ...makeEntry().response, content: { size: 1_000_000, mimeType: 'application/javascript' } } }),
    ];
    const results = largeBundleAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
  });
});

describe('noEtagAnalyzer', () => {
  it('detects missing ETags on cacheable resources', () => {
    const entries = Array(10).fill(null).map(() =>
      makeEntry({ resourceType: 'script', response: { ...makeEntry().response, headers: [] } })
    );
    const results = noEtagAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
  });

  it('skips resources with ETag', () => {
    const entries = Array(10).fill(null).map(() =>
      makeEntry({ resourceType: 'script', response: { ...makeEntry().response, headers: [{ name: 'ETag', value: '"abc123"' }] } })
    );
    const results = noEtagAnalyzer()(makeMetrics(), entries);
    expect(results).toEqual([]);
  });
});

describe('serialRequestsAnalyzer', () => {
  it('skips when no serial requests', () => {
    const results = serialRequestsAnalyzer()(makeMetrics(), [makeEntry()]);
    expect(results).toEqual([]);
  });
});

describe('renderBlockingAnalyzer', () => {
  it('detects large render-blocking resources', () => {
    const entries = [
      makeEntry({ isBlocking: true, resourceType: 'stylesheet', response: { ...makeEntry().response, content: { size: 100_000, mimeType: 'text/css' } } }),
    ];
    const results = renderBlockingAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
  });
});

describe('thirdPartyAnalyzer', () => {
  it('detects high third-party request counts', () => {
    const entries = [
      makeEntry({ hostname: 'example.com' }),
      ...Array(25).fill(null).map(() => makeEntry({ hostname: 'tracker.com' })),
    ];
    const results = thirdPartyAnalyzer()(makeMetrics(), entries);
    expect(results.length).toBe(1);
    expect(results[0].severity).toBe('low');
  });
});

describe('runAnalyzers', () => {
  it('runs multiple analyzers and flattens results', () => {
    const entries = [
      makeEntry({ resourceType: 'image', response: { ...makeEntry().response, content: { size: 600_000, mimeType: 'image/jpeg' } } }),
    ];
    const results = runAnalyzers([largeImagesAnalyzer(), unminifiedJsAnalyzer()], makeMetrics(), entries);
    expect(results.length).toBe(1);
  });
});
