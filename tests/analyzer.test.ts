import { describe, it, expect, beforeEach } from 'vitest';
import { ChallengeAnalyzer } from '../backend/src/services/challengeAnalyzer';
import { AIProviderFactory } from '../backend/src/ai/providerFactory';
import { ProblemPayload } from '../backend/src/types';

describe('ChallengeAnalyzer', () => {
  const analyzer = new ChallengeAnalyzer();

  beforeEach(() => {
    AIProviderFactory.updateConfig({ provider: 'local_heuristic', privacyMode: 'local_only' });
  });

  it('should detect category from URL and language metadata', () => {
    expect(analyzer.detectCategory({ selectedLanguage: 'MySQL' })).toBe('SQL');
    expect(analyzer.detectCategory({ url: 'https://www.hackerrank.com/domains/sql' })).toBe('SQL');
    expect(analyzer.detectCategory({ statement: 'Create a React component that renders a button' })).toBe('React');
    expect(analyzer.detectCategory({ statement: 'Use cut -c 2-7 on standard input' })).toBe('Linux Shell');
  });

  it('should execute end-to-end analysis and produce structured output', async () => {
    const problem: ProblemPayload = {
      title: 'Revising the Select Query I',
      statement: 'Query all columns for all American cities in the CITY table with populations larger than 100000. The CountryCode for America is USA.',
      selectedLanguage: 'MySQL'
    };

    const result = await analyzer.analyzeAndSolve(problem);
    expect(result.category).toBe('SQL');
    expect(result.generated_solution).toContain('SELECT');
    expect(result.generated_solution).toContain('CITY');
    expect(result.validation.isValid).toBe(true);
    expect(result.explanation.length).toBeGreaterThan(10);
  });
});
