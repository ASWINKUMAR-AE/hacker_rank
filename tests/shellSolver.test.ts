import { describe, it, expect } from 'vitest';
import { ShellSolver } from '../backend/src/services/shellSolver';
import { ShellSandbox } from '../backend/src/services/sandbox';

describe('ShellSolver', () => {
  const solver = new ShellSolver();

  it('should detect required tools from problem description', () => {
    const statement = 'Given a text file, use cut and sort along with uniq to print unique lines.';
    const info = solver.analyzeShellProblem(statement);
    expect(info.requiredTools).toContain('cut');
    expect(info.requiredTools).toContain('sort');
    expect(info.requiredTools).toContain('uniq');
  });

  it('should block dangerous shell commands in sandbox security filter', () => {
    expect(ShellSandbox.isCommandSafe('rm -rf /').safe).toBe(false);
    expect(ShellSandbox.isCommandSafe('mkfs /dev/sda1').safe).toBe(false);
    expect(ShellSandbox.isCommandSafe(':(){ :|:& };:').safe).toBe(false);
    expect(ShellSandbox.isCommandSafe('awk "{print $1}"').safe).toBe(true);
    expect(ShellSandbox.isCommandSafe('cut -d " " -f 1').safe).toBe(true);
  });

  it('should validate quote balance in shell commands', () => {
    const unbalanced = "awk '{print $1}";
    const result = solver.validateShellCommand(unbalanced);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('quotes'))).toBe(true);
  });

  it('should return verified recursive tree solution for fractal-trees-all challenge', () => {
    const solution = solver.findHighConfidenceSolution('fractal-trees-all', 'Creating a Fractal Tree from Y-shaped branches');
    expect(solution).not.toBeNull();
    expect(solution).toContain('draw');
    expect(solution).toContain('grid');
  });

  it('should match full HackerRank URL slugs for sed challenges 1 through 5', () => {
    expect(solver.findHighConfidenceSolution('text-processing-in-linux-the-sed-command-1')).toBe("sed -e 's/\\bthe\\b/this/'");
    expect(solver.findHighConfidenceSolution('text-processing-in-linux-the-sed-command-2')).toBe("sed -e 's/\\bthy\\b/your/gi'");
    expect(solver.findHighConfidenceSolution('text-processing-in-linux-the-sed-command-3')).toBe("sed -e 's/\\bthy\\b/{&}/gi'");
    expect(solver.findHighConfidenceSolution('text-processing-in-linux-the-sed-command-4')).toBe("sed -E 's/[0-9]{4} [0-9]{4} [0-9]{4} ([0-9]{4})/**** **** **** \\1/'");
    expect(solver.findHighConfidenceSolution('text-processing-in-linux-the-sed-command-5')).toBe("sed -E 's/([0-9]{4}) ([0-9]{4}) ([0-9]{4}) ([0-9]{4})/\\4 \\3 \\2 \\1/'");
  });

  it('should match full HackerRank URL slugs for cut, sort, uniq, paste, awk, and grep challenges', () => {
    expect(solver.findHighConfidenceSolution('text-processing-in-linux---the-cut-command-1')).toBe('cut -c 3');
    expect(solver.findHighConfidenceSolution('text-processing-in-linux---the-cut-command-3')).toBe('cut -c 2-7');
    expect(solver.findHighConfidenceSolution('text-processing-in-linux---the-sort-command-5')).toBe("sort -t $'\\t' -k 2 -n -r");
    expect(solver.findHighConfidenceSolution('text-processing-in-linux---the-uniq-command-2')).toBe('uniq -c | cut -c 7-');
    expect(solver.findHighConfidenceSolution('text-processing-in-linux---paste-1')).toBe("paste -s -d ';'");
    expect(solver.findHighConfidenceSolution('text-processing-in-linux---the-awk-command-1')).toContain('Not all scores');
    expect(solver.findHighConfidenceSolution('text-processing-in-linux-the-grep-command-1')).toBe("grep -w 'the'");
    expect(solver.findHighConfidenceSolution('text-processing-in-linux-the-grep-command-5')).toBe("grep -E '([0-9]) *\\1'");
  });
});
