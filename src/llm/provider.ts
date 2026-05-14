/** Configuration for an LLM provider */
export interface LLMConfig {
  apiKey: string;
  model?: string;
}

/** Structured report returned by the LLM */
export interface LLMReport {
  summary: string;
  criticalIssues: string;
  findings: string;
  estimatedImprovement: string;
}

/** AI provider that generates performance reports from HAR analysis */
export interface ILLMProvider {
  readonly name: string;
  /** Send prompt to LLM and return structured report */
  generateReport(prompt: string, config: LLMConfig): Promise<LLMReport>;
}
