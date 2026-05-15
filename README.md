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

HTML report:

```bash
npx tsx src/cli.ts path/to/file.har --html
npx tsx src/cli.ts path/to/file.har --html -o /path/to/report.html
```

AI-powered analysis:

```bash
HAR_ANALYZER_API_KEY=sk-... npx tsx src/cli.ts path/to/file.har --explain
HAR_ANALYZER_API_KEY=sk-ant-... npx tsx src/cli.ts path/to/file.har --explain --provider anthropic
```

## Interactive Web Tool

Run locally with:

```bash
npm run web
# → http://localhost:3000
```

Drop a `.har` file — analysis runs automatically and the LLM produces a structured report with dependency-chain insights, third-party attribution, and code-level fixes.

The web UI is an ES module app with no build step:

| File | Responsibility | Principles |
|---|---|---|
| `index.html` | HTML + CSS only | Single responsibility |
| `main.js` | UI orchestration, event handlers, analyzers | Composition, side-effects isolated |
| `third-party.js` | Services DB + pure identification functions | Pure data + pure functions, open for extension |
| `prompt-builder.js` | Dependency-chain prompt construction | Pure function, single responsibility |

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
  - Excessive third-party requests (>20 to same host)
- **Resource breakdown**: counts, size, and time by resource type
- **Waterfall analysis**: slowest requests, redirect chains, blocking resources
- **Output formats**: CLI terminal, JSON, standalone HTML report
- **Interactive web tool**: browser-based drag-and-drop HAR analyzer
- **AI report**: OpenAI or Anthropic generates executive summary, prioritized fixes, and before/after estimates

## AI Configuration

| Option | Env Var | Default |
|--------|---------|---------|
| `--explain` | — | — |
| `--api-key <key>` | `HAR_ANALYZER_API_KEY` | — |
| `--provider openai` | — | `openai` |
| `--provider anthropic` | — | — |

## Architecture

```
                    ┌─ CLI ─────────────────────────────┐
                    │  npx tsx src/cli.ts file.har      │
                    │  --json → formatJson()            │
                    │  --html → formatHtml() → file     │
                    │  --explain → LLM provider         │
                    └───────────┬────────────────────────┘
                                │
                    ┌───────────▼────────────────────────┐
                    │  parseHar() → analyzeEntries()     │
                    │  → findRedirectChains()            │
                    │  → computeMetrics()                │
                    │  → runAnalyzers()                  │
                    └───────────┬────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   ┌──────────┐        ┌──────────────┐      ┌────────────────────────────┐
   │ Terminal │        │ HTML Report  │      │  Web Tool (ESM modules)   │
   │  CLI     │        │  (standalone)│      │                            │
   └──────────┘        └──────────────┘      │  index.html                │
                                              │  modules/                  │
                                              │    main.js (orchestrator)  │
                                              │    analyzers.js            │
                                              │    analysis-engine.js      │
                                              │    format.js               │
                                              │    third-party.js          │
                                              │    prompt-builder.js       │
                                              └────────────────────────────┘
```

The web tool uses three ES modules with no build step:

- **`modules/third-party.js`** — 40-entry services database (Google Analytics, Stripe, Hotjar, etc.) + pure `identifyService()` / `tagEntries()` functions. Adding a service = adding one row to the array (Open/Closed principle).
- **`modules/prompt-builder.js`** — pure `buildPrompt()` that assembles a structured prompt including the waterfall timeline as a dependency chain, serial request analysis, and third-party attribution.
- **`modules/analyzers.js`** — 9 named analyzer functions (`largeImagesAnalyzer`, `unminifiedJsAnalyzer`, etc.) + `runAnalyzers()` that composes them. Each is independently testable.
- **`modules/analysis-engine.js`** — pure entry parsing, redirect chain detection, and metrics computation.
- **`modules/format.js`** — pure formatting helpers: `fmtBytes`, `fmtMs`, `bar`, `truncate`.
- **`modules/main.js`** — thin orchestrator that imports the modules above, wires events, manages state, and renders the DOM. Side-effects isolated here.
```

Adding a new analyzer requires zero changes to existing code:

```ts
import type { AnalyzerFn } from './interfaces.js';

export const myAnalyzer: AnalyzerFn = (metrics, entries) => {
  // return Bottleneck[] or []
};
```

Then register in `cli.ts`:

```ts
const analyzers = [ ..., myAnalyzer ];
```

## Project Structure

```
src/
  types.ts              — Data types (HarLog, MetricsResult, Bottleneck, LLMConfig, etc.)
  interfaces.ts         — Function type aliases (AnalyzerFn, Formatter, LLMProvider, etc.)
  parser.ts             — parseHar(), analyzeEntries(), findRedirectChains()
  metrics.ts            — computeMetrics()
  analyzers/
    checks.ts           — 11 analyzer functions
    index.ts            — Barrel + runAnalyzers() + createAnalyzers()
  formatters/
    index.ts            — formatCli(), formatJson()
    html.ts             — formatHtml() — standalone HTML report
  llm/
    index.ts            — Barrel + provider dispatch
    openai.ts           — openaiProvider
    anthropic.ts        — anthropicProvider
    prompt.ts           — buildPrompt() for CLI
    response.ts         — parseReport() — extract sections from LLM response
  utils/
    format.ts           — formatBytes(), formatMs(), padStart/End
  config.ts             — config loading + merging
  cache.ts              — LLM result caching (hash-based, TTL)
  cli.ts                — CLI entry point
test/
  fixtures/
    sample.har
web/
  index.html            — Interactive HAR analyzer (HTML + CSS only)
  env.js                — API key (gitignored)
  env.example.js        — Template for API key
  server.js             — Static server + /api/chat proxy
  modules/
    main.js             — Orchestrator (events, state, rendering)
    third-party.js      — Services database + pure identification functions
    prompt-builder.js   — Dependency-chain prompt builder (pure)
    analyzers.js        — 9 named analyzer functions + runAnalyzers
    analysis-engine.js  — Entry parsing, metrics computation, redirect detection
    format.js           — Pure formatting helpers (fmtBytes, fmtMs, bar, truncate)
```

## Development

```bash
npm run dev             # run with tsx
npm run typecheck       # TypeScript check
npm run build           # compile to dist/
```
