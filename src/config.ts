import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface AnalyzerConfig {
  largeImageThreshold?: number;
  unminifiedJsThreshold?: number;
  slowRequestThreshold?: number;
  highTtfbThreshold?: number;
  missingCacheHeadersThreshold?: number;
  largeBundleThreshold?: number;
  noEtagThreshold?: number;
  serialRequestMinCount?: number;
  renderBlockingThreshold?: number;
  thirdPartyRequestThreshold?: number;
}

export interface HarAnalyzerConfig {
  thresholds?: AnalyzerConfig;
  llm?: {
    provider?: 'openai' | 'anthropic';
    model?: string;
    apiKey?: string;
    baseURL?: string;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
    path?: string;
  };
}

const DEFAULT_CONFIG: HarAnalyzerConfig = {
  thresholds: {
    largeImageThreshold: 500_000,
    unminifiedJsThreshold: 100_000,
    slowRequestThreshold: 2000,
    highTtfbThreshold: 1000,
    missingCacheHeadersThreshold: 5,
    largeBundleThreshold: 500_000,
    noEtagThreshold: 5,
    serialRequestMinCount: 3,
    renderBlockingThreshold: 50_000,
    thirdPartyRequestThreshold: 20,
  },
};

const configFiles = [
  'har-analyzer.config.json',
  '.har-analyzer.json',
  join(homedir(), '.config', 'har-analyzer', 'config.json'),
];

function findConfigFile(): string | undefined {
  for (const file of configFiles) {
    if (existsSync(file)) return file;
  }
  return undefined;
}

export function loadConfig(customPath?: string): HarAnalyzerConfig {
  function mergeConfig(custom: HarAnalyzerConfig): HarAnalyzerConfig {
    return {
      ...DEFAULT_CONFIG,
      ...custom,
      thresholds: { ...DEFAULT_CONFIG.thresholds, ...(custom.thresholds ?? {}) },
      llm: { ...DEFAULT_CONFIG.llm, ...(custom.llm ?? {}) },
      cache: { ...DEFAULT_CONFIG.cache, ...(custom.cache ?? {}) },
    };
  }

  if (customPath) {
    if (!existsSync(customPath)) {
      throw new Error(`Config file not found: ${customPath}`);
    }
    try {
      const raw = readFileSync(customPath, 'utf-8');
      return mergeConfig(JSON.parse(raw) as HarAnalyzerConfig);
    } catch {
      throw new Error(`Cannot parse config file: ${customPath}`);
    }
  }

  const found = findConfigFile();
  if (!found) return DEFAULT_CONFIG;

  try {
    const raw = readFileSync(found, 'utf-8');
    return mergeConfig(JSON.parse(raw) as HarAnalyzerConfig);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function getThresholds(config: HarAnalyzerConfig): Required<AnalyzerConfig> {
  const t = config.thresholds ?? {};
  const d = DEFAULT_CONFIG.thresholds!;
  return {
    largeImageThreshold: t.largeImageThreshold ?? d.largeImageThreshold!,
    unminifiedJsThreshold: t.unminifiedJsThreshold ?? d.unminifiedJsThreshold!,
    slowRequestThreshold: t.slowRequestThreshold ?? d.slowRequestThreshold!,
    highTtfbThreshold: t.highTtfbThreshold ?? d.highTtfbThreshold!,
    missingCacheHeadersThreshold: t.missingCacheHeadersThreshold ?? d.missingCacheHeadersThreshold!,
    largeBundleThreshold: t.largeBundleThreshold ?? d.largeBundleThreshold!,
    noEtagThreshold: t.noEtagThreshold ?? d.noEtagThreshold!,
    serialRequestMinCount: t.serialRequestMinCount ?? d.serialRequestMinCount!,
    renderBlockingThreshold: t.renderBlockingThreshold ?? d.renderBlockingThreshold!,
    thirdPartyRequestThreshold: t.thirdPartyRequestThreshold ?? d.thirdPartyRequestThreshold!,
  };
}
