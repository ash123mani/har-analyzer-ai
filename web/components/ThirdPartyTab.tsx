'use client';

import type { AnalyzedEntry } from '@/lib/types';
import { groupByService } from '@/lib/third-party';
import { fmtMs } from '@/lib/format';

interface ThirdPartyTabProps {
  entries: AnalyzedEntry[];
}

const CATEGORY_COLORS: Record<string, string> = {
  analytics: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  marketing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  cdn: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  payment: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  monitoring: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  font: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  social: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export default function ThirdPartyTab({ entries }: ThirdPartyTabProps) {
  const services = groupByService(entries);
  const maxServiceTime = services.reduce((m, s) => Math.max(m, s.totalTime), 0);
  const firstPartyEntries = entries.filter(e => !e.service);
  const thirdPartyEntries = entries.filter(e => e.service);
  const totalTimeThird = thirdPartyEntries.reduce((s, e) => s + (e.time || 0), 0);
  const totalTimeAll = entries.reduce((s, e) => s + (e.time || 0), 0);
  const thirdPartyPct = totalTimeAll > 0 ? Math.round((totalTimeThird / totalTimeAll) * 100) : 0;

  const blockingThirdParties = thirdPartyEntries.filter(e => e.isBlocking);

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="card p-5">
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-2xl font-bold text-slate-100">{services.length}</div>
            <div className="text-xs text-slate-500">Third-Party Services</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-100">{thirdPartyEntries.length}</div>
            <div className="text-xs text-slate-500">Requests to 3rd Parties</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-400">{thirdPartyPct}%</div>
            <div className="text-xs text-slate-500">Of Total Load Time</div>
          </div>
          {blockingThirdParties.length > 0 && (
            <div>
              <div className="text-2xl font-bold text-red-400">{blockingThirdParties.length}</div>
              <div className="text-xs text-slate-500">Blocking 3rd Parties</div>
            </div>
          )}
        </div>
      </div>

      {/* Services Breakdown */}
      {services.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-400">No third-party services detected in this HAR file.</p>
        </div>
      )}

      {services.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Services by Impact</h3>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="table-header">Service</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Requests</th>
                    <th className="table-header">Total Time</th>
                    <th className="table-header w-1/4"></th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc, i) => {
                    const colorClass = CATEGORY_COLORS[svc.category] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                    return (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                        <td className="table-cell font-medium text-slate-200">{svc.name}</td>
                        <td className="table-cell">
                          <span className={`inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${colorClass}`}>
                            {svc.category}
                          </span>
                        </td>
                        <td className="table-cell text-xs font-mono">{svc.count}</td>
                        <td className="table-cell font-mono text-xs">{fmtMs(svc.totalTime)}</td>
                        <td className="table-cell">
                          <div className="bar-bg">
                            <div
                              className="bar-fill bg-indigo-500"
                              style={{ width: `${(svc.totalTime / (maxServiceTime || 1)) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Impact distribution */}
      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Load Time Distribution</h3>
        <div className="card p-5 space-y-3">
          {firstPartyEntries.length > 0 && (
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span className="text-slate-300 font-medium">First-Party</span>
                <span>{firstPartyEntries.length} req &middot; {fmtMs(totalTimeAll - totalTimeThird)}</span>
              </div>
              <div className="bar-bg">
                <div
                  className="bar-fill bg-emerald-500"
                  style={{ width: `${((totalTimeAll - totalTimeThird) / (totalTimeAll || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
          {services.map(svc => {
            const pct = totalTimeAll > 0 ? (svc.totalTime / totalTimeAll) * 100 : 0;
            return (
              <div key={svc.name}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span className="text-slate-300 font-medium">{svc.name}</span>
                  <span>{svc.count} req &middot; {fmtMs(svc.totalTime)} ({Math.round(pct)}%)</span>
                </div>
                <div className="bar-bg">
                  <div
                    className={`bar-fill ${CATEGORY_COLORS[svc.category]?.split(' ')[0] || 'bg-slate-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
