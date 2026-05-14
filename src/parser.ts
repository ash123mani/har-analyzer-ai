import { readFileSync } from 'node:fs';
import type { HarLog, HarEntry, AnalyzedEntry, ResourceType, RedirectChain } from './types.js';
import type { IHarParser } from './interfaces.js';

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

export class HarParser implements IHarParser {
  parse(filePath: string): HarLog {
    let raw: string;
    try {
      raw = readFileSync(filePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw new Error(`Cannot read file: ${filePath} — ${(err as Error).message}`);
    }

    try {
      return JSON.parse(raw) as HarLog;
    } catch {
      throw new Error(`Invalid HAR file: ${filePath} — not valid JSON`);
    }
  }

  analyze(entries: HarEntry[]): AnalyzedEntry[] {
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

  findRedirectChains(entries: AnalyzedEntry[]): RedirectChain[] {
    const byUrl = new Map<string, AnalyzedEntry>();
    for (const e of entries) byUrl.set(e.request.url, e);

    const chains: RedirectChain[] = [];
    const visited = new Set<string>();

    for (const e of entries) {
      if (visited.has(e.request.url)) continue;
      if (!e.response.redirectURL) continue;
      if (e.response.status < 300 || e.response.status >= 400) continue;

      const chain: AnalyzedEntry[] = [];
      let current: AnalyzedEntry | undefined = e;
      let totalTime = 0;

      while (current && current.response.redirectURL) {
        chain.push(current);
        visited.add(current.request.url);
        totalTime += current.time;
        current = byUrl.get(current.response.redirectURL);
      }

      if (current && !visited.has(current.request.url)) {
        chain.push(current);
        visited.add(current.request.url);
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
}
