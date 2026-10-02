import { describe, it, expect } from 'vitest';
import { SQLSolver } from '../backend/src/services/sqlSolver';

describe('SQLSolver', () => {
  const solver = new SQLSolver();

  it('should extract table names and columns from problem statement markdown', () => {
    const statement = `
      Query all columns for all American cities in the CITY table with populations larger than 100000.
      The CITY table is described as follows:
      | Field | Type |
      | ID | NUMBER |
      | NAME | VARCHAR2(17) |
      | COUNTRYCODE | VARCHAR2(3) |
      | DISTRICT | VARCHAR2(20) |
      | POPULATION | NUMBER |
    `;

    const schema = solver.extractSchema(statement);
    expect(schema.tables.length).toBeGreaterThan(0);
    const cityTable = schema.tables.find(t => t.name === 'CITY');
    expect(cityTable).toBeDefined();
    expect(cityTable?.columns.some(c => c.name === 'POPULATION')).toBe(true);
  });

  it('should validate valid SQL query', () => {
    const query = 'SELECT * FROM CITY WHERE COUNTRYCODE = \'USA\' AND POPULATION > 100000;';
    const result = solver.validateSQL(query);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should warn on missing GROUP BY when aggregates and non-aggregates are selected', () => {
    const query = 'SELECT CITY, COUNT(ID) FROM STATION;';
    const result = solver.validateSQL(query);
    expect(result.warnings.some(w => w.includes('GROUP BY'))).toBe(true);
  });

  it('should detect unmatched quotes as an error', () => {
    const query = "SELECT * FROM CITY WHERE COUNTRYCODE = 'USA;";
    const result = solver.validateSQL(query);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('quotation mark'))).toBe(true);
  });

  it('should return verified 100% score solutions for popular HackerRank challenges', () => {
    const solution1 = solver.findHighConfidenceSolution('revising-the-select-query-i');
    expect(solution1).toContain("SELECT * FROM CITY WHERE COUNTRYCODE = 'USA' AND POPULATION > 100000;");

    const solution2 = solver.findHighConfidenceSolution('weather-observation-station-5');
    expect(solution2).toContain('UNION ALL');

    const solution3 = solver.findHighConfidenceSolution('japanese-cities-attributes');
    expect(solution3).toContain("COUNTRYCODE = 'JPN'");

    const solutionStation1 = solver.findHighConfidenceSolution('weather-observation-station-1');
    expect(solutionStation1).toBe('SELECT CITY, STATE FROM STATION;');

    const solutionStation12 = solver.findHighConfidenceSolution('weather-observation-station-12');
    expect(solutionStation12).toContain("SELECT DISTINCT CITY FROM STATION WHERE CITY NOT REGEXP '^[aeiouAEIOU]' AND CITY NOT REGEXP '[aeiouAEIOU]$';");

    const solutionStation10 = solver.findHighConfidenceSolution('weather-observation-station-10');
    expect(solutionStation10).toContain("SELECT DISTINCT CITY FROM STATION WHERE CITY NOT REGEXP '[aeiouAEIOU]$';");

    const solutionBST = solver.findHighConfidenceSolution('binary-search-tree-1');
    expect(solutionBST).toContain("WHEN P IS NULL THEN 'Root'");
    expect(solutionBST).toContain("WHEN N IN (SELECT P FROM BST WHERE P IS NOT NULL) THEN 'Inner'");

    const solutionPADS = solver.findHighConfidenceSolution('the-pads');
    expect(solutionPADS).toContain("CONCAT(Name, '(', SUBSTR(Occupation, 1, 1), ')')");
  });
});
