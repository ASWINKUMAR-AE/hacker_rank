import axios from 'axios';
import { AIProvider } from './AIProvider';
import { ProblemPayload, AnalysisResult, AIProviderConfig } from '../types';

export function extractJsonFromAiResponse(content: string): any {
  if (!content || typeof content !== 'string') {
    throw new Error('AI returned empty response content');
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(content.trim());
  } catch {}

  // 2. Extract from markdown code fence ```json ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    try {
      return JSON.parse(match[1].trim());
    } catch {}
  }

  // 3. Extract outermost balanced JSON object { ... }
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSub = content.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSub.trim());
    } catch {}
  }

  throw new Error(`Could not parse valid JSON from AI response. Snippet: ${content.substring(0, 200)}`);
}

export class OpenRouterProvider extends AIProvider {
  constructor(config: AIProviderConfig) {
    super(config);
  }

  public getName(): string {
    return `OpenRouter (${this.config.openrouterModel || 'default'})`;
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
      throw new Error(
        "Privacy Policy Violation: Local-Only mode is enabled. OpenRouter API calls are blocked. Change PRIVACY_MODE to 'allow_cloud' in settings."
      );
    }

    if (!this.config.openrouterApiKey) {
      throw new Error('OpenRouter API Key is missing. Please configure OPENROUTER_API_KEY in .env or settings.');
    }

    const primaryModel = this.config.openrouterModel || 'meta-llama/llama-3.3-70b-instruct:free';
    const candidateModels = [
      primaryModel,
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'mistralai/mistral-small-24b-instruct-2501:free',
      'deepseek/deepseek-chat:free',
      'cognitivecomputations/dolphin3.0-r1-mistral-24b:free'
    ].filter((m, i, arr) => arr.indexOf(m) === i);

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

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent }
            ],
            temperature: 0.1
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.config.openrouterApiKey}`,
              'HTTP-Referer': 'https://hackerrank.assistant.local',
              'X-Title': 'HackerRank Practice Assistant'
            },
            timeout: 60000
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (content) {
          return extractJsonFromAiResponse(content);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[OpenRouter] Model '${model}' failed: ${err.response?.data?.error?.message || err.message}. Trying next candidate model...`);
      }
    }

    throw new Error(`All OpenRouter models failed. Last error: ${lastError?.message || 'Unknown'}`);
  }

  public async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    if (this.config.privacyMode === 'local_only') {
      throw new Error('Privacy Policy Violation: Local-Only mode is enabled. OpenRouter API calls are blocked.');
    }

    if (!this.config.openrouterApiKey) {
      throw new Error('OpenRouter API Key is missing.');
    }

    const model = this.config.openrouterModel || 'meta-llama/llama-3.3-70b-instruct:free';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.openrouterApiKey}`,
          'HTTP-Referer': 'https://hackerrank.assistant.local',
          'X-Title': 'HackerRank Practice Assistant'
        },
        timeout: 45000
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }
}
