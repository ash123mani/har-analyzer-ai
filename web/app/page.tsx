'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Metrics, Bottleneck, AnalyzedEntry, HarFile, SecurityFinding, CategoryScore } from '@/lib/types';
import { analyzeEntries, findRedirectChains, computeMetrics } from '@/lib/analysis-engine';
import { runAnalyzers } from '@/lib/analyzers';
import { analyzeSecurity, computeSecurityScore } from '@/lib/security-audit';
import { groupByService } from '@/lib/third-party';
import DropZone from '@/components/DropZone';
import ScoreDashboard from '@/components/ScoreDashboard';
import SummaryCards from '@/components/SummaryCards';
import TabBar from '@/components/TabBar';
import IssuesTab from '@/components/IssuesTab';
import SecurityTab from '@/components/SecurityTab';
import ThirdPartyTab from '@/components/ThirdPartyTab';
import ResourcesTab from '@/components/ResourcesTab';
import TimingTab from '@/components/TimingTab';
import AiTab from '@/components/AiTab';
import ExportReport from '@/components/ExportReport';
import LoadingState from '@/components/LoadingState';
import ErrorBanner from '@/components/ErrorBanner';

function computeCategoryScores(metrics: Metrics, bottlenecks: Bottleneck[], securityFindings: SecurityFinding[]): CategoryScore[] {
  const speedRaw = 100 - Math.min(30, metrics.totalTime / 100) - Math.min(20, (metrics.ttfbStats.avg || 0) / 60) - Math.min(10, metrics.slowestEntries.filter(e => e.time > 2000).length * 5);
  const securityScore = computeSecurityScore(securityFindings);
  const cachingRaw = 100 - Math.min(30, metrics.redirectChains.length * 10) - Math.min(20, bottlenecks.filter(b => b.title.toLowerCase().includes('cache')).length * 10);
  const services = groupByService(metrics.waterfall);
  const thirdPartyCount = services.length;
  const blockingThird = services.filter(s => metrics.blockingEntries.some(e => e.service?.name === s.name)).length;
  const thirdRiskRaw = 100 - Math.min(40, thirdPartyCount * 8) - Math.min(20, blockingThird * 10);
  const failedEntries = metrics.waterfall.filter(e => e.response.status && (e.response.status >= 400 || e.response.status < 200));
  const slowApis = metrics.waterfall.filter(e => e.resourceType === 'other' && e.time > 2000);
  const apiRaw = 100 - Math.min(30, failedEntries.length * 5) - Math.min(20, slowApis.length * 5);

  return [
    { label: 'Speed', score: Math.max(0, Math.min(100, Math.round(speedRaw))), icon: '\u26A1', detail: `${metrics.waterfall.length} req / ${Math.round(metrics.totalTime)}ms` },
    { label: 'Security', score: Math.max(0, Math.min(100, Math.round(securityScore))), icon: '\uD83D\uDD12', detail: `${securityFindings.length} issue${securityFindings.length !== 1 ? 's' : ''}` },
    { label: 'Caching', score: Math.max(0, Math.min(100, Math.round(cachingRaw))), icon: '\uD83D\uDCC1', detail: `${metrics.redirectChains.length} redirect chain${metrics.redirectChains.length !== 1 ? 's' : ''}` },
    { label: '3rd Party', score: Math.max(0, Math.min(100, Math.round(thirdRiskRaw))), icon: '\uD83C\uDF10', detail: `${thirdPartyCount} service${thirdPartyCount !== 1 ? 's' : ''}` },
    { label: 'API Health', score: Math.max(0, Math.min(100, Math.round(apiRaw))), icon: '\u2699', detail: `${failedEntries.length} error${failedEntries.length !== 1 ? 's' : ''}` },
  ];
}

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'analyzed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [securityFindings, setSecurityFindings] = useState<SecurityFinding[]>([]);
  const [entries, setEntries] = useState<AnalyzedEntry[]>([]);
  const [activeTab, setActiveTab] = useState('issues');
  const [fileName, setFileName] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState('');

  const scores = useMemo(
    () => (metrics ? computeCategoryScores(metrics, bottlenecks, securityFindings) : []),
    [metrics, bottlenecks, securityFindings],
  );

  const handleHarLoad = useCallback((har: unknown) => {
    setStatus('loading');
    setError(null);
    setAiReport('');
    try {
      const h = har as HarFile;
      const analyzed = analyzeEntries(h.log.entries || []);
      const chains = findRedirectChains(analyzed);
      const pageTimings = h.log.pages?.[0]?.pageTimings;
      const m = computeMetrics(analyzed, chains, pageTimings as { onContentLoad?: number; onLoad?: number });
      const b = runAnalyzers(m, analyzed);
      const sec = analyzeSecurity(h.log.entries || []);
      setMetrics(m);
      setBottlenecks(b);
      setSecurityFindings(sec);
      setEntries(analyzed);
      setStatus('analyzed');
      setActiveTab('issues');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    function handleNavigate(e: Event) {
      setActiveTab((e as CustomEvent).detail || 'issues');
    }
    window.addEventListener('navigate-tab', handleNavigate);
    return () => window.removeEventListener('navigate-tab', handleNavigate);
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
            {/* Score Dashboard */}
            <div className="mb-6">
              <ScoreDashboard scores={scores} />
            </div>

            {/* Summary + Export */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
              <div className="flex-1">
                <SummaryCards metrics={metrics} />
              </div>
              <div className="flex items-start">
                <ExportReport
                  metrics={metrics}
                  bottlenecks={bottlenecks}
                  securityFindings={securityFindings}
                  scores={scores}
                  entries={entries}
                  aiReport={aiReport}
                  fileName={fileName}
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <TabBar active={activeTab} onChange={setActiveTab} />

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'issues' && <IssuesTab bottlenecks={bottlenecks} />}
              {activeTab === 'security' && <SecurityTab findings={securityFindings} score={scores[1]?.score ?? 0} />}
              {activeTab === 'thirdparty' && <ThirdPartyTab entries={entries} />}
              {activeTab === 'resources' && <ResourcesTab metrics={metrics} />}
              {activeTab === 'timing' && <TimingTab metrics={metrics} />}
              {activeTab === 'ai' && (
                <AiTab
                  metrics={metrics}
                  entries={entries}
                  bottlenecks={bottlenecks}
                  onReportChange={setAiReport}
                />
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
