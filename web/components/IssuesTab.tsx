'use client';

import { useState } from 'react';
import type { Bottleneck } from '@/lib/types';

interface IssuesTabProps {
  bottlenecks: Bottleneck[];
}

const SEV_ICON: Record<string, string> = { high: '\u{1F534}', medium: '\u{1F7E1}', low: '\u{1F7E2}' };
const LIGHTBULB = '\u{1F4A1}';

export default function IssuesTab({ bottlenecks }: IssuesTabProps) {
  const [expanded, setExpanded] = useState<number | null>(
    bottlenecks.filter(b => b.severity === 'high').length > 0
      ? bottlenecks.findIndex(b => b.severity === 'high')
      : null,
  );

  if (bottlenecks.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">\u2705</div>
        <p className="text-slate-400 font-medium">No issues detected. Your page looks good!</p>
        <p className="text-sm text-slate-600 mt-1">The resource and timing tabs may still reveal optimization opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Issues Found</h3>
        <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
          {bottlenecks.length}
        </span>
      </div>

      {bottlenecks.map((b, i) => (
        <div
          key={i}
          onClick={() => setExpanded(expanded === i ? null : i)}
          className={`issue-card severity-${b.severity} p-4 ${expanded === i ? 'bg-slate-900' : ''}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-lg shrink-0 mt-0.5">{SEV_ICON[b.severity] || '\u25CF'}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-semibold text-slate-100">{b.title}</h4>
                  <span className={`badge-${b.severity} text-[10px]`}>{b.severity.toUpperCase()}</span>
                </div>
                <p className="text-sm text-slate-400 mt-1.5">{b.detail}</p>
              </div>
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 shrink-0 mt-1.5 transition-transform duration-200 ${expanded === i ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          {expanded === i && (
            <div className="mt-3 pt-3 border-t border-slate-800/50 pl-9">
              <div className="flex gap-2">
                <span className="text-indigo-400 text-sm shrink-0 mt-0.5">{LIGHTBULB}</span>
                <p className="text-sm text-slate-300 leading-relaxed">{b.suggestion}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
