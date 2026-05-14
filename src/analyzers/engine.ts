import type { MetricsResult, AnalyzedEntry, Bottleneck } from '../types.js';
import type { IAnalyzer } from '../interfaces.js';

/** Registry that runs all registered IAnalyzer instances */
export class AnalyzerEngine {
  private analyzers: IAnalyzer[] = [];

  /** Register a single analyzer */
  register(analyzer: IAnalyzer): void {
    this.analyzers.push(analyzer);
  }

  /** Register multiple analyzers at once */
  registerAll(analyzers: IAnalyzer[]): void {
    for (const a of analyzers) this.analyzers.push(a);
  }

  /** Run all registered analyzers and aggregate results */
  run(metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const results: Bottleneck[] = [];
    for (const analyzer of this.analyzers) {
      results.push(...analyzer.analyze(metrics, entries));
    }
    return results;
  }
}
