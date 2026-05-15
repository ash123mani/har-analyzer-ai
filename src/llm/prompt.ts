import type { MetricsResult, Bottleneck } from '../types.js';
import { formatBytes, formatMs } from '../utils/format.js';

export function buildPrompt(metrics: MetricsResult, bottlenecks: Bottleneck[]): string {
  const lines: string[] = [];

  lines.push('You are a web performance expert analyzing a HAR (HTTP Archive) file.\n');
  lines.push('## Page Summary');
  lines.push(`- Total requests: ${metrics.totalRequests}`);
  lines.push(`- Total transfer size: ${formatBytes(metrics.totalSize)}`);
  lines.push(`- Page load time: ${formatMs(metrics.totalTime)}`);
  if (metrics.onContentLoad !== undefined) {
    lines.push(`- DOM Content Loaded: ${formatMs(metrics.onContentLoad)}`);
  }
  if (metrics.onLoad !== undefined) {
    lines.push(`- On Load: ${formatMs(metrics.onLoad)}`);
  }

  lines.push('\n## Timing Stats');
  lines.push(`- TTFB: avg ${formatMs(metrics.ttfbStats.avg)} | max ${formatMs(metrics.ttfbStats.max)}`);
  lines.push(`- DNS Lookup: avg ${formatMs(metrics.dnsStats.avg)} | max ${formatMs(metrics.dnsStats.max)}`);
  lines.push(`- TCP Connect: avg ${formatMs(metrics.connectStats.avg)} | max ${formatMs(metrics.connectStats.max)}`);

  lines.push('\n## Resource Breakdown');
  for (const [type, s] of Object.entries(metrics.byType)) {
    lines.push(`- ${type}: ${s.count} req, ${formatBytes(s.totalSize)}, ${formatMs(s.totalTime)}`);
  }

  lines.push('\n## Bottlenecks Detected');
  if (bottlenecks.length === 0) {
    lines.push('None detected by automated analysis.');
  } else {
    for (const b of bottlenecks) {
      lines.push(`- [${b.severity}] ${b.title}`);
      lines.push(`  Detail: ${b.detail}`);
      lines.push(`  Suggestion: ${b.suggestion}`);
    }
  }

  lines.push('\n## Report Format Instructions');
  lines.push('Generate a structured report following these rules:');
  lines.push('');
  lines.push('1. **Executive Summary** — 2-3 sentences. State the single biggest issue and its Core Web Vitals impact (LCP, TTFB, CLS).');
  lines.push('');
  lines.push('2. **Critical Issues** — For each issue (sorted by impact):');
  lines.push('   - **What**: One-line description of the problem');
  lines.push('   - **Why It Matters**: User-visible impact (e.g., "delays LCP by 1.2s on 3G")');
  lines.push('   - **How to Fix**: Exact code snippet or config change');
  lines.push('   - **Estimated Impact**: ms savings or % improvement');
  lines.push('   Include an ASCII bar chart comparing the issue contribution to total page time.');
  lines.push('');
  lines.push('3. **All Findings** — Numbered, priority-sorted. Keep each to 2-3 sentences. What / Why / How format.');
  lines.push('');
  lines.push('4. **Visual Summary** — Include where useful:');
  lines.push('   - Bar charts using Unicode blocks (█) for resource sizes/times');
  lines.push('   - Before/after comparison bars for top fixes');
  lines.push('   - Timeline using box-drawing characters (─ │ └ ├) for request waterfall');
  lines.push('   - Severity badges: [CRITICAL] [HIGH] [MEDIUM] [LOW] at start of issue lines');
  lines.push('');
  lines.push('CRITICAL: Keep every issue to 1-2 sentences under **What**. Use **Why** and **How** subsections. Be concise. Use tables for structured data.');

  return lines.join('\n');
}
