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

  lines.push('\n## Instructions');
  lines.push('Analyze the above HAR data and provide:');
  lines.push('');
  lines.push('1. **Executive Summary**: 2-3 sentences explaining the biggest performance issue and its impact on user experience.');
  lines.push('');
  lines.push('2. **Critical Issues**: What to fix first, why it matters, and estimated impact (e.g., "Fixing X could reduce load time by Y%").');
  lines.push('');
  lines.push('3. **All Findings**: A numbered list of every issue sorted by priority (high to low). For each include a clear explanation and concrete fix.');
  lines.push('');
  lines.push('4. **Estimated Improvement**: Rough before/after estimates if the top 3 fixes are applied. Be specific with numbers where possible.');

  return lines.join('\n');
}
