'use client';

import type { Metrics, Bottleneck, SecurityFinding, CategoryScore, AnalyzedEntry } from '@/lib/types';
import { fmtBytes, fmtMs } from '@/lib/format';

interface ExportReportProps {
  metrics: Metrics;
  bottlenecks: Bottleneck[];
  securityFindings: SecurityFinding[];
  scores: CategoryScore[];
  entries: AnalyzedEntry[];
  aiReport: string;
  fileName: string | null;
}

export default function ExportReport({
  metrics,
  bottlenecks,
  securityFindings,
  scores,
  entries,
  aiReport,
  fileName,
}: ExportReportProps) {
  async function handleDownloadHtml() {
    const totalThird = entries.filter(e => e.service).reduce((s, e) => s + (e.time || 0), 0);
    const totalAll = entries.reduce((s, e) => s + (e.time || 0), 0);
    const thirdPct = totalAll > 0 ? Math.round((totalThird / totalAll) * 100) : 0;
    const aiSections = aiReport
      ? `<div class="section"><h2>AI Analysis</h2><div class="ai-content">${aiReport.replace(/\n/g, '<br>')}</div></div>`
      : '';

    const securitySection = securityFindings.length > 0
      ? `<div class="section"><h2>Security Audit (${securityFindings.length} findings)</h2><table><tr><th>Severity</th><th>Issue</th><th>Fix</th></tr>${securityFindings.map(f => `<tr><td class="sev-${f.severity}">${f.severity.toUpperCase()}</td><td>${f.title}</td><td>${f.suggestion}</td></tr>`).join('')}</table></div>`
      : '';

    const scoresSection = scores.length > 0
      ? `<div class="section"><h2>Performance Scores</h2><div class="scores">${scores.map(s => `<div class="score-item"><div class="score-value ${s.score >= 80 ? 'good' : s.score >= 50 ? 'warn' : 'bad'}">${s.score}</div><div class="score-label">${s.label}</div><div class="score-detail">${s.detail}</div></div>`).join('')}</div></div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HAR Analysis Report${fileName ? ` - ${fileName}` : ''}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0e17; color: #e2e8f0; line-height: 1.6; padding: 40px; }
  .container { max-width: 900px; margin: 0 auto; }
  h1 { font-size: 24px; font-weight: 800; color: #f1f5f9; margin-bottom: 8px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 32px; }
  .section { margin-bottom: 28px; }
  h2 { font-size: 16px; font-weight: 700; color: #f1f5f9; padding-bottom: 8px; border-bottom: 1px solid #1e293b; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; }
  .stat-value { font-size: 22px; font-weight: 800; color: #f1f5f9; }
  .stat-label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
  th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; background: #1e293b; border-bottom: 2px solid #334155; }
  td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #1e293b; }
  tr:last-child td { border-bottom: none; }
  tr:nth-child(even) td { background: rgba(30, 41, 59, 0.3); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
  .badge-high { background: rgba(239, 68, 68, 0.15); color: #f87171; }
  .badge-medium { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
  .badge-low { background: rgba(16, 185, 129, 0.15); color: #34d399; }
  .sev-high { color: #f87171; font-weight: 700; font-size: 11px; text-transform: uppercase; }
  .sev-medium { color: #fbbf24; font-weight: 700; font-size: 11px; text-transform: uppercase; }
  .sev-low { color: #34d399; font-weight: 700; font-size: 11px; text-transform: uppercase; }
  .scores { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .score-item { text-align: center; padding: 12px 8px; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; }
  .score-value { font-size: 24px; font-weight: 800; }
  .score-value.good { color: #34d399; }
  .score-value.warn { color: #fbbf24; }
  .score-value.bad { color: #f87171; }
  .score-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  .score-detail { font-size: 10px; color: #475569; margin-top: 2px; }
  .ai-content { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; font-size: 13px; line-height: 1.7; white-space: pre-wrap; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; font-size: 11px; color: #475569; text-align: center; }
  @media print { body { background: white; color: #1e293b; } .stat-card, table, .score-item, .ai-content { background: #f8fafc; border-color: #e2e8f0; } }
</style>
</head>
<body>
<div class="container">
  <h1>HAR Analysis Report</h1>
  <p class="subtitle">${fileName || 'HAR file'} &mdash; ${metrics.totalRequests} requests &middot; ${fmtBytes(metrics.totalSize)} &middot; ${fmtMs(metrics.totalTime)} total load</p>

  <div class="section">
    <h2>Summary</h2>
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${metrics.totalRequests}</div><div class="stat-label">Requests</div></div>
      <div class="stat-card"><div class="stat-value">${fmtBytes(metrics.totalSize)}</div><div class="stat-label">Total Size</div></div>
      <div class="stat-card"><div class="stat-value">${fmtMs(metrics.totalTime)}</div><div class="stat-label">Load Time</div></div>
      <div class="stat-card"><div class="stat-value">${Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length)}</div><div class="stat-label">Overall Score</div></div>
      <div class="stat-card"><div class="stat-value">${bottlenecks.length}</div><div class="stat-label">Issues Found</div></div>
      <div class="stat-card"><div class="stat-value">${securityFindings.length}</div><div class="stat-label">Security Issues</div></div>
      <div class="stat-card"><div class="stat-value">${thirdPct}%</div><div class="stat-label">3rd Party Time</div></div>
    </div>
  </div>

  ${scoresSection}

  <div class="section">
    <h2>Top Issues (${bottlenecks.length})</h2>
    ${bottlenecks.length === 0 ? '<p style="color: #64748b; font-size: 13px;">No issues detected.</p>' : `
    <table>
      <tr><th>Severity</th><th>Issue</th><th>Detail</th><th>Suggestion</th></tr>
      ${bottlenecks.map(b => `<tr><td><span class="badge badge-${b.severity}">${b.severity}</span></td><td>${b.title}</td><td style="font-size: 12px; color: #94a3b8;">${b.detail}</td><td style="font-size: 12px; color: #34d399;">${b.suggestion}</td></tr>`).join('')}
    </table>`}
  </div>

  ${securitySection}

  ${aiSections}

  <div class="footer">
    Generated by HAR Analyzer AI &mdash; ${new Date().toISOString().split('T')[0]}
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `har-report-${fileName ? fileName.replace(/\.har$/i, '') : 'analysis'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={handleDownloadHtml} className="btn-secondary" disabled={!metrics}>
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download Report
    </button>
  );
}
