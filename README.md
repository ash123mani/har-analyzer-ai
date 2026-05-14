# HAR Analyzer AI

Parse, analyze, and explain HAR files. Detects performance bottlenecks and generates plain-English reports with AI-powered explanations.

## Quick Start

```bash
npx tsx src/cli.ts path/to/file.har
```

Machine-readable JSON:

```bash
npx tsx src/cli.ts path/to/file.har --json
```

AI-powered analysis:

```bash
HAR_ANALYZER_API_KEY=sk-... npx tsx src/cli.ts path/to/file.har --explain
HAR_ANALYZER_API_KEY=sk-ant-... npx tsx src/cli.ts path/to/file.har --explain --provider anthropic
```

## Features

- **Metrics**: total requests, transfer size, page load time, TTFB, DNS, TCP stats
- **Bottleneck detection**:
  - Large unoptimized images (>500KB)
  - Unminified JavaScript bundles (>100KB, no `.min.`)
  - Large JS/CSS bundles (>500KB)
  - Slow requests blocking page load (>2s)
  - High TTFB (>1s)
  - Missing cache headers (Cache-Control)
  - Missing ETag or Last-Modified headers
  - HTTP redirect chains
  - Serial (non-parallel) request patterns
  - Render-blocking resources
  - Excessive third-party requests
- **Resource breakdown**: counts, size, and time by resource type
- **Waterfall analysis**: slowest requests, redirect chains, blocking resources
- **AI report**: OpenAI or Anthropic generates executive summary, prioritized fixes, and before/after estimates

## AI Configuration

| Option | Env Var | Default |
|--------|---------|---------|
| `--api-key <key>` | `HAR_ANALYZER_API_KEY` | — |
| `--provider openai` | — | `openai` |
| `--provider anthropic` | — | — |

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
                                    ├─ LargeBundleAnalyzer
                                    ├─ NoEtagAnalyzer
                                    ├─ SerialRequestsAnalyzer
                                    ├─ RenderBlockingAnalyzer
                                    └─ ThirdPartyAnalyzer
                             ↓
                    Formatter → CLI output / JSON
                             ↓
                    LLM Provider → AI report (OpenAI/Anthropic)
```

Adding a new analyzer requires zero changes to existing code:

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
  types.ts              — All type definitions (HarLog, MetricsResult, Bottleneck, etc.)
  interfaces.ts         — Abstractions (IHarParser, IMetricsComputer, IAnalyzer, IReportFormatter)
  parser.ts             — HarParser: reads and enriches HAR entries
  metrics.ts            — MetricsComputer: aggregates timing/size stats
  analyzers/
    engine.ts           — AnalyzerEngine (pluggable registry)
    checks.ts           — 11 IAnalyzer implementations
    index.ts            — Barrel
  formatters.ts         — CliFormatter + JsonFormatter
  llm/
    provider.ts         — ILLMProvider interface + types
    openai.ts           — OpenAI provider
    anthropic.ts        — Anthropic provider
    prompt.ts           — Prompt builder from metrics + bottlenecks
    parser.ts           — Shared LLM response parser
    index.ts            — Barrel
  utils/
    format.ts           — Bytes/time formatting helpers
  cli.ts                — DI wiring and CLI entry point
test/
  fixtures/
    sample.har          — Sample HAR for testing
```

## Development

```bash
npm run dev             # run with tsx
npm run typecheck       # TypeScript check
npm run build           # compile to dist/
```
