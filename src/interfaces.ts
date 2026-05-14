import type { HarLog, HarEntry, AnalyzedEntry, RedirectChain, MetricsResult, Bottleneck } from './types.js';

/** Parses and enriches raw HAR files */
export interface IHarParser {
  /** Read and parse a HAR file from disk */
  parse(filePath: string): HarLog;
  /** Classify and enrich raw entries with computed metadata */
  analyze(entries: HarEntry[]): AnalyzedEntry[];
  /** Detect HTTP redirect chains from analyzed entries */
  findRedirectChains(entries: AnalyzedEntry[]): RedirectChain[];
}

/** Computes aggregated metrics from analyzed entries */
export interface IMetricsComputer {
  /** Compute all timing and size metrics */
  compute(
    entries: AnalyzedEntry[],
    redirectChains: RedirectChain[],
    page?: { onContentLoad?: number; onLoad?: number }
  ): MetricsResult;
}

/** Detects a specific category of performance bottleneck */
export interface IAnalyzer {
  readonly name: string;
  /** Analyze metrics and entries, returning detected bottlenecks (empty = none) */
  analyze(metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[];
}

/** Formats analysis results for output */
export interface IReportFormatter {
  /** Render metrics and bottlenecks to a string */
  format(metrics: MetricsResult, bottlenecks: Bottleneck[]): string;
}
