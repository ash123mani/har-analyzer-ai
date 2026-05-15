import type { AnalyzedEntry, Bottleneck, Metrics } from './types';
import { groupByService } from './third-party';

function fmtBytes(b: number): string {
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function fmtMs(ms: number | undefined | null): string {
  if (ms == null) return '\u2014';
  if (ms < 1000) return Math.round(ms) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

export interface SerialChain {
  host: string;
  indices: number[];
}

export function findSerialChains(waterfall: AnalyzedEntry[]): SerialChain[] {
  const chains: SerialChain[] = [];
  let current: number[] = [];
  for (let i = 1; i < waterfall.length; i++) {
    const prev = waterfall[i - 1];
    const curr = waterfall[i];
    const prevEnd = new Date(prev.startedDateTime).getTime() + (prev.time || 0);
    const currStart = new Date(curr.startedDateTime).getTime();
    if (prev.hostname === curr.hostname && prevEnd > 0 && currStart >= prevEnd) {
      if (current.length === 0) current = [i - 1, i];
      else current.push(i);
    } else {
      if (current.length >= 3) chains.push({ host: waterfall[current[0]].hostname, indices: [...current] });
      current = [];
    }
  }
  if (current.length >= 3) chains.push({ host: waterfall[current[0]].hostname, indices: [...current] });
  return chains;
}

export function buildPrompt(
  metrics: Metrics,
  entries: AnalyzedEntry[],
  bottlenecks: Bottleneck[] | null,
  custom: string,
): string {
  const firstStart = entries.length > 0 ? new Date(entries[0].startedDateTime).getTime() : 0;
  const waterfall = metrics.waterfall || [];

  interface TimelineEntry extends AnalyzedEntry {
    relStart: number;
    end: number;
    index: number;
  }

  const timeline: TimelineEntry[] = waterfall.map((e, i) => {
    const start = new Date(e.startedDateTime).getTime();
    const relStart = Math.max(0, start - firstStart);
    const end = relStart + (e.time || 0);
    return { ...e, relStart, end, index: i };
  });

  const serialChains = findSerialChains(waterfall);
  let text = '';

  text += 'You are a senior web performance engineer. Analyze the HAR waterfall below and produce actionable findings.\n\n';

  text += '## Page Summary\n';
  text += `- Total requests: ${metrics.totalRequests}\n`;
  text += `- Total transfer size: ${fmtBytes(metrics.totalSize)}\n`;
  text += `- Page load time: ${fmtMs(metrics.totalTime)}\n`;
  if (metrics.onContentLoad !== undefined) text += `- DOM Content Loaded: ${fmtMs(metrics.onContentLoad)}\n`;
  if (metrics.onLoad !== undefined) text += `- On Load (all resources): ${fmtMs(metrics.onLoad)}\n`;

  text += '\n## Waterfall Timeline (dependency order)\n';
  text += 'Format: [start\u2192end] METHOD url (type, size) \u2014 host \u2014 service \u2014 flags\n';
  text += `First request = +0ms. Total = ${fmtMs(metrics.totalTime)}.\n`;
  text += 'RENDER_BLOCKING resources delay first paint \u2014 highest priority.\n\n';

  for (const e of timeline) {
    const url = e.request?.url || '';
    const method = e.request?.method || '?';
    const size = e.response?.content?.size || 0;
    const label = url.length > 80 ? url.slice(0, 77) + '\u2026' : url;
    const serviceLabel = e.service?.name || '\u2014';
    const flags = e.isBlocking ? 'RENDER_BLOCKING' : '';
    text += `${String(e.index).padStart(2)}. [+${e.relStart}ms \u2192 +${e.end}ms] ${method} ${label} (${e.resourceType}, ${fmtBytes(size)}) \u2014 ${e.hostname || '?'} \u2014 ${serviceLabel}${flags ? ' \u2014 ' + flags : ''}\n`;
  }

  if (serialChains.length > 0) {
    text += '\n### Serial Request Chains (HTTP/1.1 bottleneck \u2014 requests wait for previous to finish)\n';
    for (const chain of serialChains) {
      const names = chain.indices.map(i => {
        const e = timeline[i];
        const fname = e.request?.url?.split('/').pop() || '';
        return `#${i} (${fname || e.request.url})`;
      }).join(' \u2192 ');
      text += `- Host ${chain.host}: ${names}\n`;
      text += '  Fix: enable HTTP/2 multiplexing or parallelize resource loads\n';
    }
  }

  text += '\n## Timing Stats (Core Web Vitals indicators)\n';
  text += `- TTFB: avg ${fmtMs(metrics.ttfbStats.avg)} | max ${fmtMs(metrics.ttfbStats.max)}\n`;
  text += `- DNS: avg ${fmtMs(metrics.dnsStats.avg)} | max ${fmtMs(metrics.dnsStats.max)}\n`;
  text += `- TCP: avg ${fmtMs(metrics.connectStats.avg)} | max ${fmtMs(metrics.connectStats.max)}\n`;

  text += '\n## Resource Breakdown by Type\n';
  for (const [type, s] of Object.entries(metrics.byType)) {
    text += `- ${type}: ${s.count} req, ${fmtBytes(s.totalSize)}, total ${fmtMs(s.totalTime)}\n`;
  }

  const services = groupByService(timeline);
  if (services.length > 0) {
    text += '\n## Third-Party Services\n';
    for (const svc of services) {
      text += `- ${svc.name} [${svc.category}]: ${svc.count} requests, ${fmtMs(svc.totalTime)} total\n`;
    }
  }

  if (bottlenecks && bottlenecks.length > 0) {
    text += '\n## Rule-Based Bottlenecks\n';
    for (const b of bottlenecks) {
      text += `- [${b.severity.toUpperCase()}] ${b.title}\n  ${b.detail}\n  Fix: ${b.suggestion}\n`;
    }
  }

  text += '\n## Analysis Instructions\n';
  text += 'Produce a structured report with exactly these sections:\n\n';
  text += '**1. Executive Summary** (1-2 sentences)\n';
  text += 'The single biggest perf issue and its Core Web Vitals impact (LCP, TTFB, CLS).\n\n';
  text += '**2. Critical Issues** (what to fix first, sorted by impact)\n';
  text += 'For each include: **Finding**, **Why** (user-visible impact), **Fix** (exact code), **Impact** (estimated ms savings)\n\n';
  text += '**3. All Findings** (numbered, priority-sorted)\n\n';
  text += '**4. Estimated Improvement** (if top 3 fixes are applied)\n';

  if (custom) text += `\n## Additional Context\n${custom}\n`;

  text += '\n## Web Vitals Benchmarks\n';
  text += '- TTFB: <800ms good | 800-1800ms needs work | >1800ms poor\n';
  text += '- LCP: <2.5s good | 2.5-4s needs work | >4s poor\n';
  text += '- FID/INP: <100ms good | 100-300ms needs work | >300ms poor\n';
  text += '- CLS: <0.1 good | 0.1-0.25 needs work | >0.25 poor\n';

  return text;
}
