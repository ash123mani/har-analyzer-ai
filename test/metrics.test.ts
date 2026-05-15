import { describe, it, expect } from 'vitest';
import { computeMetrics } from '../src/metrics.js';
import type { AnalyzedEntry } from '../src/types.js';

function makeEntry(overrides: Partial<AnalyzedEntry> = {}): AnalyzedEntry {
  return {
    startedDateTime: '2024-01-01T00:00:00Z',
    time: 100,
    request: {
      method: 'GET',
      url: 'https://example.com/file.js',
      httpVersion: 'HTTP/2',
      headers: [],
      queryString: [],
      cookies: [],
      headersSize: 0,
      bodySize: 0,
    },
    response: {
      status: 200,
      statusText: 'OK',
      httpVersion: 'HTTP/2',
      headers: [],
      cookies: [],
      content: { size: 1000, mimeType: 'application/javascript' },
      redirectURL: '',
      headersSize: 0,
      bodySize: 0,
    },
    cache: {},
    timings: { dns: 5, connect: 10, ssl: 3, wait: 20, receive: 30, send: 2 },
    resourceType: 'script',
    hostname: 'example.com',
    pathname: '/file.js',
    ttfb: 20,
    isBlocking: false,
    ...overrides,
  };
}

describe('computeMetrics', () => {
  it('computes basic metrics', () => {
    const entries = [makeEntry(), makeEntry({ time: 200, response: { ...makeEntry().response, content: { size: 2000, mimeType: 'image/png' } }, resourceType: 'image' })];
    const metrics = computeMetrics(entries, []);

    expect(metrics.totalRequests).toBe(2);
    expect(metrics.totalSize).toBe(3000);
    expect(metrics.slowestEntries.length).toBe(2);
  });

  it('identifies slowest entries sorted by time', () => {
    const entries = [
      makeEntry({ time: 500 }),
      makeEntry({ time: 100 }),
      makeEntry({ time: 300 }),
      makeEntry({ time: 900 }),
    ];
    const metrics = computeMetrics(entries, []);
    expect(metrics.slowestEntries[0].time).toBe(900);
    expect(metrics.slowestEntries[1].time).toBe(500);
    expect(metrics.slowestEntries[2].time).toBe(300);
  });

  it('finds blocking entries', () => {
    const entries = [
      makeEntry({ isBlocking: true, resourceType: 'stylesheet', response: { ...makeEntry().response, content: { size: 100, mimeType: 'text/css' } } }),
      makeEntry({ isBlocking: false }),
    ];
    const metrics = computeMetrics(entries, []);
    expect(metrics.blockingEntries.length).toBe(1);
  });

  it('groups by resource type', () => {
    const entries = [
      makeEntry({ resourceType: 'script', time: 100, response: { ...makeEntry().response, content: { size: 500, mimeType: 'application/javascript' } } }),
      makeEntry({ resourceType: 'script', time: 200, response: { ...makeEntry().response, content: { size: 500, mimeType: 'application/javascript' } } }),
      makeEntry({ resourceType: 'image', time: 300, response: { ...makeEntry().response, content: { size: 1000, mimeType: 'image/png' } } }),
    ];
    const metrics = computeMetrics(entries, []);
    expect(metrics.byType.script).toBeDefined();
    expect(metrics.byType.script.count).toBe(2);
    expect(metrics.byType.script.totalSize).toBe(1000);
    expect(metrics.byType.image).toBeDefined();
    expect(metrics.byType.image.count).toBe(1);
  });

  it('computes TTFB stats', () => {
    const entries = [
      makeEntry({ ttfb: 100 }),
      makeEntry({ ttfb: 200 }),
      makeEntry({ ttfb: 300 }),
    ];
    const metrics = computeMetrics(entries, []);
    expect(metrics.ttfbStats.min).toBe(100);
    expect(metrics.ttfbStats.max).toBe(300);
    expect(metrics.ttfbStats.avg).toBe(200);
  });

  it('sorts waterfall by start time', () => {
    const entries = [
      makeEntry({ startedDateTime: '2024-01-01T00:00:03Z' }),
      makeEntry({ startedDateTime: '2024-01-01T00:00:01Z' }),
    ];
    const metrics = computeMetrics(entries, []);
    expect(metrics.waterfall[0].startedDateTime).toBe('2024-01-01T00:00:01Z');
    expect(metrics.waterfall[1].startedDateTime).toBe('2024-01-01T00:00:03Z');
  });

  it('includes page timings when provided', () => {
    const metrics = computeMetrics([makeEntry()], [], { onContentLoad: 500, onLoad: 1000 });
    expect(metrics.onContentLoad).toBe(500);
    expect(metrics.onLoad).toBe(1000);
  });

  it('includes redirect chains', () => {
    const metrics = computeMetrics([makeEntry()], [{ initialUrl: 'https://ex.com/a', finalUrl: 'https://ex.com/b', entries: [], totalTime: 100 }]);
    expect(metrics.redirectChains.length).toBe(1);
  });
});
