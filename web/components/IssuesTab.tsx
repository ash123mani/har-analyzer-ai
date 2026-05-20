'use client';

import { useState, useEffect } from 'react';
import type { Bottleneck } from '@/lib/types';

interface IssuesTabProps {
  bottlenecks: Bottleneck[];
}

const SEV_ICON: Record<string, string> = { high: '\uD83D\uDD34', medium: '\uD83D\uDFE1', low: '\uD83D\uDFE2' };
const LIGHTBULB = '\uD83D\uDCA1';

export default function IssuesTab({ bottlenecks }: IssuesTabProps) {
  const [aiIssues, setAiIssues] = useState<Bottleneck[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('ai-bottlenecks') || '[]');
      setAiIssues(stored);
    } catch { /* ignore */ }

    function handleIssues(e: Event) {
      setAiIssues((e as CustomEvent).detail || []);
    }
    window.addEventListener('ai-issues-updated', handleIssues);
    return () => window.removeEventListener('ai-issues-updated', handleIssues);
  }, []);

  const allIssues = [...bottlenecks, ...aiIssues];
  const sorted = [...allIssues].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  useEffect(() => {
    if (sorted.length > 0 && expanded === null) {
      const firstHigh = sorted.findIndex(b => b.severity === 'high');
      setExpanded(firstHigh >= 0 ? firstHigh : 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length]);

  if (sorted.length === 0) {
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
          {sorted.length}
        </span>
        {aiIssues.length > 0 && (
          <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
            {aiIssues.length} from AI
          </span>
        )}
      </div>

      {sorted.map((b, i) => (
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
                  {aiIssues.includes(b) && (
                    <span className="text-[9px] font-semibold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">AI</span>
                  )}
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
