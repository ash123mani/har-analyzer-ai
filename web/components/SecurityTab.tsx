'use client';

import type { SecurityFinding } from '@/lib/types';

interface SecurityTabProps {
  findings: SecurityFinding[];
  score: number;
}

interface GroupedFindings {
  category: string;
  items: SecurityFinding[];
}

function groupByCategory(findings: SecurityFinding[]): GroupedFindings[] {
  const map = new Map<string, SecurityFinding[]>();
  for (const f of findings) {
    if (!map.has(f.category)) map.set(f.category, []);
    map.get(f.category)!.push(f);
  }
  return [...map.entries()]
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      const aMin = Math.min(...a.items.map(i => severityOrder[i.severity]));
      const bMin = Math.min(...b.items.map(i => severityOrder[i.severity]));
      return aMin - bMin;
    });
}

export default function SecurityTab({ findings, score }: SecurityTabProps) {
  const grouped = groupByCategory(findings);

  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const scoreLabel = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor';

  return (
    <div className="space-y-8">
      {/* Score */}
      <div className="card p-6 flex items-center gap-6">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-800" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              className={scoreColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${score} ${100 - score}`}
              strokeDashoffset="0"
            />
          </svg>
          <span className={`absolute text-lg font-bold ${scoreColor}`}>{score}</span>
        </div>
        <div>
          <div className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</div>
          <div className="text-xs text-slate-500 mt-1">
            {findings.length} security issue{findings.length !== 1 ? 's' : ''} detected
          </div>
        </div>
      </div>

      {/* Findings by category */}
      {grouped.length === 0 && (
        <div className="card p-8 text-center">
          <div className="text-2xl mb-2">&#x1F513;</div>
          <p className="text-sm text-slate-400">No security issues found. Your site looks clean!</p>
        </div>
      )}

      {grouped.map(group => (
        <div key={group.category}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{group.category}</h3>
          <div className="space-y-3">
            {group.items.map((f, i) => (
              <div key={i} className={`card p-5 border-l-4 ${f.severity === 'high' ? 'border-l-red-500' : f.severity === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 text-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded text-[11px] ${f.severity === 'high' ? 'text-red-400 bg-red-500/10' : f.severity === 'medium' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                    {f.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{f.title}</p>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{f.detail}</p>
                    {f.suggestion && (
                      <div className="mt-2.5 text-xs text-emerald-400/80 bg-emerald-500/5 px-3 py-2 rounded-lg border border-emerald-500/10">
                        <span className="font-semibold text-emerald-300">Fix: </span>
                        {f.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
