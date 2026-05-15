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
  lines.push('CRITICAL RULES — Follow these exactly:');
  lines.push('');
  lines.push('### Tables');
  lines.push('- Use **markdown pipe tables** (`| col1 | col2 |`) ONLY. Never use ASCII box-drawing characters (┌─┐└┘ etc.) to draw tables.');
  lines.push('- Markdown tables render with proper styling. ASCII tables look broken.');
  lines.push('');
  lines.push('### Charts & Visuals');
  lines.push('- **Bar charts**: Use inline Unicode blocks `█` (filled) and `░` (empty). No box-drawing borders around them.');
  lines.push('  Example: `████████░░░  80%`');
  lines.push('- **Timeline / Waterfall**: Put inside a fenced code block so it renders monospace. Use simple `[====>]` style bars.');
  lines.push('- **Any ASCII art with box-drawing characters** MUST be inside a markdown code block. Never in regular text.');
  lines.push('');
  lines.push('### Issue Format (Every Issue)');
  lines.push('  - **What**: One-line description of the problem');
  lines.push('  - **Why It Matters**: User-visible impact (e.g., "delays LCP by 1.2s on 3G")');
  lines.push('  - **How to Fix**: Exact code snippet or config change inside `code` or fenced code block');
  lines.push('  - **Impact**: Estimated ms or % improvement');
  lines.push('');
  lines.push('### Report Structure');
  lines.push('1. **Executive Summary** — 2-3 sentences. Biggest issue + Core Web Vitals impact. Markdown table of current vs. threshold values.');
  lines.push('');
  lines.push('2. **Critical Issues** — Sorted by impact, each with What/Why/How/Impact + inline bar chart.');
  lines.push('');
  lines.push('3. **All Findings** — Numbered, priority-sorted. 2-3 sentences each, What/Why/How format.');
  lines.push('');
  lines.push('4. **Resource Waterfall** — Inside a code block, simplified waterfall of top requests using `[====>]` bars.');
  lines.push('');
  lines.push('5. **Estimated Improvement** — Markdown table comparing before/after for top 3 fixes.');
  lines.push('   | Fix | Before | After | Savings |');
  lines.push('   |-----|--------|-------|---------|');
  lines.push('   | Optimize images | 2.1s LCP | 1.3s LCP | 38% |');
  lines.push('');
  lines.push('IMPORTANT: Prefix issue lines with [CRITICAL] [HIGH] [MEDIUM] or [LOW]. Keep descriptions tight. Use `code` for filenames and URLs. Use markdown pipe tables for ALL structured data.');

  return lines.join('\n');
}
