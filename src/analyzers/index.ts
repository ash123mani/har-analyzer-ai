import type { MetricsResult, AnalyzedEntry, Bottleneck } from '../types.js';
import type { AnalyzerFn } from '../interfaces.js';
import type { AnalyzerConfig } from '../config.js';

export {
  largeImagesAnalyzer,
  unminifiedJsAnalyzer,
  slowRequestsAnalyzer,
  highTtfbAnalyzer,
  missingCacheHeadersAnalyzer,
  redirectChainsAnalyzer,
  largeBundleAnalyzer,
  noEtagAnalyzer,
  serialRequestsAnalyzer,
  renderBlockingAnalyzer,
  thirdPartyAnalyzer,
} from './checks.js';
import {
  largeImagesAnalyzer,
  unminifiedJsAnalyzer,
  slowRequestsAnalyzer,
  highTtfbAnalyzer,
  missingCacheHeadersAnalyzer,
  redirectChainsAnalyzer,
  largeBundleAnalyzer,
  noEtagAnalyzer,
  serialRequestsAnalyzer,
  renderBlockingAnalyzer,
  thirdPartyAnalyzer,
} from './checks.js';

export function runAnalyzers(
  analyzers: AnalyzerFn[],
  metrics: MetricsResult,
  entries: AnalyzedEntry[]
): Bottleneck[] {
  return analyzers.flatMap((a) => a(metrics, entries));
}

export function createAnalyzers(cfg?: AnalyzerConfig): AnalyzerFn[] {
  return [
    largeImagesAnalyzer(cfg),
    unminifiedJsAnalyzer(cfg),
    slowRequestsAnalyzer(cfg),
    highTtfbAnalyzer(cfg),
    missingCacheHeadersAnalyzer(cfg),
    redirectChainsAnalyzer(cfg),
    largeBundleAnalyzer(cfg),
    noEtagAnalyzer(cfg),
    serialRequestsAnalyzer(cfg),
    renderBlockingAnalyzer(cfg),
    thirdPartyAnalyzer(cfg),
  ];
}
