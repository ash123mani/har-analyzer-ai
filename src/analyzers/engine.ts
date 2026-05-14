import type { MetricsResult, AnalyzedEntry, Bottleneck } from '../types.js';
import type { IAnalyzer } from '../interfaces.js';

export class AnalyzerEngine {
  private analyzers: IAnalyzer[] = [];

  register(analyzer: IAnalyzer): void {
    this.analyzers.push(analyzer);
  }

  registerAll(analyzers: IAnalyzer[]): void {
    for (const a of analyzers) this.analyzers.push(a);
  }

  run(metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck[] {
    const results: Bottleneck[] = [];
    for (const analyzer of this.analyzers) {
      const result = analyzer.analyze(metrics, entries);
      if (result === null) continue;
      if (Array.isArray(result)) results.push(...result);
      else results.push(result);
    }
    return results;
  }
}
