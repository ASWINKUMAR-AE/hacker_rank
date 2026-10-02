export type ChallengeCategory = 'SQL' | 'React' | 'Linux Shell' | 'JavaScript' | 'Algorithms' | 'General';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface SampleTestCase {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestScoreResult {
  passed: boolean;
  score: number;
  maxScore: number;
  passedCount?: number;
  totalCount?: number;
  details: string;
  error?: string;
}

export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface ProblemImage {
  src: string;
  alt?: string;
  title?: string;
  base64?: string;
}

export interface ProblemPayload {
  title: string;
  statement: string;
  statementHtml?: string;
  images?: ProblemImage[];
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string[];
  examples?: SampleTestCase[];
  selectedLanguage?: string;
  existingCode?: string;
  category?: ChallengeCategory;
  url?: string;
  difficulty?: DifficultyLevel;
  errorFeedback?: string;
  previousAttempt?: {
    code: string;
    error: string;
    score: number;
  };
}

export interface SQLTableColumn {
  name: string;
  type: string;
  description?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

export interface SQLTableSchema {
  name: string;
  columns: SQLTableColumn[];
}

export interface SQLSchemaInfo {
  tables: SQLTableSchema[];
  relationships?: string[];
  targetDialect?: 'MySQL' | 'MS SQL Server' | 'Oracle' | 'PostgreSQL';
}

export interface ReactProjectComponent {
  name: string;
  file?: string;
  props?: string[];
  stateHooks?: string[];
  eventHandlers?: string[];
  existingImports?: string[];
}

export interface ReactProjectInfo {
  reactVersion?: string;
  components: ReactProjectComponent[];
  files?: Record<string, string>;
  requiredUiBehaviors: string[];
}

export interface ShellCommandInfo {
  requiredTools: string[];
  inputSource?: 'stdin' | 'file' | 'args';
  outputDestination?: 'stdout' | 'file';
  pipelineElements: string[];
  posixCompliant: boolean;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  rule?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  issues: ValidationIssue[];
}

export interface CodePatch {
  file: string;
  originalCode: string;
  modifiedCode: string;
  diff: string;
  changesSummary: string[];
  requiresApproval: boolean;
}

export interface AnalysisResult {
  category: ChallengeCategory;
  difficulty: DifficultyLevel;
  requirements: string[];
  constraints: string[];
  expected_output: string[];
  solution_strategy: string;
  generated_solution: string;
  explanation: string;
  edge_cases?: string[];
  schema_info?: SQLSchemaInfo;
  react_info?: ReactProjectInfo;
  shell_info?: ShellCommandInfo;
  patch?: CodePatch;
  validation: ValidationResult;
}

export type AIProviderType = 'openrouter' | 'ollama' | 'openai' | 'gemini' | 'local_heuristic';

export type PrivacyMode = 'local_only' | 'allow_cloud';

export interface AIProviderConfig {
  provider: AIProviderType;
  privacyMode: PrivacyMode;
  openrouterApiKey?: string;
  openrouterModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  ollamaUrl?: string;
  ollamaModel?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  timedOut?: boolean;
}
