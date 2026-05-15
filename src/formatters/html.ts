import type { MetricsResult, Bottleneck } from '../types.js';
import { formatBytes, formatMs } from '../utils/format.js';

function bar(pct: number, color: string): string {
  return `<div style="height:18px;background:${color};width:${Math.max(pct, 1)}%;border-radius:3px;min-width:4px"></div>`;
}

export function formatHtml(metrics: MetricsResult, bottlenecks: Bottleneck[]): string {
  const maxTime = Math.max(...metrics.waterfall.map((e) => e.time), 1);

  const bottleneckRows = bottlenecks.map((b) => {
    const cls = b.severity === 'high' ? 'high' : b.severity === 'medium' ? 'med' : 'low';
    const label = b.severity === 'high' ? 'High' : b.severity === 'medium' ? 'Medium' : 'Low';
    return `
      <tr>
        <td><span class="badge ${cls}">${label}</span></td>
        <td>${b.title}</td>
        <td>${b.detail}</td>
        <td>${b.suggestion}</td>
      </tr>`;
  }).join('');

  const resourceRows = Object.entries(metrics.byType)
    .sort(([, a], [, b]) => b.totalTime - a.totalTime)
    .map(([type, s]) => {
      const timePct = (s.totalTime / metrics.totalTime) * 100;
      return `
        <tr>
          <td>${type}</td>
          <td>${s.count}</td>
          <td>${formatBytes(s.totalSize)}</td>
          <td>${formatMs(s.totalTime)}</td>
          <td>${bar(timePct, '#6366f1')}</td>
        </tr>`;
    }).join('');

  const slowestRows = metrics.slowestEntries.map((e) => {
    const timePct = (e.time / maxTime) * 100;
    return `
      <tr>
        <td>${formatMs(e.time)}</td>
        <td>${e.request.method}</td>
        <td title="${e.request.url}">${e.request.url.length > 80 ? e.request.url.slice(0, 80) + '...' : e.request.url}</td>
        <td>${e.resourceType}</td>
        <td>${e.hostname}</td>
        <td>${bar(timePct, '#f59e0b')}</td>
      </tr>`;
  }).join('');

  const chainRows = metrics.redirectChains.map((c) => `
    <tr>
      <td>${formatMs(c.totalTime)}</td>
      <td title="${c.initialUrl}">${c.initialUrl.length > 60 ? c.initialUrl.slice(0, 60) + '...' : c.initialUrl}</td>
      <td title="${c.finalUrl}">${c.finalUrl.length > 60 ? c.finalUrl.slice(0, 60) + '...' : c.finalUrl}</td>
      <td>${c.entries.length}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HAR Analysis Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;color:#1e293b;line-height:1.6}
.header{background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:32px 40px}
.header h1{font-size:24px;margin-bottom:4px}
.header p{color:#94a3b8;font-size:14px}
.container{max-width:1200px;margin:0 auto;padding:24px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:32px}
.card{background:#fff;border-radius:10px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.card .label{font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:.5px}
.card .value{font-size:28px;font-weight:700;margin-top:4px;color:#0f172a}
.card .sub{font-size:13px;color:#64748b;margin-top:2px}
.section{background:#fff;border-radius:10px;padding:24px;margin-bottom:24px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.section h2{font-size:18px;margin-bottom:16px;color:#0f172a;border-bottom:2px solid #f1f5f9;padding-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;padding:10px 12px;color:#64748b;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #f1f5f9}
td{padding:10px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:hover td{background:#f8fafc}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase}
.badge.high{background:#fef2f2;color:#dc2626}
.badge.med{background:#fffbeb;color:#d97706}
.badge.low{background:#f0fdf4;color:#16a34a}
.host{font-size:12px;color:#64748b}
.bar-cell{min-width:120px}
.waterfall{overflow-x:auto}
@media(max-width:768px){.cards{grid-template-columns:repeat(2,1fr)}.header{padding:20px}}
</style>
</head>
<body>
<div class="header">
  <h1>HAR Analysis Report</h1>
  <p>${metrics.totalRequests} requests · ${formatBytes(metrics.totalSize)} · ${formatMs(metrics.totalTime)}</p>
</div>
<div class="container">

<div class="cards">
  <div class="card"><div class="label">Requests</div><div class="value">${metrics.totalRequests}</div></div>
  <div class="card"><div class="label">Total Size</div><div class="value">${formatBytes(metrics.totalSize)}</div></div>
  <div class="card"><div class="label">Load Time</div><div class="value">${formatMs(metrics.totalTime)}</div></div>
  <div class="card"><div class="label">TTFB (avg)</div><div class="value">${formatMs(metrics.ttfbStats.avg)}</div><div class="sub">max ${formatMs(metrics.ttfbStats.max)}</div></div>
  <div class="card"><div class="label">DNS Lookup</div><div class="value">${formatMs(metrics.dnsStats.avg)}</div><div class="sub">max ${formatMs(metrics.dnsStats.max)}</div></div>
  <div class="card"><div class="label">DOM Ready</div><div class="value">${metrics.onContentLoad !== undefined ? formatMs(metrics.onContentLoad) : '—'}</div></div>
</div>

${bottlenecks.length ? `<div class="section">
  <h2>Bottlenecks (${bottlenecks.length})</h2>
  <table>
    <thead><tr><th>Severity</th><th>Issue</th><th>Detail</th><th>Suggestion</th></tr></thead>
    <tbody>${bottleneckRows}</tbody>
  </table>
</div>` : ''}

<div class="section">
  <h2>Resource Breakdown</h2>
  <table>
    <thead><tr><th>Type</th><th>Requests</th><th>Size</th><th>Time</th><th></th></tr></thead>
    <tbody>${resourceRows}</tbody>
  </table>
</div>

<div class="section">
  <h2>Slowest Requests</h2>
  <table>
    <thead><tr><th>Time</th><th>Method</th><th>URL</th><th>Type</th><th>Host</th><th></th></tr></thead>
    <tbody>${slowestRows}</tbody>
  </table>
</div>

${metrics.redirectChains.length ? `<div class="section">
  <h2>Redirect Chains</h2>
  <table>
    <thead><tr><th>Time</th><th>From</th><th>To</th><th>Hops</th></tr></thead>
    <tbody>${chainRows}</tbody>
  </table>
</div>` : ''}

<div class="section">
  <h2>Timing Stats</h2>
  <table>
    <thead><tr><th>Metric</th><th>Avg</th><th>Max</th></tr></thead>
    <tbody>
      <tr><td>TTFB</td><td>${formatMs(metrics.ttfbStats.avg)}</td><td>${formatMs(metrics.ttfbStats.max)}</td></tr>
      <tr><td>DNS Lookup</td><td>${formatMs(metrics.dnsStats.avg)}</td><td>${formatMs(metrics.dnsStats.max)}</td></tr>
      <tr><td>TCP Connect</td><td>${formatMs(metrics.connectStats.avg)}</td><td>${formatMs(metrics.connectStats.max)}</td></tr>
    </tbody>
  </table>
</div>

<div class="section">
  <div style="text-align:center;color:#94a3b8;font-size:13px">
    Generated by HAR Analyzer AI
  </div>
</div>

</div>
</body>
</html>`;
}
