# HAR Analyzer

Parse, analyze, and explain HAR files. Detects performance bottlenecks with 11 analyzers and generates AI-powered reports with code-level fixes.

## CLI

```bash
npx tsx src/cli.ts path/to/file.har
```

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON |
| `--html` | Standalone HTML report |
| `--html -o path/to/report.html` | Custom output path |
| `--explain` | AI-powered analysis |
| `--api-key <key>` | API key (or `HAR_ANALYZER_API_KEY` env) |
| `--provider openai\|anthropic` | LLM provider |
| `--no-cache` | Bypass LLM response cache |

## Web UI

```bash
npm run web
# → http://localhost:3000
```

This starts two servers concurrently:

| Process | Port | Role |
|---------|------|------|
| Next.js | `3000` | Frontend UI (React + Tailwind) |
| `server.js` | `3001` | LLM API proxy (reads `web/env.js`) |

Configure your LLM API key in `web/env.js` (copy from `web/env.example.js`):

```js
LLM_API_KEY  = 'nvapi-your-nvidia-key';
LLM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
LLM_MODEL    = 'minimaxai/minimax-m2.7';
```

### UI Features

- **Drop zone** — drag-and-drop or paste HAR JSON
- **Score ring** — animated SVG performance score (0–100) with color coding
- **Summary cards** — requests, size, load time, TTFB, DNS, DOM ready
- **Tabbed results**: Issues, Resources, Timing, AI Analysis
- **Issue cards** — expandable, severity-coded (red/amber/green) with fix suggestions
- **Resource breakdown** — type-by-type visual bars for size and time
- **Timing tab** — slowest requests table, timing averages, redirect chains
- **AI Analysis** — custom prompt, streaming-ready, rendered markdown with severity badges
- **Severity coloring** — `[HIGH]`, `[CRITICAL]` → red badge; `[MEDIUM]` → amber; `[LOW]` → green

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
    ┌──────────┐        ┌──────────────┐      ┌─────────────────────────────────┐
    │ Terminal │        │ HTML Report  │      │  Web UI (Next.js 16)            │
    │  CLI     │        │ (standalone) │      │                                 │
    └──────────┘        └──────────────┘      │  app/  (pages, layout, API)     │
                                               │  components/  (10 components)   │
                                               │  lib/  (TypeScript modules)     │
                                               │  server.js  (LLM proxy, :3001)  │
                                               └─────────────────────────────────┘
```

### Web UI Data Flow

```
Browser                    Next.js (:3000)            server.js (:3001)
  │                              │                        │
  │  drop .har                   │                        │
  │─────────────────────────────►│                        │
  │                              │                        │
  │  analysis (client-side)      │                        │
  │  analyzeEntries()            │                        │
  │  computeMetrics()            │                        │
  │  runAnalyzers()              │                        │
  │                              │                        │
  │  POST /api/chat              │                        │
  │─────────────────────────────►│  POST /api/chat        │
  │                              │───────────────────────►│  POST LLM API
  │                              │                        │──────────────►
  │                              │◄───────────────────────│◄──────────────
  │◄─────────────────────────────│                        │
  │                              │                        │
```

## Shared Modules

| File | Lines | Role |
|------|-------|------|
| `lib/types.ts` | — | All TypeScript interfaces |
| `lib/third-party.ts` | 185 | 40-entry services DB + pure identification |
| `lib/analysis-engine.ts` | 137 | Entry parsing, metrics, redirect detection |
| `lib/analyzers.ts` | 218 | 11 analyzer functions (matches CLI) |
| `lib/prompt-builder.ts` | 183 | Dependency-chain prompt construction |
| `lib/format.ts` | 22 | Formatting helpers |

## Bottleneck Detection (11 Analyzers)

| Analyzer | Severity | Threshold |
|----------|----------|-----------|
| Large Images | high | >500KB |
| Unminified JS | high | >100KB, no `.min.` |
| Slow Requests | high | >2s |
| High TTFB | high | >1s |
| Large JS/CSS Bundles | high | >500KB |
| Render-Blocking Resources | high | >50KB + blocking |
| Missing Cache Headers | medium | 5+ resources |
| Redirect Chains | medium | any |
| Missing ETag/Last-Modified | medium | 5+ resources |
| Serial Requests | medium | 3+ consecutive |
| Third-Party Traffic | low | 20+ requests to same host |

## Project Structure

```
src/
  types.ts              — Data types
  interfaces.ts         — Function type aliases
  parser.ts             — HAR parsing + entry analysis
  metrics.ts            — Metrics computation
  analyzers/
    checks.ts           — 11 analyzer factories
    index.ts            — Barrel + runAnalyzers()
  formatters/
    index.ts            — formatCli(), formatJson()
    html.ts             — Standalone HTML report
  llm/
    index.ts            — Provider dispatch
    openai.ts           — OpenAI provider
    anthropic.ts        — Anthropic provider
    prompt.ts           — CLI prompt builder
    response.ts         — LLM response parser
  utils/
    format.ts           — formatBytes(), formatMs()
  config.ts             — Config loading + merging
  cache.ts              — LLM result cache (hash + TTL)
  cli.ts                — CLI entry point
test/
  fixtures/sample.har
web/
  app/
    layout.tsx          — Root layout (Inter font, dark theme)
    page.tsx            — Main page (state management)
    globals.css         — Tailwind + component classes
    api/chat/route.ts   — API proxy to server.js
  components/
    DropZone.tsx        — Drag-and-drop + paste
    ScoreRing.tsx       — Animated SVG score ring
    SummaryCards.tsx    — 6-metric cards grid
    TabBar.tsx          — Glass pill tab navigation
    IssuesTab.tsx       — Expandable issue cards
    ResourcesTab.tsx    — Type breakdown with bars
    TimingTab.tsx       — Slowest requests + stats
    AiTab.tsx           — AI analysis with markdown
    LoadingState.tsx    — Loading spinner
    ErrorBanner.tsx     — Error display
  lib/                  — TypeScript modules (shared with CLI logic)
    types.ts
    analysis-engine.ts
    analyzers.ts
    third-party.ts
    prompt-builder.ts
    format.ts
  server.js             — LLM API proxy (port 3001)
  env.js                — API key (gitignored)
  env.example.js        — API key template
  package.json          — Next.js dependencies
  next.config.js        — Next.js configuration
  tailwind.config.ts    — Tailwind theme
  postcss.config.mjs    — PostCSS setup
  tsconfig.json         — TypeScript config
```

## Development

```bash
npm run dev             # run CLI with tsx
npm run test            # 57 tests (vitest)
npm run typecheck       # TypeScript check
npm run web             # start web UI (Next.js + proxy)
npm run web:build       # production build
```
