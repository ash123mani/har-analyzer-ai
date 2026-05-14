import type { HarLog, HarEntry, AnalyzedEntry, RedirectChain, MetricsResult, Bottleneck } from './types.js';

export interface IHarParser {
  parse(filePath: string): HarLog;
  analyze(entries: HarEntry[]): AnalyzedEntry[];
  findRedirectChains(entries: AnalyzedEntry[]): RedirectChain[];
}

export interface IMetricsComputer {
  compute(
    entries: AnalyzedEntry[],
    redirectChains: RedirectChain[],
    page?: { onContentLoad?: number; onLoad?: number }
  ): MetricsResult;
}

export interface IAnalyzer {
  readonly name: string;
  analyze(metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck | Bottleneck[] | null;
}

export interface IReportFormatter {
  format(metrics: MetricsResult, bottlenecks: Bottleneck[]): string;
}
