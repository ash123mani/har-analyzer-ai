import type {
  HarLog, HarEntry, AnalyzedEntry, RedirectChain,
  MetricsResult, Bottleneck, LLMConfig, LLMReport,
} from './types.js';

export type HarParser = (filePath: string) => HarLog;
export type EntryAnalyzer = (entries: HarEntry[]) => AnalyzedEntry[];
export type RedirectFinder = (entries: AnalyzedEntry[]) => RedirectChain[];
export type MetricsComputer = (
  entries: AnalyzedEntry[],
  redirectChains: RedirectChain[],
  page?: { onContentLoad?: number; onLoad?: number }
) => MetricsResult;
export type AnalyzerFn = (metrics: MetricsResult, entries: AnalyzedEntry[]) => Bottleneck[];
export type Formatter = (metrics: MetricsResult, bottlenecks: Bottleneck[]) => string;
export type LLMProvider = (prompt: string, config: LLMConfig) => Promise<LLMReport>;
