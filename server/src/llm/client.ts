import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { config } from '../config.js';

/** Oletusmalli per tarjoaja, jos LLM_MODEL ei ole asetettu .env:ssä. */
const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-5',
  openai: 'gpt-5-mini',
} as const;

/**
 * Palauttaa AI SDK:n mallin sen mukaan mitä LLM_PROVIDER sanoo.
 * Uuden tarjoajan lisääminen = yksi case tähän + paketti package.jsoniin.
 */
export function getModel(): LanguageModel {
  const modelId = config.model || DEFAULT_MODELS[config.provider];

  switch (config.provider) {
    case 'anthropic': {
      if (!config.anthropicKey) {
        throw new Error('ANTHROPIC_API_KEY puuttuu .env:stä (LLM_PROVIDER=anthropic)');
      }
      return createAnthropic({ apiKey: config.anthropicKey })(modelId);
    }
    case 'openai': {
      if (!config.openaiKey) {
        throw new Error('OPENAI_API_KEY puuttuu .env:stä (LLM_PROVIDER=openai)');
      }
      return createOpenAI({ apiKey: config.openaiKey })(modelId);
    }
  }
}

export function describeModel(): string {
  return `${config.provider}:${config.model || DEFAULT_MODELS[config.provider]}`;
}
