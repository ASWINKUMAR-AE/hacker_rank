import { describe, it, expect, beforeEach } from 'vitest';
import { AlgorithmSolver } from '../backend/src/services/algorithmSolver';
import { ChallengeAnalyzer } from '../backend/src/services/challengeAnalyzer';
import { AIProviderFactory } from '../backend/src/ai/providerFactory';

describe('AlgorithmSolver & Compare the Triplets resolution', () => {
  const solver = new AlgorithmSolver();
  const analyzer = new ChallengeAnalyzer();

  beforeEach(() => {
    AIProviderFactory.updateConfig({ provider: 'local_heuristic', privacyMode: 'local_only' });
  });

  it('should find high confidence solution for Compare the Triplets in JavaScript', () => {
    const existingBoilerplate = `'use strict';

const fs = require('fs');

process.stdin.resume();
process.stdin.setEncoding('utf-8');

let inputString = '';
let currentLine = 0;

process.stdin.on('data', function(inputStdin) {
    inputString += inputStdin;
});

process.stdin.on('end', function() {
    inputString = inputString.split('\\n');
    main();
});

function readLine() {
    return inputString[currentLine++];
}

/*
 * Complete the 'compareTriplets' function below.
 *
 * The function is expected to return an INTEGER_ARRAY.
 * The function accepts following parameters:
 *  1. INTEGER_ARRAY a
 *  2. INTEGER_ARRAY b
 */

function compareTriplets(a, b) {
    // Write your code here

}

function main() {
    const ws = fs.createWriteStream(process.env.OUTPUT_PATH);
    const a = readLine().replace(/\\s+$/g, '').split(' ').map(aTemp => parseInt(aTemp, 10));
    const b = readLine().replace(/\\s+$/g, '').split(' ').map(bTemp => parseInt(bTemp, 10));
    const result = compareTriplets(a, b);
    ws.write(result.join(' ') + '\\n');
    ws.end();
}`;

    const solution = solver.findHighConfidenceSolution(
      'compare-the-triplets',
      'The rating for Alice is triplet a, Bob is triplet b. Calculate comparison points.',
      existingBoilerplate,
      'JavaScript (Node.js)'
    );

    expect(solution).toBeDefined();
    expect(solution).toContain('function compareTriplets(a, b)');
    expect(solution).toContain('alice++');
    expect(solution).toContain('bob++');
    expect(solution).toContain('return [alice, bob];');
    // Ensure boilerplate I/O is preserved
    expect(solution).toContain('function main()');
    expect(solution).toContain('fs.createWriteStream');
  });

  it('should find high confidence solution for Compare the Triplets in Python', () => {
    const solution = solver.findHighConfidenceSolution(
      'compare-the-triplets',
      'Alice and Bob comparison',
      '',
      'Python 3'
    );

    expect(solution).toContain('def compareTriplets(a, b):');
    expect(solution).toContain('return [alice, bob]');
  });

  it('should solve Compare the Triplets end-to-end via ChallengeAnalyzer', async () => {
    const problem = {
      title: 'Compare the Triplets',
      url: 'https://www.hackerrank.com/challenges/compare-the-triplets/problem',
      statement: `Alice and Bob each created one problem for HackerRank. A reviewer rates the two challenges, awarding points on a scale from 1 to 100 for three categories: problem clarity, originality, and difficulty.
The rating for Alice's challenge is the triplet a = (a[0], a[1], a[2]), and the rating for Bob's challenge is the triplet b = (b[0], b[1], b[2]).
If a[i] > b[i], then Alice is awarded 1 point.
If a[i] < b[i], then Bob is awarded 1 point.
If a[i] = b[i], then neither person receives a point.`,
      selectedLanguage: 'JavaScript (Node.js)',
      existingCode: `function compareTriplets(a, b) {\n    // Write your code here\n}\n\nfunction main() {\n}`
    };

    const res = await analyzer.analyzeAndSolve(problem);
    expect(res.category).toBe('Algorithms');
    expect(res.generated_solution).toContain('compareTriplets');
    expect(res.generated_solution).toContain('return [alice, bob]');
    expect(res.generated_solution).not.toContain('function solve(input)');
    expect(res.validation.isValid).toBe(true);
  });
});
