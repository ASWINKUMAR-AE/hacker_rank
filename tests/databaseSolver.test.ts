import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSolver } from '../backend/src/services/databaseSolver';
import { ChallengeAnalyzer } from '../backend/src/services/challengeAnalyzer';
import { AIProviderFactory } from '../backend/src/ai/providerFactory';

describe('DatabaseSolver & Relational Algebra resolution', () => {
  const solver = new DatabaseSolver();
  const analyzer = new ChallengeAnalyzer();

  beforeEach(() => {
    AIProviderFactory.updateConfig({ provider: 'local_heuristic', privacyMode: 'local_only' });
  });

  it('should solve Basics of Sets and Relations #1 (Union: A U B)', () => {
    const res = solver.findHighConfidenceSolution(
      'basics-of-sets-and-relations-1',
      'Set A = {1,2,3,4,5,6}, Set B = {2,3,4,5,6,7,8}. How many elements are present in A U B?'
    );
    expect(res).toBe('8');
  });

  it('should solve Basics of Sets and Relations #2 (Intersection: A ∩ B)', () => {
    const res = solver.findHighConfidenceSolution(
      'basics-of-sets-and-relations-2',
      'Set A = {1,2,3,4,5,6}, Set B = {2,3,4,5,6,7,8}. How many elements are present in A ∩ B?'
    );
    expect(res).toBe('5');
  });

  it('should solve Basics of Sets and Relations #3 (Difference: A - B)', () => {
    const res = solver.findHighConfidenceSolution(
      'basics-of-sets-and-relations-3',
      'Set A = {1,2,3,4,5,6}, Set B = {2,3,4,5,6,7,8}. How many elements are present in A - B?'
    );
    expect(res).toBe('1');
  });

  it('should solve Basics of Sets and Relations #5 (Cartesian Product)', () => {
    const res = solver.findHighConfidenceSolution(
      'basics-of-sets-and-relations-5',
      'Set A = {1,2,3,4,5,6}, Set B = {2,3,4,5,6,7,8}. What is the total number of ordered pairs in Cartesian Product A x B?'
    );
    expect(res).toBe('42');
  });

  it('should analyze and solve Databases challenge end-to-end via ChallengeAnalyzer', async () => {
    const problem = {
      title: 'Basics of Sets and Relations #1',
      url: 'https://www.hackerrank.com/challenges/basics-of-sets-and-relations-1/problem',
      statement: `You are given two sets.
Set A = {1,2,3,4,5,6}
Set B = {2,3,4,5,6,7,8}
How many elements are present in A U B?
Only enter the correct integer in the editor below. Do not include any extra spaces, tabs or newlines.`,
      selectedLanguage: 'Plain Text'
    };

    const res = await analyzer.analyzeAndSolve(problem);
    expect(res.category).toBe('Databases');
    expect(res.generated_solution).toBe('8');
    expect(res.validation.isValid).toBe(true);
  });
});
