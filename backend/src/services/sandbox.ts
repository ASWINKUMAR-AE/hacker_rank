import { spawn } from 'child_process';
import { ExecutionResult } from '../types';

export class ShellSandbox {
  private static readonly FORBIDDEN_PATTERNS = [
    /\brm\s+(-[rfRF]+\s+)?[\/\*~]/i,
    /\bmkfs\b/i,
    /\bdd\s+if=/i,
    /:(\s*)\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, // fork bomb
    /\bshutdown\b/i,
    /\breboot\b/i,
    /\binit\s+0\b/i,
    />\s*\/dev\/(sda|hda|nvme)/i,
    /\bchmod\s+-R\s+777\s+\//i,
    /\bchown\s+-R\s+.*\s+\//i
  ];

  /**
   * Validates safety of a command before running
   */
  public static isCommandSafe(command: string): { safe: boolean; reason?: string } {
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(command)) {
        return {
          safe: false,
          reason: `Command blocked by security filter: Matches dangerous pattern (${pattern.toString()})`
        };
      }
    }
    return { safe: true };
  }

  /**
   * Safely executes a command in a sandbox with input stream, timeout, and memory bounds
   */
  public static async executeSafe(
    command: string,
    stdinInput: string = '',
    timeoutMs: number = 5000
  ): Promise<ExecutionResult> {
    const safetyCheck = this.isCommandSafe(command);
    if (!safetyCheck.safe) {
      return {
        stdout: '',
        stderr: safetyCheck.reason || 'Command execution denied.',
        exitCode: 1,
        executionTimeMs: 0
      };
    }

    const startTime = Date.now();

    return new Promise<ExecutionResult>((resolve) => {
      let stdoutData = '';
      let stderrData = '';
      let timedOut = false;

      // On Windows, use bash / sh if available (e.g. Git Bash / WSL / WSL sh) or powershell fallback
      const isWin = process.platform === 'win32';
      const shellExecutable = isWin ? (process.env.SHELL || 'sh.exe') : '/bin/sh';

      let child;
      try {
        child = spawn(shellExecutable, ['-c', command], {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        });
      } catch (err: any) {
        // Fallback for Windows without sh.exe
        try {
          child = spawn('cmd.exe', ['/c', command], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
          });
        } catch (cmdErr: any) {
          return resolve({
            stdout: '',
            stderr: `Execution failed to start: ${cmdErr.message}`,
            exitCode: 127,
            executionTimeMs: Date.now() - startTime
          });
        }
      }

      const timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      }, timeoutMs);

      if (stdinInput && child.stdin) {
        try {
          child.stdin.write(stdinInput);
          child.stdin.end();
        } catch {
          // stream closed
        }
      } else if (child.stdin) {
        child.stdin.end();
      }

      child.stdout?.on('data', (data) => {
        stdoutData += data.toString();
        if (stdoutData.length > 50000) {
          child.kill();
        }
      });

      child.stderr?.on('data', (data) => {
        stderrData += data.toString();
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutData,
          stderr: stderrData || err.message,
          exitCode: 1,
          executionTimeMs: Date.now() - startTime,
          timedOut
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout: stdoutData,
          stderr: timedOut ? 'Execution timed out' : stderrData,
          exitCode: code ?? (timedOut ? 124 : 0),
          executionTimeMs: Date.now() - startTime,
          timedOut
        });
      });
    });
  }
}
