import OpenAI from 'openai';
import type { LLMConfig, LLMReport } from '../types.js';
import type { LLMProvider } from '../interfaces.js';
import { parseReport } from './response.js';

export const openaiProvider: LLMProvider = async (prompt: string, config: LLMConfig): Promise<LLMReport> => {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

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

  return parseReport(response.choices[0]?.message?.content ?? '');
};
