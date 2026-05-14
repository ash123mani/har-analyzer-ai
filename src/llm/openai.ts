import OpenAI from 'openai';
import type { ILLMProvider, LLMConfig, LLMReport } from './provider.js';
import { parseReport } from './parser.js';

/** LLM provider using OpenAI's API */
export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';

  async generateReport(prompt: string, config: LLMConfig): Promise<LLMReport> {
    const client = new OpenAI({ apiKey: config.apiKey });

    const response = await client.chat.completions.create({
      model: config.model ?? 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a web performance expert. Analyze HAR data and return a structured report. Use markdown formatting.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content ?? '';
    return parseReport(content);
  }
}
