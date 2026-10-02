import dotenv from 'dotenv';
import { AIProvider } from './AIProvider';
import { OpenRouterProvider } from './openrouter';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { OllamaProvider } from './ollama';
import { LocalHeuristicProvider } from './localHeuristic';
import { AIProviderConfig, AIProviderType, PrivacyMode } from '../types';

dotenv.config();

export class AIProviderFactory {
  private static userOverrides: Partial<AIProviderConfig> = {};

  public static getConfig(): AIProviderConfig {
    return {
      provider: (this.userOverrides.provider || process.env.AI_PROVIDER || 'openrouter') as AIProviderType,
      privacyMode: (this.userOverrides.privacyMode || process.env.PRIVACY_MODE || 'allow_cloud') as PrivacyMode,
      openrouterApiKey: this.userOverrides.openrouterApiKey || process.env.OPENROUTER_API_KEY || '',
      openrouterModel: this.userOverrides.openrouterModel || process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free',
      openaiApiKey: this.userOverrides.openaiApiKey || process.env.OPENAI_API_KEY || '',
      openaiModel: this.userOverrides.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      geminiApiKey: this.userOverrides.geminiApiKey || process.env.GEMINI_API_KEY || '',
      geminiModel: this.userOverrides.geminiModel || process.env.GEMINI_MODEL || 'gemini-1.5-pro',
      ollamaUrl: this.userOverrides.ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434',
      ollamaModel: this.userOverrides.ollamaModel || process.env.OLLAMA_MODEL || 'deepseek-coder:6.7b'
    };
  }

  public static updateConfig(newConfig: Partial<AIProviderConfig>): AIProviderConfig {
    this.userOverrides = {
      ...this.userOverrides,
      ...newConfig
    };
    return this.getConfig();
  }

  public static getProvider(providerOverride?: AIProviderType): AIProvider {
    const config = this.getConfig();
    const providerType = providerOverride || config.provider;

    // Strict Privacy enforcement: If privacyMode is local_only, block cloud providers unless overridden
    if (config.privacyMode === 'local_only' && (providerType === 'openai' || providerType === 'gemini' || providerType === 'openrouter')) {
      throw new Error(
        `Privacy policy violation: Privacy mode is set to 'local_only'. Cloud provider '${providerType}' is blocked. Change privacy mode to 'allow_cloud' in settings to enable.`
      );
    }

    switch (providerType) {
      case 'openrouter':
        return new OpenRouterProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'gemini':
        return new GeminiProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      case 'local_heuristic':
      default:
        return new LocalHeuristicProvider(config);
    }
  }

  /**
   * Helper that attempts primary provider and falls back gracefully
   */
  public static async generateWithFallback(
    problem: any,
    systemPrompt: string,
    userPrompt: string
  ): Promise<any> {
    const config = this.getConfig();
    try {
      const provider = this.getProvider();
      return await provider.generateAnalysis(problem, systemPrompt, userPrompt);
    } catch (err: any) {
      console.warn(`[AI Provider Warning] Primary provider (${config.provider}) failed: ${err.message}.`);
      
      // If primary was OpenRouter and Gemini API key is present, try Gemini
      if (config.provider === 'openrouter' && config.geminiApiKey && config.privacyMode !== 'local_only') {
        try {
          console.log('[AI Provider] Attempting secondary provider (Gemini)...');
          const gemini = new GeminiProvider(config);
          return await gemini.generateAnalysis(problem, systemPrompt, userPrompt);
        } catch (geminiErr: any) {
          console.warn(`[AI Provider Warning] Secondary Gemini provider failed: ${geminiErr.message}`);
        }
      }

      console.warn(`Falling back to Local Heuristic Engine.`);
      const fallback = new LocalHeuristicProvider(config);
      return await fallback.generateAnalysis(problem, systemPrompt, userPrompt);
    }
  }
}
