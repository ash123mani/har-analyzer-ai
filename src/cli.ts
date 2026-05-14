import { Command } from 'commander';
import { HarParser } from './parser.js';
import { MetricsComputer } from './metrics.js';
import {
  AnalyzerEngine,
  LargeImagesAnalyzer,
  UnminifiedJsAnalyzer,
  SlowRequestsAnalyzer,
  HighTtfbAnalyzer,
  MissingCacheHeadersAnalyzer,
  RedirectChainsAnalyzer,
  LargeBundleAnalyzer,
  NoEtagAnalyzer,
  SerialRequestsAnalyzer,
  RenderBlockingAnalyzer,
  ThirdPartyAnalyzer,
} from './analyzers/index.js';
import { CliFormatter, JsonFormatter } from './formatters.js';
import { buildPrompt, OpenAIProvider, AnthropicProvider } from './llm/index.js';
import type { IHarParser, IMetricsComputer, IReportFormatter } from './interfaces.js';
import type { ILLMProvider, LLMReport } from './llm/index.js';
import type { Bottleneck } from './types.js';
import type { MetricsResult } from './types.js';

const providerRegistry = new Map<string, new () => ILLMProvider>([
  ['openai', OpenAIProvider],
  ['anthropic', AnthropicProvider],
]);

function buildApp() {
  const parser: IHarParser = new HarParser();
  const metricsComputer: IMetricsComputer = new MetricsComputer();

  const analyzerEngine = new AnalyzerEngine();
  analyzerEngine.registerAll([
    new LargeImagesAnalyzer(),
    new UnminifiedJsAnalyzer(),
    new SlowRequestsAnalyzer(),
    new HighTtfbAnalyzer(),
    new MissingCacheHeadersAnalyzer(),
    new RedirectChainsAnalyzer(),
    new LargeBundleAnalyzer(),
    new NoEtagAnalyzer(),
    new SerialRequestsAnalyzer(),
    new RenderBlockingAnalyzer(),
    new ThirdPartyAnalyzer(),
  ]);

  const formatters = new Map<string, IReportFormatter>([
    ['cli', new CliFormatter()],
    ['json', new JsonFormatter()],
  ]);

  return { parser, metricsComputer, analyzerEngine, formatters };
}

async function runExplain(
  metrics: MetricsResult,
  bottlenecks: Bottleneck[],
  providerName: string,
  apiKey: string
): Promise<LLMReport> {
  const Provider = providerRegistry.get(providerName);
  if (!Provider) {
    const available = [...providerRegistry.keys()].join(', ');
    throw new Error(`Unknown provider '${providerName}'. Available: ${available}`);
  }

  const llm = new Provider();
  const prompt = buildPrompt(metrics, bottlenecks);
  return llm.generateReport(prompt, { apiKey });
}

const program = new Command();

program
  .name('har-analyze')
  .description('Analyze HAR files and detect performance bottlenecks')
  .argument('<file>', 'path to .har file')
  .option('--json', 'output raw JSON instead of formatted report')
  .option('--explain', 'generate AI-powered explanation of bottlenecks')
  .option('--provider <name>', 'LLM provider (openai or anthropic)', 'openai')
  .option('--api-key <key>', 'API key for LLM provider (or set HAR_ANALYZER_API_KEY env var)')
  .action(async (file: string, options: { json?: boolean; explain?: boolean; provider?: string; apiKey?: string }) => {
    try {
      const { parser, metricsComputer, analyzerEngine, formatters } = buildApp();

      const harLog = parser.parse(file);
      const entries = parser.analyze(harLog.log.entries);
      const redirectChains = parser.findRedirectChains(entries);
      const page = harLog.log.pages?.[0];
      const metrics = metricsComputer.compute(entries, redirectChains, page?.pageTimings);
      const bottlenecks = analyzerEngine.run(metrics, entries);

      const formatName = options.json ? 'json' : 'cli';
      const formatter = formatters.get(formatName) ?? new CliFormatter();
      console.log(formatter.format(metrics, bottlenecks));

      if (options.explain) {
        const apiKey = options.apiKey || process.env.HAR_ANALYZER_API_KEY;
        if (!apiKey) {
          console.error('\nError: API key required. Set HAR_ANALYZER_API_KEY env var or pass --api-key.');
          process.exit(1);
        }

        console.log('\n=== AI Analysis ===\n');
        const report = await runExplain(metrics, bottlenecks, options.provider ?? 'openai', apiKey);
        console.log('1. Executive Summary');
        console.log(report.summary);
        console.log('\n2. Critical Issues');
        console.log(report.criticalIssues);
        console.log('\n3. All Findings');
        console.log(report.findings);
        console.log('\n4. Estimated Improvement');
        console.log(report.estimatedImprovement);
      }
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program.parse();
