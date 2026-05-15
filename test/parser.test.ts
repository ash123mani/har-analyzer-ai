import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, unlinkSync } from 'node:fs';
import { parseHar, analyzeEntries, findRedirectChains, validateHarSchema } from '../src/parser.js';
import type { HarEntry } from '../src/types.js';

describe('validateHarSchema', () => {
  it('rejects non-object root', () => {
    const errors = validateHarSchema('not an object');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('root');
  });

  it('rejects missing log', () => {
    const errors = validateHarSchema({});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('log');
  });

  it('rejects log without entries', () => {
    const errors = validateHarSchema({ log: {} });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.field === 'log.entries')).toBe(true);
  });

  it('rejects entries without request', () => {
    const errors = validateHarSchema({
      log: { entries: [{ response: {}, time: 100, timings: {} }] },
    });
    expect(errors.some((e) => e.field.startsWith('entries[0].request'))).toBe(true);
  });

  it('rejects entries without response', () => {
    const errors = validateHarSchema({
      log: { entries: [{ request: { url: 'https://example.com', method: 'GET' }, time: 100, timings: {} }] },
    });
    expect(errors.some((e) => e.field.startsWith('entries[0].response'))).toBe(true);
  });

  it('rejects entries without timings', () => {
    const errors = validateHarSchema({
      log: {
        entries: [
          {
            request: { url: 'https://example.com', method: 'GET' },
            response: { status: 200 },
            time: 100,
          },
        ],
      },
    });
    expect(errors.some((e) => e.field.startsWith('entries[0].timings'))).toBe(true);
  });

  it('rejects invalid time', () => {
    const errors = validateHarSchema({
      log: {
        entries: [
          {
            request: { url: 'https://example.com', method: 'GET' },
            response: { status: 200 },
            timings: {},
          },
        ],
      },
    });
    expect(errors.some((e) => e.field.includes('time'))).toBe(true);
  });

  it('accepts valid minimal HAR', () => {
    const errors = validateHarSchema({
      log: {
        entries: [
          {
            startedDateTime: '2024-01-01T00:00:00Z',
            time: 100,
            request: { method: 'GET', url: 'https://example.com', httpVersion: 'HTTP/2', headers: [], queryString: [], cookies: [], headersSize: 0, bodySize: 0 },
            response: { status: 200, statusText: 'OK', httpVersion: 'HTTP/2', headers: [], cookies: [], content: { size: 0, mimeType: 'text/html' }, redirectURL: '', headersSize: 0, bodySize: 0 },
            cache: {},
            timings: { dns: 0, connect: 0, ssl: 0, wait: 10, receive: 20, send: 0 },
          },
        ],
      },
    });
    expect(errors).toEqual([]);
  });
});

describe('parseHar', () => {
  it('throws on nonexistent file', () => {
    expect(() => parseHar('nonexistent.har')).toThrow('File not found');
  });

  it('throws on empty file', () => {
    const emptyPath = '/tmp/test-empty.har';
    writeFileSync(emptyPath, '');
    try {
      expect(() => parseHar(emptyPath)).toThrow('Empty file');
    } finally {
      unlinkSync(emptyPath);
    }
  });

  it('parses the sample fixture', () => {
    const har = parseHar('./test/fixtures/sample.har');
    expect(har.log.version).toBe('1.2');
    expect(har.log.entries.length).toBeGreaterThan(0);
    expect(har.log.pages).toBeDefined();
    expect(har.log.pages!.length).toBe(1);
  });
});

