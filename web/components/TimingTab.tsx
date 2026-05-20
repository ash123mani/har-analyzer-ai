'use client';

import { useState } from 'react';
import type { Metrics, AnalyzedEntry } from '@/lib/types';
import { fmtBytes, fmtMs, truncate } from '@/lib/format';
import { analyzeRequestEntry } from '@/lib/security-audit';

const TYPE_COLORS: Record<string, string> = {
  document: 'bg-emerald-500',
  script: 'bg-purple-500',
  stylesheet: 'bg-blue-500',
  image: 'bg-amber-500',
  font: 'bg-pink-500',
  other: 'bg-slate-500',
  xhr: 'bg-teal-500',
  fetch: 'bg-cyan-500',
};

function RequestDetails({ entry }: { entry: AnalyzedEntry }) {
  const analysis = analyzeRequestEntry(entry);
  const reqHeaders = entry.request.headers.slice(0, 8);
  const resHeaders = entry.response.headers.slice(0, 8);

  return (
    <div className="p-4 bg-slate-900/50 border-t border-slate-800 text-xs space-y-3">
      {/* Flagged issues */}
      {analysis.issues.length > 0 && (
        <div>
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Issues</span>
          <div className="mt-1.5 space-y-1">
            {analysis.issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-amber-400">
                <span className="mt-0.5 shrink-0">&#x26A0;</span>
                <span>{issue}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Headers */}
      {reqHeaders.length > 0 && (
        <div>
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Request Headers</span>
          <div className="mt-1.5 space-y-0.5 font-mono">
            {reqHeaders.map((h, i) => (
              <div key={i} className="text-slate-400">
                <span className="text-indigo-400">{h.name}</span>: {h.value.length > 80 ? h.value.slice(0, 80) + '\u2026' : h.value}
              </div>
            ))}
            {entry.request.headers.length > 8 && (
              <div className="text-slate-600 mt-0.5">+{entry.request.headers.length - 8} more</div>
            )}
          </div>
        </div>
      )}

      {/* Response Headers */}
      {resHeaders.length > 0 && (
        <div>
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Response Headers</span>
          <div className="mt-1.5 space-y-0.5 font-mono">
            {resHeaders.map((h, i) => (
              <div key={i} className="text-slate-400">
                <span className="text-emerald-400">{h.name}</span>: {h.value.length > 80 ? h.value.slice(0, 80) + '\u2026' : h.value}
              </div>
            ))}
            {entry.response.headers.length > 8 && (
              <div className="text-slate-600 mt-0.5">+{entry.response.headers.length - 8} more</div>
            )}
          </div>
        </div>
      )}

      {/* Timings */}
      <div>
        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Timings</span>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-center">
            <div className="text-slate-400 font-mono">{fmtMs(entry.timings?.dns)}</div>
            <div className="text-[10px] text-slate-600">DNS</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-center">
            <div className="text-slate-400 font-mono">{fmtMs(entry.timings?.connect)}</div>
            <div className="text-[10px] text-slate-600">Connect</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-center">
            <div className="text-slate-400 font-mono">{fmtMs(entry.timings?.ssl)}</div>
            <div className="text-[10px] text-slate-600">SSL</div>
          </div>
          <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-center">
            <div className="text-slate-400 font-mono">{fmtMs(entry.timings?.wait)}</div>
            <div className="text-[10px] text-slate-600">Wait</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimingTabProps {
  metrics: Metrics;
}

export default function TimingTab({ metrics }: TimingTabProps) {
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const maxEntryTime = metrics.waterfall.reduce((m, x) => Math.max(m, x.time || 0), 0);

  return (
    <div className="space-y-8">

      {/* ── Slowest Requests ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Slowest Requests</h3>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="table-header">Time</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">URL</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Host</th>
                  <th className="table-header w-1/4"></th>
                </tr>
              </thead>
              <tbody>
                {(showAll ? metrics.waterfall : metrics.slowestEntries).filter(Boolean).flatMap((e, i) => {
                  const url = e.request?.url || '';
                  const method = e.request?.method || '\u2014';
                  const isExpanded = expanded === i;
                  const rows = [
                    <tr key={`row-${i}`}
                      className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : i)}
                    >
                      <td className="table-cell font-mono text-xs">{fmtMs(e.time)}</td>
                      <td className="table-cell text-xs font-mono text-slate-500">{method}</td>
                      <td className="table-cell max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap" title={url}>
                        {truncate(url, 60)}
                      </td>
                      <td className="table-cell text-xs">{e.resourceType}</td>
                      <td className="table-cell text-xs text-slate-500">{e.service?.name || e.hostname}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                            <div className="bar-bg flex-1">
                              <div
                                className={`bar-fill ${TYPE_COLORS[e.resourceType] || 'bg-slate-500'}`}
                                style={{ width: `${(e.time / (maxEntryTime || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-600 shrink-0">{isExpanded ? '\u25B2' : '\u25BC'}</span>
                          </div>
                        </td>
                    </tr>,
                  ];
                  if (isExpanded) {
                    rows.push(
                      <tr key={`detail-${i}`} className="border-b border-slate-800/50">
                        <td colSpan={6} className="p-0">
                          <RequestDetails entry={e} />
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
          {metrics.waterfall.length > 5 && (
            <button onClick={() => setShowAll(!showAll)} className="btn-ghost w-full rounded-none border-t border-slate-800 py-3 text-xs">
              {showAll ? 'Show top 5 only' : `Show all ${metrics.waterfall.length} requests`}
            </button>
          )}
        </div>
      </div>

      {/* ── Timing Stats ── */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Timing Averages</h3>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="table-header">Metric</th>
                <th className="table-header">Avg</th>
                <th className="table-header">Max</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'TTFB', avg: metrics.ttfbStats.avg, max: metrics.ttfbStats.max },
                { label: 'DNS Lookup', avg: metrics.dnsStats.avg, max: metrics.dnsStats.max },
                { label: 'TCP Connect', avg: metrics.connectStats.avg, max: metrics.connectStats.max },
              ].map((row, i) => (
                <tr key={i} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                  <td className="table-cell font-medium text-slate-200">{row.label}</td>
                  <td className="table-cell font-mono text-xs">{fmtMs(row.avg)}</td>
                  <td className="table-cell font-mono text-xs">{fmtMs(row.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Redirect Chains ── */}
      {metrics.redirectChains.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Redirect Chains</h3>
            <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
              {metrics.redirectChains.length}
            </span>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="table-header">Time</th>
                  <th className="table-header">From</th>
                  <th className="table-header">To</th>
                  <th className="table-header">Hops</th>
                </tr>
              </thead>
              <tbody>
                {metrics.redirectChains.map((c, i) => (
                  <tr key={i} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20 transition-colors">
                    <td className="table-cell font-mono text-xs">{fmtMs(c.totalTime)}</td>
                    <td className="table-cell max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-xs" title={c.initialUrl}>
                      {truncate(c.initialUrl, 40)}
                    </td>
                    <td className="table-cell max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-xs" title={c.finalUrl}>
                      {truncate(c.finalUrl, 40)}
                    </td>
                    <td className="table-cell text-xs">{c.entries.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
