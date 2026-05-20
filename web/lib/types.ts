export interface HarEntry {
  request: {
    url: string;
    method: string;
    headers: { name: string; value: string }[];
  };
  response: {
    content: { size: number; mimeType: string };
    headers: { name: string; value: string }[];
    redirectURL?: string;
    status?: number;
  };
  timings: {
    wait?: number;
    dns?: number;
    connect?: number;
    ssl?: number;
  };
  time: number;
  startedDateTime: string;
}

export interface AnalyzedEntry extends HarEntry {
  resourceType: string;
  hostname: string;
  pathname: string;
  ttfb: number;
  isBlocking: boolean;
  service: { name: string; category: string } | null;
}

export interface Stats {
  min: number;
  max: number;
  avg: number;
}

export interface RedirectChain {
  initialUrl: string;
  finalUrl: string;
  entries: AnalyzedEntry[];
  totalTime: number;
}

export interface ServiceInfo {
  name: string;
  category: string;
  count: number;
  totalTime: number;
  hosts: string[];
}

export interface ResourceBreakdown {
  count: number;
  totalSize: number;
  totalTime: number;
}

export interface Metrics {
  totalRequests: number;
  totalSize: number;
  totalTime: number;
  onContentLoad?: number;
  onLoad?: number;
  slowestEntries: AnalyzedEntry[];
  blockingEntries: AnalyzedEntry[];
  redirectChains: RedirectChain[];
  ttfbStats: Stats;
  dnsStats: Stats;
  connectStats: Stats;
  byType: Record<string, ResourceBreakdown>;
  waterfall: AnalyzedEntry[];
}

export interface Bottleneck {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
  suggestion: string;
}

export interface SecurityFinding {
  severity: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  detail: string;
  suggestion: string;
}

export interface CategoryScore {
  label: string;
  score: number;
  icon: string;
  detail: string;
}

export interface RequestFlag {
  type: 'cors' | 'content-type' | 'status' | 'timing';
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface HarFile {
  log: {
    entries: HarEntry[];
    pages?: { pageTimings?: { onContentLoad?: number; onLoad?: number } }[];
  };
}