describe('analyzeEntries', () => {
  function makeEntry(overrides: Partial<HarEntry> = {}): HarEntry {
    return {
      startedDateTime: '2024-01-01T00:00:00Z',
      time: 100,
      request: {
        method: 'GET',
        url: 'https://example.com/style.css',
        httpVersion: 'HTTP/2',
        headers: [{ name: 'Accept', value: '*/*' }],
        queryString: [],
        cookies: [],
        headersSize: 100,
        bodySize: 0,
      },
      response: {
        status: 200,
        statusText: 'OK',
        httpVersion: 'HTTP/2',
        headers: [],
        cookies: [],
        content: { size: 1000, mimeType: 'text/css' },
        redirectURL: '',
        headersSize: 100,
        bodySize: 500,
      },
      cache: {},
      timings: { dns: 5, connect: 10, ssl: 3, wait: 20, receive: 30, send: 2 },
      ...overrides,
    };
  }

  it('classifies stylesheet', () => {
    const [entry] = analyzeEntries([makeEntry()]);
    expect(entry.resourceType).toBe('stylesheet');
    expect(entry.isBlocking).toBe(true);
  });

  it('classifies document', () => {
    const [entry] = analyzeEntries([
      makeEntry({ request: { ...makeEntry().request, url: 'https://example.com/' }, response: { ...makeEntry().response, content: { size: 5000, mimeType: 'text/html' } } }),
    ]);
    expect(entry.resourceType).toBe('document');
    expect(entry.isBlocking).toBe(true);
  });

  it('classifies image', () => {
    const [entry] = analyzeEntries([
      makeEntry({ request: { ...makeEntry().request, url: 'https://example.com/photo.jpg' }, response: { ...makeEntry().response, content: { size: 50000, mimeType: 'image/jpeg' } } }),
    ]);
    expect(entry.resourceType).toBe('image');
    expect(entry.isBlocking).toBe(false);
  });

  it('classifies script', () => {
    const [entry] = analyzeEntries([
      makeEntry({ request: { ...makeEntry().request, url: 'https://example.com/app.js' }, response: { ...makeEntry().response, content: { size: 200000, mimeType: 'application/javascript' } } }),
    ]);
    expect(entry.resourceType).toBe('script');
    expect(entry.isBlocking).toBe(false);
  });

  it('computes TTFB from wait timing', () => {
    const [entry] = analyzeEntries([makeEntry()]);
    expect(entry.ttfb).toBe(20);
  });

  it('handles invalid URLs gracefully', () => {
    const [entry] = analyzeEntries([
      makeEntry({ request: { ...makeEntry().request, url: '' } }),
    ]);
    expect(entry.hostname).toBe('');
    expect(entry.isBlocking).toBe(false);
  });
});

describe('findRedirectChains', () => {
  function makeRedirectEntry(url: string, redirectURL: string, status: number): HarEntry {
    return {
      startedDateTime: '2024-01-01T00:00:00Z',
      time: 50,
      request: { method: 'GET', url, httpVersion: 'HTTP/2', headers: [], queryString: [], cookies: [], headersSize: 0, bodySize: 0 },
      response: { status, statusText: '', httpVersion: 'HTTP/2', headers: [], cookies: [], content: { size: 0, mimeType: 'text/html' }, redirectURL, headersSize: 0, bodySize: 0 },
      cache: {},
      timings: { dns: 0, connect: 0, ssl: 0, wait: 10, receive: 10, send: 0 },
    };
  }

  it('finds a redirect chain', () => {
    const entries = analyzeEntries([
      makeRedirectEntry('https://ex.com/old', 'https://ex.com/new', 301),
      makeRedirectEntry('https://ex.com/new', '', 200),
    ]);
    const chains = findRedirectChains(entries);
    expect(chains.length).toBe(1);
    expect(chains[0].initialUrl).toBe('https://ex.com/old');
    expect(chains[0].finalUrl).toBe('https://ex.com/new');
  });

  it('returns empty for no redirects', () => {
    const entries = analyzeEntries([
      makeRedirectEntry('https://ex.com/page', '', 200),
    ]);
    const chains = findRedirectChains(entries);
    expect(chains).toEqual([]);
  });

  it('returns empty for non-redirect status codes', () => {
    const entries = analyzeEntries([
      makeRedirectEntry('https://ex.com/page', 'https://ex.com/other', 200),
    ]);
    const chains = findRedirectChains(entries);
    expect(chains).toEqual([]);
  });
});
