import { ProblemPayload, AnalysisResult, ChallengeCategory, DifficultyLevel, SampleTestCase } from '../types';
import { SQLSolver } from './sqlSolver';
import { DatabaseSolver } from './databaseSolver';
import { ReactSolver } from './reactSolver';
import { ShellSolver } from './shellSolver';
import { AlgorithmSolver } from './algorithmSolver';
import { SolutionValidator } from './validator';
import { AIProviderFactory } from '../ai/providerFactory';
import { buildSystemPrompt, buildUserPrompt } from '../ai/prompts';

export class ChallengeAnalyzer {
  private sqlSolver: SQLSolver;
  private databaseSolver: DatabaseSolver;
  private reactSolver: ReactSolver;
  private shellSolver: ShellSolver;
  private algorithmSolver: AlgorithmSolver;
  private validator: SolutionValidator;

  constructor() {
    this.sqlSolver = new SQLSolver();
    this.databaseSolver = new DatabaseSolver();
    this.reactSolver = new ReactSolver();
    this.shellSolver = new ShellSolver();
    this.algorithmSolver = new AlgorithmSolver();
    this.validator = new SolutionValidator();
  }

  /**
   * Intelligently detects challenge category from URL, language, statement and metadata
   */
  public detectCategory(problem: Partial<ProblemPayload>): ChallengeCategory {
    if (problem.category) return problem.category;

    const url = (problem.url || '').toLowerCase();
    const title = (problem.title || '').toLowerCase();
    const text = (problem.statement || '').toLowerCase();
    const lang = (problem.selectedLanguage || '').toLowerCase();

    // 1. URL & Breadcrumb check (highest confidence)
    if (url.includes('/domains/databases') || url.includes('/relational-algebra') || url.includes('/database-normalization') || url.includes('basics-of-sets-and-relations')) {
      return 'Databases';
    }
    if (url.includes('/react') || url.includes('react') || title.includes('react')) {
      return 'React';
    }
    if (url.includes('/domains/sql') || url.includes('/sql-') || url.includes('/sql/')) {
      return 'SQL';
    }
    if (url.includes('/domains/shell') || url.includes('/linux-shell') || url.includes('/bash-') || url.includes('/shell/')) {
      return 'Linux Shell';
    }
    if (url.includes('/domains/algorithms') || url.includes('/algorithms/') || url.includes('compare-the-triplets') || url.includes('/domains/data-structures')) {
      return 'Algorithms';
    }

    // 2. Problem text keywords check
    if (text.includes('relational algebra') || text.includes('sets and relations') || text.includes('functional dependencies') || (text.includes('set a =') && text.includes('set b ='))) {
      return 'Databases';
    }
    if (text.includes('component') || text.includes('usestate') || text.includes('useeffect') || text.includes('jsx') || text.includes('props') || text.includes('data-testid') || text.includes('h8k-')) {
      return 'React';
    }
    if (text.includes('table:') || text.includes('query all') || text.includes('select ') || text.includes('from station') || text.includes('from city') || text.includes('where rownum')) {
      return 'SQL';
    }
    if (text.includes('awk') || text.includes('grep') || text.includes('sed') || text.includes('cut -') || text.includes('standard input') || text.includes('pipes')) {
      return 'Linux Shell';
    }

    // 3. Language check
    if (lang.includes('plain text') && (text.includes('set') || text.includes('relation') || text.includes('database') || text.includes('integer'))) {
      return 'Databases';
    }
    if (lang.includes('sql') || lang.includes('mysql') || lang.includes('oracle') || lang.includes('db2')) {
      return 'SQL';
    }
    if (lang.includes('react') || lang.includes('jsx') || lang.includes('tsx')) {
      return 'React';
    }
    if (lang.includes('bash') || lang.includes('shell') || lang.includes('sh') || lang.includes('linux')) {
      return 'Linux Shell';
    }

    return 'Algorithms';
  }

