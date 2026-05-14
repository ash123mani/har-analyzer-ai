/** HAR file format as exported by browser DevTools */
export interface HarLog {
  log: {
    version: string;
    creator: { name: string; version: string };
    pages?: HarPage[];
    entries: HarEntry[];
  };
}

/** A page in the HAR (one navigation/document load) */
export interface HarPage {
  id: string;
  startedDateTime: string;
  title: string;
  pageTimings: { onContentLoad?: number; onLoad?: number; [key: string]: unknown };
}

/** A single network request/response captured by the browser */
export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache: HarCache;
  timings: HarTimings;
  serverIPAddress?: string;
  connection?: string;
}

/** Request details (method, URL, headers, etc.) */
export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: { name: string; value: string }[];
  queryString: { name: string; value: string }[];
  cookies: { name: string; value: string }[];
  postData?: { mimeType: string; text: string };
  headersSize: number;
  bodySize: number;
}

/** Response details (status, headers, content, etc.) */
export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: { name: string; value: string }[];
  cookies: { name: string; value: string }[];
  content: { size: number; mimeType: string; text?: string };
  redirectURL: string;
  headersSize: number;
  bodySize: number;
}

/** Request phase timings (DNS, TCP, TLS, wait, receive) in ms */
export interface HarTimings {
  dns: number;
  connect: number;
  ssl: number;
  wait: number;
  receive: number;
  send: number;
  [key: string]: unknown;
}

export interface HarCache {
  beforeRequest?: unknown;
  afterRequest?: unknown;
}

/** Classified type of a loaded resource */
export type ResourceType =
  | 'document' | 'stylesheet' | 'script' | 'image' | 'font'
  | 'xhr' | 'fetch' | 'media' | 'other';

/** Enriched entry with computed metadata (resource type, TTFB, blocking status) */
export interface AnalyzedEntry extends HarEntry {
  resourceType: ResourceType;
  hostname: string;
  pathname: string;
  ttfb: number;
  isBlocking: boolean;
}

/** A chain of HTTP redirects leading from one URL to another */
export interface RedirectChain {
  initialUrl: string;
  finalUrl: string;
  entries: AnalyzedEntry[];
  totalTime: number;
}

/** Aggregated metrics computed from analyzed entries */
export interface MetricsResult {
  totalRequests: number;
  totalSize: number;
  totalTime: number;
  onContentLoad?: number;
  onLoad?: number;
  slowestEntries: AnalyzedEntry[];
  blockingEntries: AnalyzedEntry[];
  redirectChains: RedirectChain[];
  ttfbStats: { min: number; max: number; avg: number };
  dnsStats: { min: number; max: number; avg: number };
  connectStats: { min: number; max: number; avg: number };
  byType: Record<string, { count: number; totalSize: number; totalTime: number }>;
  waterfall: AnalyzedEntry[];
}

/** A performance bottleneck detected by an analyzer */
export interface Bottleneck {
  severity: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  detail: string;
  suggestion: string;
}
