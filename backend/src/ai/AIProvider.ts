import { ProblemPayload, AnalysisResult, AIProviderConfig } from '../types';

export interface PromptMessages {
  systemPrompt: string;
  userPrompt: string;
}

export abstract class AIProvider {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  public abstract getName(): string;
  public abstract isLocal(): boolean;

  /**
   * Generates a structured JSON analysis & solution according to structured prompt
   */
  public abstract generateAnalysis(
    problem: ProblemPayload,
    systemPrompt: string,
    userPrompt: string
  ): Promise<Partial<AnalysisResult>>;

  /**
   * Generates a plain text completion or explanation
   */
  public abstract generateCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string>;
}
