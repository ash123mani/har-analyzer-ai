import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { loadConfig, getThresholds } from '../src/config.js';

describe('loadConfig', () => {
  const testConfigPath = '/tmp/har-analyzer-test-config.json';

  afterEach(() => {
    try { unlinkSync(testConfigPath); } catch {}
  });

  it('returns defaults when no config file exists', () => {
    const config = loadConfig();
    expect(config.thresholds?.largeImageThreshold).toBe(500_000);
    expect(config.thresholds?.slowRequestThreshold).toBe(2000);
  });

  it('loads custom config file', () => {
    writeFileSync(testConfigPath, JSON.stringify({
      thresholds: { largeImageThreshold: 999_999 },
    }), 'utf-8');
    const config = loadConfig(testConfigPath);
    expect(config.thresholds?.largeImageThreshold).toBe(999_999);
    expect(config.thresholds?.slowRequestThreshold).toBe(2000);
  });

  it('throws on nonexistent custom path', () => {
    expect(() => loadConfig('/nonexistent/path.json')).toThrow('not found');
  });
});

describe('getThresholds', () => {
  it('returns all thresholds with defaults', () => {
    const t = getThresholds({});
    expect(t.largeImageThreshold).toBe(500_000);
    expect(t.slowRequestThreshold).toBe(2000);
    expect(t.thirdPartyRequestThreshold).toBe(20);
  });

  it('merges custom thresholds with defaults', () => {
    const t = getThresholds({
      thresholds: { largeImageThreshold: 100_000 },
    });
    expect(t.largeImageThreshold).toBe(100_000);
    expect(t.slowRequestThreshold).toBe(2000);
  });
});
