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

  text += '\n## Report Format Instructions\n';
  text += 'CRITICAL RULES \u2014 Follow these exactly:\n\n';
  text += '### Tables\n';
  text += '- Use **markdown pipe tables** (`| col1 | col2 |`) ONLY. Never use ASCII box-drawing characters (\u250C\u2500\u2510\u2514 etc.) to draw tables.\n';
  text += '- Markdown tables are styled with zebra stripes, hover effects, and proper spacing. ASCII tables look broken.\n';
  text += '- Example good table:\n';
  text += '  | Metric | Current | Threshold | Visual |\n';
  text += '  |--------|---------|-----------|--------|\n';
  text += '  | TTFB | 91ms | <800ms | \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u258B\u2591\u2591\u2591 91/800 |\n\n';
  text += '### Charts & Visuals\n';
  text += '- **Bar charts**: Use inline Unicode blocks `\u2588` (filled) and `\u2591` (empty). No box-drawing borders around them.\n';
  text += '  Example: `\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u258B\u2591\u2591\u2591  80%` (works in any context)\n';
  text += '- **Timeline / Waterfall**: Put inside a fenced code block (``` ``` ```) so it renders monospace. Use simple characters like `[=====>]` or dots.\n';
  text += '- **Sparklines**: `\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588` are fine inline.\n';
  text += '- **Any ASCII art with box-drawing characters** MUST be inside a markdown code block. Never in regular text.\n\n';
  text += '### Issue Format (Every Issue)\n';
  text += '  - **What**: One-line description of the problem\n';
  text += '  - **Why It Matters**: User-visible impact (e.g., "delays LCP by 1.2s on 3G")\n';
  text += '  - **How to Fix**: Exact code snippet or config change inside `code` or fenced code block\n';
  text += '  - **Impact**: Estimated ms or % improvement\n\n';
  text += '### Report Structure\n';
  text += '**1. Executive Summary** \u2014 2-3 sentences. State the single biggest issue and its Core Web Vitals impact (LCP, TTFB, CLS). Include a markdown table of current vs. threshold values.\n\n';
  text += '**2. Critical Issues** \u2014 Issues sorted by impact, each with What/Why/How/Impact + inline bar chart.\n\n';
  text += '**3. All Findings** \u2014 Numbered list, priority-sorted. 2-3 sentences each with What/Why/How.\n\n';
  text += '**4. Resource Waterfall** \u2014 Inside a code block, show a simplified waterfall timeline of the top requests using `[====>]` style bars.\n\n';
  text += '**5. Estimated Improvement** \u2014 Markdown table comparing before/after for top 3 fixes.\n';
  text += '    | Fix | Before | After | Savings |\n';
  text += '    |-----|--------|-------|---------|\n';
  text += '    | Optimize images | 2.1s LCP | 1.3s LCP | 38% |\n\n';
  text += 'IMPORTANT: Prefix issue lines with [CRITICAL] [HIGH] [MEDIUM] or [LOW]. Keep descriptions tight. Use `code` for filenames, URLs, and commands. Use markdown pipe tables for ALL structured data.\n\n';
  text += '\n## Reference Benchmarks\n';
  text += '- TTFB: <800ms good | 800-1800ms needs work | >1800ms poor\n';
  text += '- LCP: <2.5s good | 2.5-4s needs work | >4s poor\n';
  text += '- FID/INP: <100ms good | 100-300ms needs work | >300ms poor\n';
  text += '- CLS: <0.1 good | 0.1-0.25 needs work | >0.25 poor\n';

  return text;
}
