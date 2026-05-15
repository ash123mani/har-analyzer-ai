'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Metrics, Bottleneck, AnalyzedEntry, HarFile } from '@/lib/types';
import { analyzeEntries, findRedirectChains, computeMetrics } from '@/lib/analysis-engine';
import { runAnalyzers } from '@/lib/analyzers';
import DropZone from '@/components/DropZone';
import ScoreRing from '@/components/ScoreRing';
import SummaryCards from '@/components/SummaryCards';
import TabBar from '@/components/TabBar';
import IssuesTab from '@/components/IssuesTab';
import ResourcesTab from '@/components/ResourcesTab';
import TimingTab from '@/components/TimingTab';
import AiTab from '@/components/AiTab';
import LoadingState from '@/components/LoadingState';
import ErrorBanner from '@/components/ErrorBanner';

function computeScore(metrics: Metrics, bottlenecks: Bottleneck[]): number {
  let score = 100;
  score -= Math.min(25, metrics.totalRequests / 8);
  score -= Math.min(20, metrics.totalSize / 100_000);
  score -= Math.min(25, metrics.totalTime / 150);
  score -= Math.min(15, (metrics.ttfbStats.avg || 0) / 80);
  score -= Math.min(15, bottlenecks.length * 4);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'analyzed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [entries, setEntries] = useState<AnalyzedEntry[]>([]);
  const [activeTab, setActiveTab] = useState('issues');
  const [fileName, setFileName] = useState<string | null>(null);

  const score = useMemo(
    () => (metrics ? computeScore(metrics, bottlenecks) : 0),
    [metrics, bottlenecks],
  );

  const handleHarLoad = useCallback((har: unknown) => {
    setStatus('loading');
    setError(null);
    try {
      const h = har as HarFile;
      const analyzed = analyzeEntries(h.log.entries || []);
      const chains = findRedirectChains(analyzed);
      const pageTimings = h.log.pages?.[0]?.pageTimings;
      const m = computeMetrics(analyzed, chains, pageTimings as { onContentLoad?: number; onLoad?: number });
      const b = runAnalyzers(m, analyzed);
      setMetrics(m);
      setBottlenecks(b);
      setEntries(analyzed);
      setStatus('analyzed');
      setActiveTab('issues');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStatus('error');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      {/* ── Header ── */}
      <header className="border-b border-slate-800/50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="font-bold text-slate-100 text-sm">HAR Analyzer</span>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-800/50 px-2.5 py-1 rounded-lg">v0.1</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ── Drop Zone ── */}
        <DropZone onLoad={handleHarLoad} fileName={fileName} setFileName={setFileName} />

        {/* ── Error ── */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* ── Loading ── */}
        {status === 'loading' && <LoadingState />}

        {/* ── Results ── */}
        {status === 'analyzed' && metrics && (
          <>
            {/* Score + Summary */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
              <div className="card p-6 flex items-center justify-center">
                <ScoreRing score={score} />
              </div>
              <div className="flex-1">
                <SummaryCards metrics={metrics} />
              </div>
            </div>

            {/* Tab Navigation */}
            <TabBar active={activeTab} onChange={setActiveTab} />

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'issues' && <IssuesTab bottlenecks={bottlenecks} />}
              {activeTab === 'resources' && <ResourcesTab metrics={metrics} />}
              {activeTab === 'timing' && <TimingTab metrics={metrics} />}
              {activeTab === 'ai' && (
                <AiTab metrics={metrics} entries={entries} bottlenecks={bottlenecks} />
              )}
            </div>
          </>
        )}

        {/* ── Idle State (no file loaded) ── */}
        {status === 'idle' && (
          <div className="text-center py-12">
            <p className="text-sm text-slate-600">Drop a HAR file above or paste JSON to begin analysis</p>
          </div>
        )}
      </main>
    </div>
  );
}
