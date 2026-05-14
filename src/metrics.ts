import type { AnalyzedEntry, MetricsResult, RedirectChain } from './types.js';
import type { IMetricsComputer } from './interfaces.js';

function stats(arr: number[]) {
  if (arr.length === 0) return { min: 0, max: 0, avg: 0 };
  return {
    min: Math.min(...arr),
    max: Math.max(...arr),
    avg: arr.reduce((a, b) => a + b, 0) / arr.length,
  };
}

export class MetricsComputer implements IMetricsComputer {
  compute(
    entries: AnalyzedEntry[],
    redirectChains: RedirectChain[],
    page?: { onContentLoad?: number; onLoad?: number }
  ): MetricsResult {
    const totalRequests = entries.length;
    const totalSize = entries.reduce((s, e) => s + (e.response.content.size || 0), 0);

    const slowestEntries = [...entries].sort((a, b) => b.time - a.time).slice(0, 5);
    const blockingEntries = entries.filter((e) => e.isBlocking);

    const ttfbTimes = entries.map((e) => e.ttfb).filter((t) => t > 0);
    const dnsTimes = entries.map((e) => e.timings.dns ?? 0).filter((t) => t > 0);
    const connectTimes = entries
      .map((e) => (e.timings.connect ?? 0) - (e.timings.ssl ?? 0))
      .filter((t) => t > 0);

    const byType: Record<string, { count: number; totalSize: number; totalTime: number }> = {};
    for (const e of entries) {
      const t = e.resourceType;
      if (!byType[t]) byType[t] = { count: 0, totalSize: 0, totalTime: 0 };
      byType[t].count++;
      byType[t].totalSize += e.response.content.size || 0;
      byType[t].totalTime += e.time;
    }

    const waterfall = [...entries].sort(
      (a, b) => new Date(a.startedDateTime).getTime() - new Date(b.startedDateTime).getTime()
    );

    const totalTime =
      waterfall.length > 0
        ? new Date(waterfall[waterfall.length - 1].startedDateTime).getTime() +
          waterfall[waterfall.length - 1].time -
          new Date(waterfall[0].startedDateTime).getTime()
        : 0;

    return {
      totalRequests,
      totalSize,
      totalTime,
      onContentLoad: page?.onContentLoad,
      onLoad: page?.onLoad,
      slowestEntries,
      blockingEntries,
      redirectChains,
      ttfbStats: stats(ttfbTimes),
      dnsStats: stats(dnsTimes),
      connectStats: stats(connectTimes),
      byType,
      waterfall,
    };
  }
}
