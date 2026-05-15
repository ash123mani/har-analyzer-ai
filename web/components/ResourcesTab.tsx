import type { Metrics } from '@/lib/types';
import { fmtBytes, fmtMs } from '@/lib/format';

interface ResourcesTabProps {
  metrics: Metrics;
}

const TYPE_ICONS: Record<string, string> = {
  document: '\uD83D\uDCC4',
  script: '\uD83D\uDCF1',
  stylesheet: '\uD83C\uDFA8',
  image: '\uD83D\uDDBC',
  font: '\uD83D\uDCDD',
  other: '\uD83D\uDCE6',
};

export default function ResourcesTab({ metrics }: ResourcesTabProps) {
  const types = Object.entries(metrics.byType).sort(([, a], [, b]) => b.totalTime - a.totalTime);
  const maxTime = types.length > 0 ? Math.max(...types.map(([, s]) => s.totalTime)) : 1;
  const maxSize = types.length > 0 ? Math.max(...types.map(([, s]) => s.totalSize)) : 1;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Resource Breakdown</h3>

      <div className="space-y-2">
        {types.map(([type, s]) => (
          <div key={type} className="card p-4">
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-lg">{TYPE_ICONS[type] || '\uD83D\uDCE6'}</span>
              <span className="text-sm font-medium text-slate-200 capitalize min-w-[80px]">{type}</span>
              <span className="text-xs text-slate-500 ml-auto">{s.count} requests</span>
              <span className="text-xs text-slate-400 w-20 text-right">{fmtBytes(s.totalSize)}</span>
              <span className="text-xs text-slate-400 w-20 text-right">{fmtMs(s.totalTime)}</span>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                  <span>Size</span>
                  <span>{fmtBytes(s.totalSize)}</span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill bg-indigo-500" style={{ width: `${(s.totalSize / maxSize) * 100}%` }} />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                  <span>Time</span>
                  <span>{fmtMs(s.totalTime)}</span>
                </div>
                <div className="bar-bg">
                  <div className="bar-fill bg-amber-500" style={{ width: `${(s.totalTime / maxTime) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
