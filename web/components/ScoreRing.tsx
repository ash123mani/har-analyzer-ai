'use client';

import { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
}

export default function ScoreRing({ score }: ScoreRingProps) {
  const [animatedOffset, setAnimatedOffset] = useState(326.73);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const targetOffset = circ * (1 - score / 100);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedOffset(targetOffset), 100);
    return () => clearTimeout(timer);
  }, [targetOffset]);

  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 120 120" className="drop-shadow-lg">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={animatedOffset}
          transform="rotate(-90 60 60)"
          className="transition-all duration-1000 ease-out"
        />
        <text x="60" y="52" textAnchor="middle" fill="#f1f5f9" fontSize="28" fontWeight="800" fontFamily="Inter,sans-serif">
          {score}
        </text>
        <text x="60" y="74" textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600" fontFamily="Inter,sans-serif">
          / 100
        </text>
      </svg>
      <span className={`text-xs font-semibold ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
        {score >= 80 ? 'Great' : score >= 50 ? 'Needs Work' : 'Poor'}
      </span>
    </div>
  );
}
