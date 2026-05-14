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
  ThirdPartyAnalyzer,
} from './analyzers/index.js';
import { CliFormatter, JsonFormatter } from './formatters.js';
import type { IHarParser, IMetricsComputer, IReportFormatter } from './interfaces.js';

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
    new ThirdPartyAnalyzer(),
  ]);

  const formatters = new Map<string, IReportFormatter>([
    ['cli', new CliFormatter()],
    ['json', new JsonFormatter()],
  ]);

  return { parser, metricsComputer, analyzerEngine, formatters };
}

const program = new Command();

program
  .name('har-analyze')
  .description('Analyze HAR files and detect performance bottlenecks')
  .argument('<file>', 'path to .har file')
  .option('--json', 'output raw JSON instead of formatted report')
  .action((file: string, options: { json?: boolean }) => {
    const { parser, metricsComputer, analyzerEngine, formatters } = buildApp();

    const harLog = parser.parse(file);
    const entries = parser.analyze(harLog.log.entries);
    const redirectChains = parser.findRedirectChains(entries);
    const page = harLog.log.pages?.[0];
    const metrics = metricsComputer.compute(entries, redirectChains, page?.pageTimings);
    const bottlenecks = analyzerEngine.run(metrics, entries);

    const formatName = options.json ? 'json' : 'cli';
    const formatter = formatters.get(formatName) ?? formatters.get('cli')!;
    console.log(formatter.format(metrics, bottlenecks));
  });

program.parse();
