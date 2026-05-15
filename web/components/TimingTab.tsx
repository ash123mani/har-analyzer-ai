'use client';

import { useState } from 'react';
import type { Metrics } from '@/lib/types';
import { fmtBytes, fmtMs, truncate } from '@/lib/format';

interface TimingTabProps {
  metrics: Metrics;
}

export default function TimingTab({ metrics }: TimingTabProps) {
  const [showAll, setShowAll] = useState(false);
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
                {(showAll ? metrics.waterfall : metrics.slowestEntries).map((e, i) => {
                  const url = e.request?.url || '';
                  const method = e.request?.method || '\u2014';
                  return (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="table-cell font-mono text-xs">{fmtMs(e.time)}</td>
                      <td className="table-cell text-xs font-mono text-slate-500">{method}</td>
                      <td className="table-cell max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap" title={url}>
                        {truncate(url, 60)}
                      </td>
                      <td className="table-cell text-xs">{e.resourceType}</td>
                      <td className="table-cell text-xs text-slate-500">{e.service?.name || e.hostname}</td>
                      <td className="table-cell">
                        <div className="bar-bg">
                          <div
                            className="bar-fill bg-amber-500"
                            style={{ width: `${(e.time / (maxEntryTime || 1)) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
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
