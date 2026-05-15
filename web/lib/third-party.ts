import type { AnalyzedEntry, ServiceInfo } from './types';

interface ServiceDef {
  name: string;
  domains: string[];
  category: string;
}

const SERVICES: ServiceDef[] = [
  { name: 'Google Analytics', domains: [
    'www.google-analytics.com', 'ssl.google-analytics.com',
    'analytics.google.com', 'google-analytics.com',
  ], category: 'analytics' },
  { name: 'Google Tag Manager', domains: [
    'www.googletagmanager.com', 'googletagmanager.com',
  ], category: 'analytics' },
  { name: 'Facebook Pixel', domains: [
    'connect.facebook.net', 'www.facebook.com',
  ], category: 'analytics' },
  { name: 'Segment', domains: [
    'cdn.segment.com', 'api.segment.io', 'segments.com',
  ], category: 'analytics' },
  { name: 'Amplitude', domains: [
    'api.amplitude.com', 'cdn.amplitude.com', 'amplitude.com',
  ], category: 'analytics' },
  { name: 'Mixpanel', domains: [
    'api.mixpanel.com', 'cdn.mxpnl.com', 'mixpanel.com',
  ], category: 'analytics' },
  { name: 'Hotjar', domains: [
    'static.hotjar.com', 'script.hotjar.com',
    'vars.hotjar.com', 'hotjar.com',
  ], category: 'analytics' },
  { name: 'Heap', domains: [
    'heapanalytics.com', 'cdn.heapanalytics.com',
  ], category: 'analytics' },
  { name: 'FullStory', domains: [
    'fullstory.com', 'rs.fullstory.com', 'edge.fullstory.com',
  ], category: 'analytics' },
  { name: 'Matomo', domains: [
    'piwik.org', 'analytics.matomo.org', 'matomo.org',
  ], category: 'analytics' },
  { name: 'Microsoft Clarity', domains: [
    'clarity.ms', 'www.clarity.ms',
  ], category: 'analytics' },
  { name: 'HubSpot', domains: [
    'js.hs-scripts.com', 'js.hs-analytics.net',
    'hsforms.com', 'hubspot.com',
  ], category: 'marketing' },
  { name: 'Marketo', domains: [
    'munchkin.marketo.net', 'marketo.com',
  ], category: 'marketing' },
  { name: 'Intercom', domains: [
    'api-iam.intercom.io', 'widget.intercom.io',
    'js.intercomcdn.com', 'intercom.io',
  ], category: 'marketing' },
  { name: 'Drift', domains: [
    'js.driftt.com', 'api.drift.com', 'drift.com',
  ], category: 'marketing' },
  { name: 'Salesforce', domains: [
    'sfdc-stats.salesforce.com', 'salesforce.com',
  ], category: 'marketing' },
  { name: 'Mailchimp', domains: [
    'chimpstatic.com', 'mailchimp.com',
  ], category: 'marketing' },
  { name: 'Qualtrics', domains: [
    'qualtrics.com', 'siteintercept.qualtrics.com',
  ], category: 'marketing' },
  { name: 'Cloudflare', domains: [
    'cloudflare.com', 'cdnjs.cloudflare.com',
  ], category: 'cdn' },
  { name: 'Akamai', domains: [
    'akamaihd.net', 'akamaized.net',
  ], category: 'cdn' },
  { name: 'Fastly', domains: [
    'fastly.net', 'fastlylb.net',
  ], category: 'cdn' },
  { name: 'Amazon CloudFront', domains: [
    'cloudfront.net',
  ], category: 'cdn' },
  { name: 'jsDelivr', domains: [
    'cdn.jsdelivr.net', 'jsdelivr.net',
  ], category: 'cdn' },
  { name: 'unpkg', domains: [
    'unpkg.com',
  ], category: 'cdn' },
  { name: 'KeyCDN', domains: [
    'keycdn.com', 'kxcdn.com',
  ], category: 'cdn' },
  { name: 'Stripe', domains: [
    'js.stripe.com', 'm.stripe.network',
    'api.stripe.com', 'stripe.com',
  ], category: 'payment' },
  { name: 'PayPal', domains: [
    'www.paypal.com', 'paypalobjects.com', 'paypal.com',
  ], category: 'payment' },
  { name: 'Sentry', domains: [
    'sentry.io', 'js.sentry-cdn.com',
    'browser.sentry-cdn.com', 'ingest.sentry.io',
  ], category: 'monitoring' },
  { name: 'Datadog', domains: [
    'datadoghq.com', 'ddstatic.com', 'datadog.com',
  ], category: 'monitoring' },
  { name: 'New Relic', domains: [
    'newrelic.com', 'js-agent.newrelic.com',
    'bam.nr-data.net',
  ], category: 'monitoring' },
  { name: 'LogRocket', domains: [
    'logrocket.com', 'lr-ingest.com', 'lr-ingest.io',
  ], category: 'monitoring' },
  { name: 'Google Fonts', domains: [
    'fonts.googleapis.com', 'fonts.gstatic.com',
  ], category: 'font' },
  { name: 'Adobe Fonts', domains: [
    'use.typekit.net', 'p.typekit.net',
  ], category: 'font' },
  { name: 'Font Awesome', domains: [
    'kit.fontawesome.com', 'use.fontawesome.com',
    'fontawesome.com',
  ], category: 'font' },
  { name: 'Twitter/X', domains: [
    'platform.twitter.com', 'twimg.com', 'twitter.com',
  ], category: 'social' },
  { name: 'Instagram', domains: [
    'instagram.com', 'cdninstagram.com',
  ], category: 'social' },
  { name: 'LinkedIn', domains: [
    'linkedin.com', 'platform.linkedin.com',
  ], category: 'social' },
  { name: 'YouTube', domains: [
    'youtube.com', 'ytimg.com',
  ], category: 'social' },
  { name: 'TikTok', domains: [
    'tiktok.com', 'cdn.tiktok.com',
  ], category: 'social' },
];

export function identifyService(hostname: string | undefined, url: string | undefined): { name: string; category: string } | null {
  if (!hostname) return null;
  const hl = hostname.toLowerCase();
  for (const svc of SERVICES) {
    for (const domain of svc.domains) {
      if (hl === domain || hl.endsWith('.' + domain)) {
        return { name: svc.name, category: svc.category };
      }
    }
  }
  return null;
}

export function tagEntries(entries: AnalyzedEntry[]): AnalyzedEntry[] {
  return entries.map(e => ({
    ...e,
    service: identifyService(e.hostname, e.request?.url),
  }));
}

export function groupByService(entries: AnalyzedEntry[]): ServiceInfo[] {
  const map = new Map<string, ServiceInfo>();
  for (const e of entries) {
    if (!e.service) continue;
    const key = e.service.name;
    let info = map.get(key);
    if (!info) {
      info = { name: key, category: e.service.category, count: 0, totalTime: 0, hosts: [] };
      map.set(key, info);
    }
    info.count++;
    info.totalTime += e.time || 0;
    if (e.hostname && !info.hosts.includes(e.hostname)) {
      info.hosts.push(e.hostname);
    }
  }
  return [...map.values()].sort((a, b) => b.totalTime - a.totalTime);
}
