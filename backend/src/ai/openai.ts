import axios from 'axios';
import { AIProvider } from './AIProvider';
import { ProblemPayload, AnalysisResult, AIProviderConfig } from '../types';
import { extractJsonFromAiResponse } from './openrouter';

export class OpenAIProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super(config);
  }

  public getName(): string {
    return 'OpenAI';
  }

  public isLocal(): boolean {
    return false;
  }

  public async generateAnalysis(
    problem: ProblemPayload,
    systemPrompt: string,
    userPrompt: string
  ): Promise<Partial<AnalysisResult>> {
    if (this.config.privacyMode === 'local_only') {
      throw new Error('Privacy Policy Violation: Local-Only mode is enabled. External OpenAI API calls are blocked.');
    }

    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API Key is missing. Please set OPENAI_API_KEY in settings or .env');
    }

    const model = this.config.openaiModel || 'gpt-4o-mini';

    let userContent: any = userPrompt;
    if (problem.images && problem.images.length > 0) {
      const parts: any[] = [{ type: 'text', text: userPrompt }];
      for (const img of problem.images) {
        if (img.src.startsWith('http')) {
          parts.push({
            type: 'image_url',
            image_url: { url: img.src }
          });
        } else if (img.base64) {
          parts.push({
            type: 'image_url',
            image_url: { url: img.base64.startsWith('data:') ? img.base64 : `data:image/png;base64,${img.base64}` }
          });
        }
      }
      userContent = parts;
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.openaiApiKey}`
        },
        timeout: 45000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return extractJsonFromAiResponse(content);
  }

  public async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.config.privacyMode === 'local_only') {
      throw new Error('Privacy Policy Violation: Local-Only mode is enabled. External OpenAI API calls are blocked.');
    }

    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API Key is missing.');
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.config.openaiModel || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.openaiApiKey}`
        },
        timeout: 30000
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }
}
