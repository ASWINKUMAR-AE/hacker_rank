import { SQLSolver } from './sqlSolver';
import { DatabaseSolver } from './databaseSolver';
import { ReactSolver } from './reactSolver';
import { ShellSolver } from './shellSolver';
import { AlgorithmSolver } from './algorithmSolver';
import { ChallengeCategory, ValidationResult, SQLSchemaInfo } from '../types';

export class SolutionValidator {
  private sqlSolver: SQLSolver;
  private databaseSolver: DatabaseSolver;
  private reactSolver: ReactSolver;
  private shellSolver: ShellSolver;
  private algorithmSolver: AlgorithmSolver;

  constructor() {
    this.sqlSolver = new SQLSolver();
    this.databaseSolver = new DatabaseSolver();
    this.reactSolver = new ReactSolver();
    this.shellSolver = new ShellSolver();
    this.algorithmSolver = new AlgorithmSolver();
  }

  public validate(
    category: ChallengeCategory,
    solution: string,
    schema?: SQLSchemaInfo,
    dialect?: string
  ): ValidationResult {
    switch (category) {
      case 'SQL':
        return this.sqlSolver.validateSQL(solution, schema, dialect);
      case 'Databases':
        return this.databaseSolver.validateDatabaseAnswer(solution);
      case 'React':
        return this.reactSolver.validateReactCode(solution);
      case 'Linux Shell':
        return this.shellSolver.validateShellCommand(solution);
      case 'Algorithms':
      case 'JavaScript':
      case 'General':
      default:
        return this.algorithmSolver.validateAlgorithmCode(solution, dialect);
    }
  }
}
