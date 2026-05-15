import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, unlinkSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashPrompt, getCachedReport, setCachedReport } from '../src/cache.js';

describe('hashPrompt', () => {
  it('returns a consistent hash for the same input', () => {
    const h1 = hashPrompt('test prompt');
    const h2 = hashPrompt('test prompt');
    expect(h1).toBe(h2);
  });

  it('returns different hashes for different inputs', () => {
    const h1 = hashPrompt('prompt one');
    const h2 = hashPrompt('prompt two');
    expect(h1).not.toBe(h2);
  });

  it('returns a short hex string', () => {
    const hash = hashPrompt('anything');
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('cache round-trip', () => {
  const report = {
    summary: 'Page is slow',
    criticalIssues: 'Fix images',
    findings: 'Large images found',
    estimatedImprovement: '30% faster',
  };

  it('stores and retrieves cached reports', () => {
    const hash = hashPrompt('cache test prompt');
    setCachedReport(hash, report, 60_000);
    const cached = getCachedReport(hash);
    expect(cached).toEqual(report);
  });

  it('returns undefined for nonexistent hash', () => {
    const cached = getCachedReport('nonexistent');
    expect(cached).toBeUndefined();
  });

  it('returns undefined for expired cache', () => {
    const hash = hashPrompt('expired test');
    setCachedReport(hash, report, -1);
    const cached = getCachedReport(hash);
    expect(cached).toBeUndefined();
  });
});
