import axios from 'axios';
import { AIProvider } from './AIProvider';
import { ProblemPayload, AnalysisResult, AIProviderConfig } from '../types';
import { extractJsonFromAiResponse } from './openrouter';

export class GeminiProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super(config);
  }

  public getName(): string {
    return 'Google Gemini';
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
      throw new Error('Privacy Policy Violation: Local-Only mode is enabled. External Gemini API calls are blocked.');
    }

    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API Key is missing. Please set GEMINI_API_KEY in settings or .env');
    }

    const model = this.config.geminiModel || 'gemini-1.5-pro';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.geminiApiKey}`;

    const userParts: Array<Record<string, any>> = [{ text: userPrompt }];
    
    // Add image parts if available in problem
    if (problem.images && problem.images.length > 0) {
      for (const img of problem.images) {
        if (img.base64) {
          userParts.push({
            inlineData: {
              mimeType: 'image/png',
              data: img.base64.replace(/^data:image\/\w+;base64,/, '')
            }
          });
        }
      }
    }

    const response = await axios.post(
      endpoint,
      {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: 'user',
            parts: userParts
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      }
    );

    const candidates = response.data?.candidates;
    const text = candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Empty response received from Gemini API');
    }

    return extractJsonFromAiResponse(text);
  }

  public async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.config.privacyMode === 'local_only') {
      throw new Error('Privacy Policy Violation: Local-Only mode is enabled. External Gemini API calls are blocked.');
    }

    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API Key is missing.');
    }

    const model = this.config.geminiModel || 'gemini-1.5-pro';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.geminiApiKey}`;

    const response = await axios.post(
      endpoint,
      {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2 }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
