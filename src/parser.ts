import { existsSync, readFileSync, statSync } from 'node:fs';
import type { HarLog, HarEntry, AnalyzedEntry, ResourceType, RedirectChain } from './types.js';

function safeTiming(value: number | undefined): number {
  if (value === undefined || value === null) return 0;
  return value < 0 ? 0 : value;
}

function classifyResourceType(url: string, mimeType: string): ResourceType {
  if (mimeType.includes('text/html')) return 'document';
  if (mimeType.includes('text/css')) return 'stylesheet';
  if (mimeType.includes('javascript') || mimeType.includes('ecmascript')) return 'script';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('font')) return 'font';
  if (mimeType.includes('xhr') || mimeType.includes('json') || mimeType.includes('xml')) return 'xhr';

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'css') return 'stylesheet';
  if (['js', 'mjs', 'cjs'].includes(ext ?? '')) return 'script';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'svg', 'ico'].includes(ext ?? '')) return 'image';
  if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext ?? '')) return 'font';

  return 'other';
}

function isBlocking(resourceType: ResourceType): boolean {
  return resourceType === 'document' || resourceType === 'stylesheet';
}

export interface HarValidationError {
  field: string;
  message: string;
}

export function validateHarSchema(data: unknown): HarValidationError[] {
  const errors: HarValidationError[] = [];
  if (!data || typeof data !== 'object') {
    errors.push({ field: 'root', message: 'Root must be a JSON object' });
    return errors;
  }

  const root = data as Record<string, unknown>;
  if (!root.log || typeof root.log !== 'object') {
    errors.push({ field: 'log', message: 'Missing or invalid "log" property' });
    return errors;
  }

  const log = root.log as Record<string, unknown>;
  if (!Array.isArray(log.entries)) {
    errors.push({ field: 'log.entries', message: 'log.entries must be an array' });
  }

  if (log.pages !== undefined && !Array.isArray(log.pages)) {
    errors.push({ field: 'log.pages', message: 'log.pages must be an array if present' });
  }

  const entries = (log.entries ?? []) as Record<string, unknown>[];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.request || typeof e.request !== 'object') {
      errors.push({ field: `entries[${i}].request`, message: 'Missing request object' });
    }
    const req = e.request as Record<string, unknown> | undefined;
    if (req && typeof req.url !== 'string') {
      errors.push({ field: `entries[${i}].request.url`, message: 'Missing or invalid URL' });
    }
    if (typeof req?.method !== 'string') {
      errors.push({ field: `entries[${i}].request.method`, message: 'Missing or invalid HTTP method' });
    }
    if (!e.response || typeof e.response !== 'object') {
      errors.push({ field: `entries[${i}].response`, message: 'Missing response object' });
    }
    if (!e.timings || typeof e.timings !== 'object') {
      errors.push({ field: `entries[${i}].timings`, message: 'Missing timings object' });
    }
    if (typeof e.time !== 'number') {
      errors.push({ field: `entries[${i}].time`, message: 'Missing or invalid total time' });
    }
  }

  return errors;
}

export function parseHar(filePath: string): HarLog {
  let raw: string;

  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const stat = statSync(filePath);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }
  if (stat.size === 0) {
    throw new Error(`Empty file: ${filePath}`);
  }

  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'EACCES') {
      throw new Error(`Permission denied: ${filePath}`);
    }
    throw new Error(`Cannot read file: ${filePath} — ${nodeErr.message}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid HAR file: ${filePath} — not valid JSON`);
  }

  const validationErrors = validateHarSchema(data);
  if (validationErrors.length > 0) {
    const details = validationErrors.map((e) => `  - ${e.field}: ${e.message}`).join('\n');
    throw new Error(`Invalid HAR structure in ${filePath}:\n${details}`);
  }

  return data as HarLog;
}

export function analyzeEntries(entries: HarEntry[]): AnalyzedEntry[] {
  return entries.map((e) => {
    let url: URL;
    try {
      url = new URL(e.request.url);
    } catch {
      return {
        ...e,
        resourceType: 'other' as ResourceType,
        hostname: '',
        pathname: '',
        ttfb: safeTiming(e.timings.wait),
        isBlocking: false,
      };
    }

    const mimeType = e.response.content.mimeType ?? '';
    const resourceType = classifyResourceType(url.href, mimeType);

    return {
      ...e,
      resourceType,
      hostname: url.hostname,
      pathname: url.pathname,
      ttfb: safeTiming(e.timings.wait),
      isBlocking: isBlocking(resourceType),
    };
  });
}

export function findRedirectChains(entries: AnalyzedEntry[]): RedirectChain[] {
  const byUrl = new Map<string, AnalyzedEntry>();
  for (const e of entries) byUrl.set(e.request.url, e);

  const chains: RedirectChain[] = [];

  for (const e of entries) {
    if (!e.response.redirectURL) continue;
    if (e.response.status < 300 || e.response.status >= 400) continue;

    const chain: AnalyzedEntry[] = [];
    let current: AnalyzedEntry | undefined = e;
    let totalTime = 0;

    while (current && current.response.redirectURL) {
      chain.push(current);
      totalTime += current.time;
      current = byUrl.get(current.response.redirectURL);
    }

    if (current) {
      chain.push(current);
      totalTime += current.time;
    }

    if (chain.length > 1) {
      chains.push({
        initialUrl: chain[0].request.url,
        finalUrl: chain[chain.length - 1].request.url,
        entries: chain,
        totalTime,
      });
    }
  }

  return chains;
}
