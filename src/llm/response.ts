import type { LLMReport } from '../types.js';

function extractSection(text: string, title: string, nextTitle?: string): string {
  const startMarker = `**${title}**`;
  const start = text.indexOf(startMarker);
  if (start === -1) return '';

  let end: number;
  if (nextTitle) {
    const nextMarker = `**${nextTitle}**`;
    end = text.indexOf(nextMarker, start + startMarker.length);
  } else {
    end = text.length;
  }

  return text.slice(start + startMarker.length, end).trim();
}

export function parseReport(content: string): LLMReport {
  return {
    summary: extractSection(content, 'Executive Summary', 'Critical Issues'),
    criticalIssues: extractSection(content, 'Critical Issues', 'All Findings'),
    findings: extractSection(content, 'All Findings', 'Estimated Improvement'),
    estimatedImprovement: extractSection(content, 'Estimated Improvement'),
  };
}
