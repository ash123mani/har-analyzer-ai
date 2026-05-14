# HAR Analyzer AI

Parse, analyze, and explain HAR files. Detects performance bottlenecks and generates plain-English reports with AI-powered explanations.

## Quick Start

```bash
npx tsx src/cli.ts path/to/file.har
```

For machine-readable output:

```bash
npx tsx src/cli.ts path/to/file.har --json
```

## Features

- **Metrics**: total requests, transfer size, page load time, TTFB, DNS, TCP stats
- **Bottleneck detection**:
  - Large unoptimized images
  - Unminified JavaScript bundles
  - Slow requests blocking page load
  - High TTFB
  - Missing cache headers
  - HTTP redirect chains
  - Excessive third-party requests
- **Resource breakdown**: counts, size, and time by resource type (script, image, font, etc.)
- **Waterfall analysis**: slowest requests, redirect chains, blocking resources

## Architecture

```
HAR file → HarParser → AnalyzedEntry[]
                             ↓
                    MetricsComputer → MetricsResult
                             ↓
                    AnalyzerEngine ─┬─ LargeImagesAnalyzer
                                    ├─ UnminifiedJsAnalyzer
                                    ├─ SlowRequestsAnalyzer
                                    ├─ HighTtfbAnalyzer
                                    ├─ MissingCacheHeadersAnalyzer
                                    ├─ RedirectChainsAnalyzer
                                    └─ ThirdPartyAnalyzer
                             ↓
                    Formatter → CLI output / JSON
```

Pluggable analyzers implement the `IAnalyzer` interface. Add new checks without modifying existing code:

```ts
class MyAnalyzer implements IAnalyzer {
  readonly name = 'my-check';
  analyze(metrics: MetricsResult, entries: AnalyzedEntry[]): Bottleneck | Bottleneck[] | null {
    // return findings or null
  }
}

engine.register(new MyAnalyzer());
```

## Project Structure

```
src/
  types.ts         — All type definitions
  interfaces.ts    — Abstractions (IHarParser, IMetricsComputer, IAnalyzer, IReportFormatter)
  parser.ts        — HarParser: reads and enriches HAR entries
  metrics.ts       — MetricsComputer: aggregates timing/size stats
  analyzers.ts     — AnalyzerEngine + pluggable bottleneck detectors
  formatters.ts    — CliFormatter (human) + JsonFormatter (machine)
  cli.ts           — DI wiring and CLI entry point
```

## Development

```bash
npm run dev       # run with tsx
npm run typecheck # TypeScript check
npm run build     # compile to dist/
```
# har-analyzer-ai
