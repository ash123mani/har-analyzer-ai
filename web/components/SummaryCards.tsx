import type { Metrics } from '@/lib/types';
import { fmtBytes, fmtMs } from '@/lib/format';

interface SummaryCardsProps {
  metrics: Metrics;
}

export default function SummaryCards({ metrics }: SummaryCardsProps) {
  const cards = [
    { label: 'Requests', value: metrics.totalRequests.toLocaleString(), sub: null },
    { label: 'Total Size', value: fmtBytes(metrics.totalSize), sub: null },
    { label: 'Load Time', value: fmtMs(metrics.totalTime), sub: null },
    { label: 'DNS (avg)', value: fmtMs(metrics.dnsStats.avg), sub: `max ${fmtMs(metrics.dnsStats.max)}` },
    { label: 'TTFB (avg)', value: fmtMs(metrics.ttfbStats.avg), sub: `max ${fmtMs(metrics.ttfbStats.max)}` },
    { label: 'DOM Ready', value: metrics.onContentLoad !== undefined ? fmtMs(metrics.onContentLoad) : '\u2014', sub: null },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="card p-4">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {c.label}
          </div>
          <div className="text-xl font-bold text-slate-100">{c.value}</div>
          {c.sub && <div className="text-[11px] text-slate-600 mt-0.5">{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}
