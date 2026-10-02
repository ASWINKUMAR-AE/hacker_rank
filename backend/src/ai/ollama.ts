import axios from 'axios';
import { AIProvider } from './AIProvider';
import { ProblemPayload, AnalysisResult, AIProviderConfig } from '../types';
import { extractJsonFromAiResponse } from './openrouter';

export class OllamaProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super(config);
  }

  public getName(): string {
    return `Ollama (${this.config.ollamaModel || 'default'})`;
  }

  public isLocal(): boolean {
    return true;
  }

  public async generateAnalysis(
    problem: ProblemPayload,
    systemPrompt: string,
    userPrompt: string
  ): Promise<Partial<AnalysisResult>> {
    const baseUrl = this.config.ollamaUrl || 'http://localhost:11434';
    const model = this.config.ollamaModel || 'deepseek-coder:6.7b';

    const response = await axios.post(
      `${baseUrl}/api/chat`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        format: 'json',
        stream: false,
        options: {
          temperature: 0.1
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      }
    );

    const content = response.data?.message?.content;
    if (!content) {
      throw new Error('Empty response received from Ollama');
    }

    return extractJsonFromAiResponse(content);
  }

  public async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    const baseUrl = this.config.ollamaUrl || 'http://localhost:11434';
    const model = this.config.ollamaModel || 'deepseek-coder:6.7b';

    const response = await axios.post(
      `${baseUrl}/api/chat`,
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: { temperature: 0.2 }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      }
    );

    return response.data?.message?.content || '';
  }
}
