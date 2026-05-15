'use client';

import { useState } from 'react';
import { marked } from 'marked';
import type { Metrics, Bottleneck, AnalyzedEntry } from '@/lib/types';
import { buildPrompt } from '@/lib/prompt-builder';

interface AiTabProps {
  metrics: Metrics | null;
  entries: AnalyzedEntry[];
  bottlenecks: Bottleneck[];
}

export default function AiTab({ metrics, entries, bottlenecks }: AiTabProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [llmOutput, setLlmOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!metrics) return;
    setAiLoading(true);
    setAiError(null);
    setLlmOutput('');
    try {
      const prompt = buildPrompt(metrics, entries, bottlenecks, customPrompt);
      setLlmOutput('_Calling LLM API\u2026_');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a senior web performance engineer. Analyze HAR data and produce a structured, scannable report. CRITICAL: Use markdown pipe tables ONLY (never ASCII box-drawing tables). Put ASCII art inside fenced code blocks. Prefix issues with [CRITICAL] [HIGH] [MEDIUM] [LOW]. Every issue must have **What** / **Why It Matters** / **How to Fix** / **Impact**. Include inline bar charts with Unicode blocks (█░). Keep descriptions tight but complete. Use `code` for filenames and commands.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const report = data.choices?.[0]?.message?.content || '';
      setLlmOutput(report);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'LLM call failed';
      setAiError(msg);
      setLlmOutput('');
    }
    setAiLoading(false);
  }

  async function handleCopy() {
    const text = llmOutput
      ? (document.getElementById('llm-rendered')?.textContent || llmOutput)
      : JSON.stringify({ metrics, bottlenecks }, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      const btn = document.activeElement as HTMLButtonElement;
      if (btn) {
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      }
    } catch { /* clipboard not available */ }
  }

  function enrichHtml(html: string): string {
    return html
      .replace(/\[(HIGH|CRITICAL)\]/gi, '<span class="sv-high">$1</span>')
      .replace(/\[(MEDIUM|WARNING)\]/gi, '<span class="sv-medium">$1</span>')
      .replace(/\[(LOW|INFO)\]/gi, '<span class="sv-low">$1</span>')
      .replace(
        /<strong>Severity<\/strong>: (High|Critical)/gi,
        '<strong>Severity</strong>: <span class="sv-high">$1</span>',
      )
      .replace(
        /<strong>Severity<\/strong>: (Medium|Warning)/gi,
        '<strong>Severity</strong>: <span class="sv-medium">$1</span>',
      )
      .replace(
        /<strong>Severity<\/strong>: (Low|Info)/gi,
        '<strong>Severity</strong>: <span class="sv-low">$1</span>',
      )
      .replace(/<strong>What<\/strong>/gi, '<strong class="text-indigo-400">What</strong>')
      .replace(/<strong>Why It Matters<\/strong>/gi, '<strong class="text-amber-400">Why It Matters</strong>')
      .replace(/<strong>How to Fix<\/strong>/gi, '<strong class="text-emerald-400">How to Fix</strong>')
      .replace(/<strong>Impact<\/strong>/gi, '<strong class="text-amber-400">Impact</strong>')
      .replace(/<strong>Finding<\/strong>/gi, '<strong class="text-indigo-400">Finding</strong>')
      .replace(/<strong>Why<\/strong>/gi, '<strong class="text-amber-400">Why</strong>')
      .replace(/<strong>Fix<\/strong>/gi, '<strong class="text-emerald-400">Fix</strong>');
  }

  const html = llmOutput ? enrichHtml(marked.parse(llmOutput) as string) : '';

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">AI Performance Analysis</h3>

      <div className="card p-4">
        <textarea
          value={customPrompt}
          onChange={e => setCustomPrompt(e.target.value)}
          placeholder="Optional: add custom instructions for the AI (e.g. \u201CFocus on mobile performance\u201D)"
          rows={2}
          className="input resize-none"
        />
        <div className="flex gap-3 mt-3">
          <button onClick={handleAnalyze} disabled={aiLoading || !metrics} className="btn-primary">
            {aiLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
                </svg>
                Analyzing\u2026
              </span>
            ) : 'Analyze with AI'}
          </button>
          <button onClick={handleCopy} disabled={!llmOutput && !metrics} className="btn-secondary">
            Copy Results
          </button>
        </div>
      </div>

      {aiLoading && (
        <div className="card p-8 mt-4 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-slate-400">Analyzing HAR data with AI\u2026</p>
        </div>
      )}

      {aiError && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {aiError}
        </div>
      )}

      {llmOutput && !aiLoading && (
        <div className="card p-5 mt-4">
          <div id="llm-rendered" className="llm-output" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}

      {!metrics && (
        <div className="card p-8 mt-4 text-center">
          <p className="text-sm text-slate-500">Load a HAR file and analyze it first to enable AI analysis.</p>
        </div>
      )}
    </div>
  );
}
