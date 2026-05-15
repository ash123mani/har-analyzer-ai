import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { LLMReport } from './types.js';

export interface CacheEntry {
  hash: string;
  result: LLMReport;
  createdAt: number;
  ttl: number;
}

const cacheDir = join(tmpdir(), 'har-analyzer-cache');

function ensureCacheDir(): void {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
}

function cachePath(hash: string): string {
  return join(cacheDir, `${hash}.json`);
}

export function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').slice(0, 16);
}

export function getCachedReport(hash: string): LLMReport | undefined {
  ensureCacheDir();
  const path = cachePath(hash);
  if (!existsSync(path)) return undefined;

  try {
    const raw = readFileSync(path, 'utf-8');
    const entry: CacheEntry = JSON.parse(raw);
    const elapsed = Date.now() - entry.createdAt;
    if (elapsed > entry.ttl) {
      return undefined;
    }
    return entry.result;
  } catch {
    return undefined;
  }
}

export function setCachedReport(hash: string, result: LLMReport, ttl: number = 86_400_000): void {
  ensureCacheDir();
  const entry: CacheEntry = { hash, result, createdAt: Date.now(), ttl };
  writeFileSync(cachePath(hash), JSON.stringify(entry), 'utf-8');
}
