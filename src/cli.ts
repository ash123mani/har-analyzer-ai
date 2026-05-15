import { writeFileSync } from 'node:fs';
import { Command } from 'commander';
import ora from 'ora';
import { parseHar, analyzeEntries, findRedirectChains } from './parser.js';
import { computeMetrics } from './metrics.js';
import { createAnalyzers, runAnalyzers } from './analyzers/index.js';
import { formatCli, formatJson, formatHtml } from './formatters/index.js';
import { buildPrompt, openaiProvider, anthropicProvider } from './llm/index.js';
import { loadConfig, getThresholds } from './config.js';
import { hashPrompt, getCachedReport, setCachedReport } from './cache.js';
import type { LLMProvider } from './interfaces.js';
import type { Bottleneck, MetricsResult, LLMConfig } from './types.js';

const providerRegistry: Record<string, LLMProvider> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
};

async function runExplain(
  metrics: MetricsResult,
  bottlenecks: Bottleneck[],
  providerName: string,
  apiKey: string,
  cacheEnabled: boolean,
  opts?: { model?: string; baseURL?: string }
): Promise<string> {
  const provider = providerRegistry[providerName];
  if (!provider) {
    const available = Object.keys(providerRegistry).join(', ');
    throw new Error(`Unknown provider '${providerName}'. Available: ${available}`);
  }

  const prompt = buildPrompt(metrics, bottlenecks);

  if (cacheEnabled) {
    const hash = hashPrompt(prompt);
    const cached = getCachedReport(hash);
    if (cached) {
      return [
        '1. Executive Summary',
        cached.summary,
        '',
        '2. Critical Issues',
        cached.criticalIssues,
        '',
        '3. All Findings',
        cached.findings,
        '',
        '4. Estimated Improvement',
        cached.estimatedImprovement,
      ].join('\n');
    }
  }

  const llmConfig: LLMConfig = { apiKey, model: opts?.model, baseURL: opts?.baseURL };
  const spinner = ora('Generating AI analysis...').start();
  try {
    const report = await provider(prompt, llmConfig);
    spinner.succeed('AI analysis complete');

    if (cacheEnabled) {
      const hash = hashPrompt(prompt);
      setCachedReport(hash, report);
    }

    return [
      '1. Executive Summary',
      report.summary,
      '',
      '2. Critical Issues',
      report.criticalIssues,
      '',
      '3. All Findings',
      report.findings,
      '',
      '4. Estimated Improvement',
      report.estimatedImprovement,
    ].join('\n');
  } catch (err) {
    spinner.fail('AI analysis failed');
    throw err;
  }
}

const program = new Command();

program
  .name('har-analyze')
  .description('Analyze HAR files and detect performance bottlenecks')
  .argument('<file>', 'path to .har file')
  .option('--json', 'output raw JSON to stdout')
  .option('--html', 'generate HTML report file')
  .option('-o, --output <path>', 'output file path (default: report.html for --html)')
  .option('--explain', 'generate AI-powered explanation of bottlenecks')
  .option('--provider <name>', 'LLM provider (openai or anthropic)', 'openai')
  .option('--api-key <key>', 'API key for LLM provider (or set HAR_ANALYZER_API_KEY env var)')
  .option('--config <path>', 'path to config file')
  .option('--no-cache', 'disable LLM result caching')
  .action(async (file: string, options: {
    json?: boolean; html?: boolean; output?: string;
    explain?: boolean; provider?: string; apiKey?: string;
    config?: string; cache?: boolean;
  }) => {
    try {
      const config = loadConfig(options.config);
      const thresholds = getThresholds(config);

      const parseSpinner = ora('Parsing HAR file...').start();
      const harLog = parseHar(file);
      parseSpinner.succeed('HAR file parsed');

      const analyzeSpinner = ora('Analyzing entries...').start();
      const entries = analyzeEntries(harLog.log.entries);
      const redirectChains = findRedirectChains(entries);
      const page = harLog.log.pages?.[0];
      const metrics = computeMetrics(entries, redirectChains, page?.pageTimings);
      const analyzers = createAnalyzers(thresholds);
      const bottlenecks = runAnalyzers(analyzers, metrics, entries);
      analyzeSpinner.succeed('Analysis complete');

      const cacheEnabled = options.cache !== false && (config.cache?.enabled ?? true);

      if (options.html) {
        const htmlSpinner = ora('Generating HTML report...').start();
        const html = formatHtml(metrics, bottlenecks);
        const outPath = options.output || 'report.html';
        writeFileSync(outPath, html, 'utf-8');
        htmlSpinner.succeed(`Report written to ${outPath}`);
        return;
      }

      console.log(options.json ? formatJson(metrics, bottlenecks) : formatCli(metrics, bottlenecks));

      if (options.explain) {
        const apiKey = options.apiKey || config.llm?.apiKey || process.env.HAR_ANALYZER_API_KEY;
        if (!apiKey) {
          console.error('\nError: API key required. Set HAR_ANALYZER_API_KEY env var, --api-key, or config file.');
          process.exit(1);
        }
        const report = await runExplain(metrics, bottlenecks, options.provider ?? config.llm?.provider ?? 'openai', apiKey, cacheEnabled, config.llm);
        console.log('\n=== AI Analysis ===\n');
        console.log(report);
      }
    } catch (err) {
      console.error(`\nError: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

program.parse();
