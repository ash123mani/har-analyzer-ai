import type { MetricsResult, Bottleneck } from './types.js';
import type { IReportFormatter } from './interfaces.js';
import { formatBytes, formatMs, padEnd, padStart } from './utils/format.js';

/** Human-readable colored terminal output */
export class CliFormatter implements IReportFormatter {
  format(metrics: MetricsResult, bottlenecks: Bottleneck[]): string {
    const lines: string[] = [];

    lines.push('\n=== HAR Analysis Report ===\n');
    lines.push(`Requests:          ${metrics.totalRequests}`);
    lines.push(`Total Size:        ${formatBytes(metrics.totalSize)}`);
    lines.push(`Total Time:        ${formatMs(metrics.totalTime)}`);
    if (metrics.onContentLoad !== undefined) {
      lines.push(`DOM Content Loaded: ${formatMs(metrics.onContentLoad)}`);
    }
    if (metrics.onLoad !== undefined) {
      lines.push(`On Load:           ${formatMs(metrics.onLoad)}`);
    }

    lines.push('\n--- Timing Stats ---');
    lines.push(
      `TTFB:              avg ${formatMs(metrics.ttfbStats.avg)} | max ${formatMs(metrics.ttfbStats.max)}`
    );
    lines.push(
      `DNS Lookup:        avg ${formatMs(metrics.dnsStats.avg)} | max ${formatMs(metrics.dnsStats.max)}`
    );
    lines.push(
      `TCP Connect:       avg ${formatMs(metrics.connectStats.avg)} | max ${formatMs(metrics.connectStats.max)}`
    );

    lines.push('\n--- By Resource Type ---');
    for (const [type, s] of Object.entries(metrics.byType)) {
      lines.push(
        `  ${padEnd(type, 12)} ${padStart(String(s.count), 4)} req | ${padStart(formatBytes(s.totalSize), 9)} | ${padStart(formatMs(s.totalTime), 10)}`
      );
    }

    if (bottlenecks.length) {
      lines.push('\n--- Bottlenecks ---');
      for (const b of bottlenecks) {
        const icon = b.severity === 'high' ? '!' : b.severity === 'medium' ? '-' : 'i';
        lines.push(`  [${icon}] ${b.title}`);
        lines.push(`       ${b.detail}`);
        lines.push(`       Fix: ${b.suggestion}`);
      }
    } else {
      lines.push('\nNo bottlenecks detected. Nice!');
    }

    lines.push('\n--- Slowest Requests ---');
    for (const e of metrics.slowestEntries) {
      lines.push(`  ${padStart(formatMs(e.time), 10)} | ${padEnd(e.request.method, 6)} | ${e.request.url}`);
    }

    if (metrics.redirectChains.length) {
      lines.push('\n--- Redirect Chains ---');
      for (const chain of metrics.redirectChains) {
        lines.push(`  ${formatMs(chain.totalTime)} | ${chain.initialUrl} -> ${chain.finalUrl}`);
      }
    }

    lines.push('');
    return lines.join('\n');
  }
}

/** JSON output for machine consumption */
export class JsonFormatter implements IReportFormatter {
  format(metrics: MetricsResult, bottlenecks: Bottleneck[]): string {
    return JSON.stringify({ metrics, bottlenecks }, null, 2);
  }
}
