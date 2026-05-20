'use client';

import { useEffect, useState } from 'react';
import type { CategoryScore } from '@/lib/types';

interface ScoreDashboardProps {
  scores: CategoryScore[];
}

function MiniRing({ score, label }: { score: number; label: string }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);
  const targetOffset = circ * (1 - score / 100);

  useEffect(() => {
    const t = setTimeout(() => setOffset(targetOffset), 200);
    return () => clearTimeout(t);
  }, [targetOffset]);

  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 22 22)"
          className="transition-all duration-1000 ease-out"
        />
        <text x="22" y="25" textAnchor="middle" fill="#f1f5f9" fontSize="12" fontWeight="800" fontFamily="Inter,sans-serif">
          {score}
        </text>
      </svg>
      <span className="text-[10px] font-semibold text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function ScoreDashboard({ scores }: ScoreDashboardProps) {
  const overall = Math.round(scores.reduce((s, c) => s + c.score, 0) / scores.length);

  return (
    <div className="card p-5">
      <div className="flex items-start gap-6">
        {/* Overall */}
        <div className="flex flex-col items-center gap-1">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="#1e293b" strokeWidth="5" />
            <circle
              cx="36" cy="36" r="30"
              fill="none"
              stroke={overall >= 80 ? '#10b981' : overall >= 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 30}
              strokeDashoffset={2 * Math.PI * 30 * (1 - overall / 100)}
              transform="rotate(-90 36 36)"
              className="transition-all duration-1000 ease-out"
            />
            <text x="36" y="35" textAnchor="middle" fill="#f1f5f9" fontSize="20" fontWeight="800" fontFamily="Inter,sans-serif">
              {overall}
            </text>
            <text x="36" y="50" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="Inter,sans-serif">
              OVERALL
            </text>
          </svg>
          <span className={`text-xs font-bold ${overall >= 80 ? 'text-emerald-400' : overall >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
            {overall >= 80 ? 'Great' : overall >= 50 ? 'Needs Work' : 'Poor'}
          </span>
        </div>

        {/* Category rings */}
        <div className="flex-1 grid grid-cols-5 gap-2">
          {scores.map(cat => (
            <div key={cat.label} className="flex flex-col items-center gap-1">
              <MiniRing score={cat.score} label={cat.label} />
              <span className={`text-[10px] text-center leading-tight font-medium ${cat.score >= 80 ? 'text-emerald-400' : cat.score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {cat.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