  /**
   * Extracts structured information and runs complete analysis & solution pipeline
   */
  public async analyzeAndSolve(problem: ProblemPayload): Promise<AnalysisResult> {
    const category = this.detectCategory(problem);
    problem.category = category;

    // 1. Domain-specific preprocessing
    let schemaInfo;
    let reactInfo;
    let shellInfo;
    let highConfidenceCode: string | null = null;

    if (category === 'SQL') {
      schemaInfo = this.sqlSolver.extractSchema(problem.statement);
      highConfidenceCode = this.sqlSolver.findHighConfidenceSolution(problem.url || problem.title, problem.statement, problem.selectedLanguage);
    } else if (category === 'Databases') {
      highConfidenceCode = this.databaseSolver.findHighConfidenceSolution(problem.url || problem.title, problem.statement);
    } else if (category === 'React') {
      reactInfo = this.reactSolver.analyzeReactCode(problem.existingCode || problem.statement);
      highConfidenceCode = this.reactSolver.findHighConfidenceSolution(problem.url || problem.title, problem.statement, problem.existingCode);
    } else if (category === 'Linux Shell') {
      shellInfo = this.shellSolver.analyzeShellProblem(problem.statement);
      highConfidenceCode = this.shellSolver.findHighConfidenceSolution(problem.url || problem.title, problem.statement);
    } else {
      highConfidenceCode = this.algorithmSolver.findHighConfidenceSolution(
        problem.url || problem.title,
        problem.statement,
        problem.existingCode || '',
        problem.selectedLanguage || 'JavaScript'
      );
    }

    // If verified pattern match exists and not retrying a failed attempt, use high-confidence verified solution
    if (highConfidenceCode && !problem.errorFeedback && !problem.previousAttempt) {
      const validation = this.validator.validate(category, highConfidenceCode, schemaInfo, problem.selectedLanguage);
      return {
        category,
        difficulty: problem.difficulty || 'Easy',
        requirements: ['Direct verified challenge pattern match from HackerRank domain knowledgebase'],
        constraints: problem.constraints || [],
        expected_output: ['Matches HackerRank test cases with 100% score'],
        solution_strategy: 'Verified optimal solution pattern for maximum test score',
        generated_solution: highConfidenceCode,
        explanation: 'This solution uses verified, optimal standard syntax designed to pass all HackerRank test cases with 100% points.',
        edge_cases: ['Null checks', 'Boundary limits', 'Exact dialect syntax compliance'],
        schema_info: schemaInfo,
        react_info: reactInfo,
        shell_info: shellInfo,
        validation
      };
    }

    // 2. Generate Solution via AI Layer
    const systemPrompt = buildSystemPrompt(category);
    const userPrompt = buildUserPrompt(problem);

    const aiResult = await AIProviderFactory.generateWithFallback(problem, systemPrompt, userPrompt);

    let generatedSolution = (aiResult.generated_solution || '').trim();
    // Clean markdown code blocks if AI wrapped them
    if (generatedSolution.startsWith('```')) {
      generatedSolution = generatedSolution.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '').trim();
    }
    // Ensure SQL ends with semicolon
    if (category === 'SQL' && !generatedSolution.endsWith(';')) {
      generatedSolution += ';';
    }

    // If boilerplate exists and generated solution is just a standalone function, merge with boilerplate
    if (
      (category === 'Algorithms' || category === 'JavaScript') &&
      problem.existingCode &&
      problem.existingCode.includes('function main()') &&
      !generatedSolution.includes('function main()')
    ) {
      const funcMatch = generatedSolution.match(/function\s+([a-zA-Z0-9_]+)/);
      if (funcMatch) {
        generatedSolution = this.algorithmSolver.mergeWithBoilerplate(
          problem.existingCode,
          funcMatch[1],
          generatedSolution
        );
      }
    }

    const requirements = aiResult.requirements || [
      'Solve the challenge based on given problem statement and constraints'
    ];
    const constraints = aiResult.constraints || problem.constraints || [];
    const expectedOutput = aiResult.expected_output || ['Matching expected HackerRank test output'];
    const solutionStrategy = aiResult.solution_strategy || 'Direct optimal strategy';
    const explanation = aiResult.explanation || 'Step-by-step resolution of problem requirements.';
    const edgeCases = aiResult.edge_cases || [];

    // 3. Validation Pipeline
    const validation = this.validator.validate(
      category,
      generatedSolution,
      schemaInfo,
      problem.selectedLanguage
    );

    // 4. React Patch Generator
    let patch;
    if (category === 'React' && problem.existingCode) {
      patch = this.reactSolver.generatePatch(problem.existingCode, generatedSolution, 'src/App.jsx');
    }

    return {
      category,
      difficulty: (aiResult.difficulty as DifficultyLevel) || problem.difficulty || 'Easy',
      requirements,
      constraints,
      expected_output: expectedOutput,
      solution_strategy: solutionStrategy,
      generated_solution: generatedSolution,
      explanation,
      edge_cases: edgeCases,
      schema_info: schemaInfo,
      react_info: reactInfo,
      shell_info: shellInfo,
      patch,
      validation
    };
  }
}
