import { describe, it, expect } from 'vitest';
import { AIProviderFactory } from '../backend/src/ai/providerFactory';
import { LocalHeuristicProvider } from '../backend/src/ai/localHeuristic';

describe('AIProviderFactory & Privacy Policy', () => {
  it('should enforce local_only privacy policy and block cloud providers', () => {
    AIProviderFactory.updateConfig({ privacyMode: 'local_only', provider: 'local_heuristic' });
    expect(() => AIProviderFactory.getProvider('openrouter')).toThrow(/Privacy policy violation/);
    expect(() => AIProviderFactory.getProvider('openai')).toThrow(/Privacy policy violation/);
    expect(() => AIProviderFactory.getProvider('gemini')).toThrow(/Privacy policy violation/);
  });

  it('should allow OpenRouter in allow_cloud mode', () => {
    AIProviderFactory.updateConfig({ privacyMode: 'allow_cloud', provider: 'openrouter' });
    const provider = AIProviderFactory.getProvider('openrouter');
    expect(provider.getName()).toContain('OpenRouter');
    expect(provider.isLocal()).toBe(false);
  });

  it('should allow local providers in local_only mode', () => {
    AIProviderFactory.updateConfig({ privacyMode: 'local_only' });
    const local = AIProviderFactory.getProvider('local_heuristic');
    expect(local.isLocal()).toBe(true);
  });

  it('should produce structured results with local heuristic provider', async () => {
    const provider = new LocalHeuristicProvider(AIProviderFactory.getConfig());
    const res = await provider.generateAnalysis(
      {
        title: 'Weather Observation Station 1',
        statement: 'Query a list of CITY and STATE from the STATION table.',
        category: 'SQL'
      },
      '',
      ''
    );

    expect(res.category).toBe('SQL');
    expect(res.generated_solution).toContain('SELECT CITY, STATE');
  });
});
