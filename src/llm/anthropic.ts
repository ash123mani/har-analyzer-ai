import Anthropic from '@anthropic-ai/sdk';
import type { ILLMProvider, LLMConfig, LLMReport } from './provider.js';
import { parseReport } from './parser.js';

/** LLM provider using Anthropic's API */
export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';

  async generateReport(prompt: string, config: LLMConfig): Promise<LLMReport> {
    const client = new Anthropic({ apiKey: config.apiKey });

    const response = await client.messages.create({
      model: config.model ?? 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system:
        'You are a web performance expert. Analyze HAR data and return a structured report. Use markdown formatting.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content.find((b) => b.type === 'text')?.text ?? '';
    return parseReport(content);
  }
}
