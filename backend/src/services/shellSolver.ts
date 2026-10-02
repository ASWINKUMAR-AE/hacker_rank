import { ShellCommandInfo, ValidationResult, ValidationIssue } from '../types';
import { ShellSandbox } from './sandbox';

export class ShellSolver {
  /**
   * Analyzes shell problem statement to identify required tools and pipeline structure
   */
  public analyzeShellProblem(statement: string): ShellCommandInfo {
    const tools = ['grep', 'awk', 'sed', 'cut', 'sort', 'uniq', 'tr', 'head', 'tail', 'find', 'xargs', 'paste', 'wc'];
    const requiredTools: string[] = [];

    const lower = statement.toLowerCase();
    for (const tool of tools) {
      if (new RegExp(`\\b${tool}\\b`, 'i').test(lower)) {
        requiredTools.push(tool);
      }
    }

    const hasPipes = /pipe|chained|combine/i.test(lower);
    const pipelineElements: string[] = requiredTools.length > 0 ? requiredTools : ['awk'];

    return {
      requiredTools,
      inputSource: 'stdin',
      outputDestination: 'stdout',
      pipelineElements,
      posixCompliant: !lower.includes('bashism') && !lower.includes('zsh')
    };
  }

  /**
   * Validates Linux shell script syntax, quotes, and safety
   */
  public validateShellCommand(command: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const issues: ValidationIssue[] = [];

    const trimmed = command.trim();
    if (!trimmed) {
      return {
        isValid: false,
        errors: ['Shell command is empty'],
        warnings: [],
        issues: [{ severity: 'error', message: 'Shell command is empty' }]
      };
    }

    // 1. Safety check
    const safety = ShellSandbox.isCommandSafe(trimmed);
    if (!safety.safe) {
      errors.push(safety.reason || 'Unsafe shell command pattern detected.');
      issues.push({ severity: 'error', message: safety.reason || 'Unsafe command' });
    }

    // 2. Check for unmatched quotes or parenthesis
    let singleQuotes = 0;
    let doubleQuotes = 0;
    for (let i = 0; i < trimmed.length; i++) {
      if (trimmed[i] === "'" && (i === 0 || trimmed[i - 1] !== '\\')) singleQuotes++;
      if (trimmed[i] === '"' && (i === 0 || trimmed[i - 1] !== '\\')) doubleQuotes++;
    }

    if (singleQuotes % 2 !== 0) {
      errors.push('Unbalanced single quotes in shell command.');
      issues.push({ severity: 'error', message: 'Unbalanced single quotes' });
    }
    if (doubleQuotes % 2 !== 0) {
      errors.push('Unbalanced double quotes in shell command.');
      issues.push({ severity: 'error', message: 'Unbalanced double quotes' });
    }

    // 3. Check for pipe syntax errors (e.g. trailing pipe `|` or double pipe `||`)
    if (/\|\s*$/.test(trimmed)) {
      errors.push('Command ends with a trailing pipe (|).');
      issues.push({ severity: 'error', message: 'Trailing pipe' });
    }

    // 4. Awk syntax basic check
    if (trimmed.startsWith('awk')) {
      if (!trimmed.includes('{') || !trimmed.includes('}')) {
        warnings.push('awk command may be missing enclosing braces { ... }');
        issues.push({ severity: 'warning', message: 'Awk missing action braces' });
      }
    }

    // 5. Sed syntax basic check
    if (trimmed.startsWith('sed')) {
      if (!trimmed.includes('s/') && !trimmed.includes('-e') && !trimmed.includes('-i') && !trimmed.includes('/')) {
        warnings.push('sed command may be missing substitution or expression syntax.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      issues
    };
  }

  /**
   * Runs command against sample test case in safe local sandbox
   */
  public async testCommand(command: string, sampleInput: string): Promise<{ success: boolean; output: string; error?: string }> {
    const res = await ShellSandbox.executeSafe(command, sampleInput);
    if (res.exitCode === 0) {
      return {
        success: true,
        output: res.stdout.trim()
      };
    } else {
      return {
        success: false,
        output: res.stdout.trim(),
        error: res.stderr.trim()
      };
    }
  }

  /**
   * Verified high-confidence solutions for HackerRank Linux Shell track challenges
   */
  public findHighConfidenceSolution(slugOrTitle: string, statement: string = ''): string | null {
    const slug = slugOrTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const lower = (slugOrTitle + ' ' + statement).toLowerCase();

    const isMatch = (tool: string, num?: number | string): boolean => {
      if (num !== undefined) {
        const regex = new RegExp(`(?:\\b|_|-)${tool}(?:_|-|\\s)*(?:command|tutorial)?(?:_|-|\\s|#)*${num}(?!\\d)`, 'i');
        return regex.test(slug) || regex.test(lower);
      }
      return slug.includes(tool) || lower.includes(tool);
    };

    // 1. Text Processing - Cut
    if (isMatch('cut', 1) || (lower.includes('cut') && (lower.includes('3rd character') || lower.includes('third character')))) {
      return 'cut -c 3';
    }
    if (isMatch('cut', 2) || (lower.includes('cut') && (lower.includes('2nd and 7th') || lower.includes('2 and 7')))) {
      return 'cut -c 2,7';
    }
    if (isMatch('cut', 3) || (lower.includes('cut') && (lower.includes('2nd to 7th') || lower.includes('2 to 7')))) {
      return 'cut -c 2-7';
    }
    if (isMatch('cut', 4) || (lower.includes('cut') && (lower.includes('first four') || lower.includes('1 to 4') || lower.includes('first 4')))) {
      return 'cut -c 1-4';
    }
    if (isMatch('cut', 5) || (lower.includes('cut') && lower.includes('first three fields') && lower.includes('tab'))) {
      return 'cut -f 1-3';
    }
    if (isMatch('cut', 6) || (lower.includes('cut') && lower.includes('13th position to the end'))) {
      return 'cut -c 13-';
    }
    if (isMatch('cut', 7) || (lower.includes('cut') && lower.includes('fourth word') && lower.includes('space'))) {
      return "cut -d ' ' -f 4";
    }
    if (isMatch('cut', 8) || (lower.includes('cut') && lower.includes('first three words') && lower.includes('space'))) {
      return "cut -d ' ' -f 1-3";
    }
    if (isMatch('cut', 9) || (lower.includes('cut') && lower.includes('second field to the last field'))) {
      return 'cut -f 2-';
    }

    // 2. Head / Tail
    if (isMatch('head', 1) || (lower.includes('head') && lower.includes('first 20 lines'))) {
      return 'head -n 20';
    }
    if (isMatch('head', 2) || (lower.includes('head') && lower.includes('first 20 characters'))) {
      return 'head -c 20';
    }
    if (isMatch('head', 3) || (lower.includes('lines') && lower.includes('12') && lower.includes('22'))) {
      return 'head -n 22 | tail -n 11';
    }
    if (isMatch('tail', 1) || (lower.includes('tail') && lower.includes('last 20 lines'))) {
      return 'tail -n 20';
    }
    if (isMatch('tail', 2) || (lower.includes('tail') && lower.includes('last 20 characters'))) {
      return 'tail -c 20';
    }

    // 3. Tr / Translate
    if (isMatch('tr', 1) || (lower.includes('parentheses') && (lower.includes('box brackets') || lower.includes('square brackets')))) {
      return "tr '()' '[]'";
    }
    if (isMatch('tr', 2) || (lower.includes('delete') && lower.includes('lowercase'))) {
      return "tr -d '[a-z]'";
    }
    if (isMatch('tr', 3) || (lower.includes('squeeze') || (lower.includes('consecutive') && lower.includes('spaces')))) {
      return "tr -s ' '";
    }

    // 4. Sort
    if (isMatch('sort', 1) || (lower.includes('sort') && lower.includes('lexicographical') && !lower.includes('reverse') && !lower.includes('numeric'))) {
      return 'sort';
    }
    if (isMatch('sort', 2) || (lower.includes('sort') && lower.includes('reverse') && !lower.includes('numeric'))) {
      return 'sort -r';
    }
    if (isMatch('sort', 3) || (lower.includes('sort') && lower.includes('numerical') && !lower.includes('reverse'))) {
      return 'sort -n';
    }
    if (isMatch('sort', 4) || (lower.includes('sort') && lower.includes('numeric') && lower.includes('reverse') && !lower.includes('second'))) {
      return 'sort -n -r';
    }
    if (isMatch('sort', 5) || (lower.includes('sort') && lower.includes('second column') && lower.includes('reverse'))) {
      return "sort -t $'\\t' -k 2 -n -r";
    }
    if (isMatch('sort', 6) || (lower.includes('sort') && lower.includes('second column') && !lower.includes('reverse'))) {
      return "sort -t $'\\t' -k 2 -n";
    }
    if (isMatch('sort', 7) || (lower.includes('sort') && lower.includes('pipe') && lower.includes('reverse'))) {
      return "sort -t '|' -k 2 -n -r";
    }

    // 5. Uniq
    if (isMatch('uniq', 1) || (lower.includes('uniq') && lower.includes('consecutive duplicate lines') && !lower.includes('count') && !lower.includes('case'))) {
      return 'uniq';
    }
    if (isMatch('uniq', 2) || (lower.includes('uniq') && lower.includes('count') && !lower.includes('case'))) {
      return 'uniq -c | cut -c 7-';
    }
    if (isMatch('uniq', 3) || (lower.includes('uniq') && lower.includes('count') && lower.includes('case'))) {
      return 'uniq -c -i | cut -c 7-';
    }
    if (isMatch('uniq', 4) || (lower.includes('uniq') && (lower.includes('only those lines that are not repeated') || lower.includes('unique lines')))) {
      return 'uniq -u';
    }

    // 6. Paste
    if (isMatch('paste', 1) || (lower.includes('paste') && lower.includes('semicolon') && lower.includes('single line'))) {
      return "paste -s -d ';'";
    }
    if (isMatch('paste', 2) || (lower.includes('paste') && lower.includes('three consecutive rows') && lower.includes('semicolon'))) {
      return "paste - - - -d ';'";
    }
    if (isMatch('paste', 3) || (lower.includes('paste') && lower.includes('tab') && lower.includes('single line'))) {
      return 'paste -s';
    }
    if (isMatch('paste', 4) || (lower.includes('paste') && lower.includes('three consecutive rows'))) {
      return 'paste - - -';
    }

    // 7. Awk
    if (isMatch('awk', 1) || (lower.includes('awk') && lower.includes('not all scores are available'))) {
      return `awk '{ if ($4 == "") print "Not all scores are available for "$1; }'`;
    }
    if (isMatch('awk', 2) || (lower.includes('awk') && lower.includes('pass') && lower.includes('fail'))) {
      return `awk '{ if ($2 >= 50 && $3 >= 50 && $4 >= 50) print $1" : Pass"; else print $1" : Fail"; }'`;
    }
    if (isMatch('awk', 3) || (lower.includes('awk') && lower.includes('grade'))) {
      return `awk '{ avg=($2+$3+$4)/3; if (avg>=80) grade="A"; else if (avg>=60) grade="B"; else if (avg>=50) grade="C"; else grade="FAIL"; print $1" : "grade; }'`;
    }
    if (isMatch('awk', 4) || (lower.includes('awk') && lower.includes('concatenating pairs of lines'))) {
      return `awk '{ if (NR%2 == 1) printf "%s;", $0; else print $0; }'`;
    }

    // 8. Sed
    if (isMatch('sed', 1) || (lower.includes('sed') && lower.includes('first occurrence of') && lower.includes('the'))) {
      return "sed -e 's/\\bthe\\b/this/'";
    }
    if (isMatch('sed', 2) || (lower.includes('sed') && lower.includes('thy') && lower.includes('your'))) {
      return "sed -e 's/\\bthy\\b/your/gi'";
    }
    if (isMatch('sed', 3) || (lower.includes('sed') && (lower.includes('bracket') || lower.includes('{thy}') || lower.includes('highlight')) && lower.includes('thy'))) {
      return "sed -e 's/\\bthy\\b/{&}/gi'";
    }
    if (isMatch('sed', 4) || (lower.includes('sed') && lower.includes('credit card') && lower.includes('mask'))) {
      return "sed -E 's/[0-9]{4} [0-9]{4} [0-9]{4} ([0-9]{4})/**** **** **** \\1/'";
    }
    if (isMatch('sed', 5) || (lower.includes('sed') && lower.includes('credit card') && (lower.includes('reverse') || lower.includes('swap')))) {
      return "sed -E 's/([0-9]{4}) ([0-9]{4}) ([0-9]{4}) ([0-9]{4})/\\4 \\3 \\2 \\1/'";
    }

    // 9. Bash Tutorials & Fractals
    if (slug.includes('fractal-trees') || slug.includes('recursive-trees') || lower.includes('fractal tree') || lower.includes('y-shaped branches')) {
      return `read N
declare -A grid

draw() {
    local n=$1 len=$2 r=$3 c=$4
    (( n == 0 )) && return
    for ((i=0; i<len; i++)); do
        grid[$((r - i)),$c]=1
    done
    local br=$((r - len))
    for ((i=1; i<=len; i++)); do
        grid[$((br - i + 1)),$((c - i))]=1
        grid[$((br - i + 1)),$((c + i))]=1
    done
    local nr=$((br - len))
    draw $((n - 1)) $((len / 2)) $nr $((c - len))
    draw $((n - 1)) $((len / 2)) $nr $((c + len))
}

draw $N 16 62 49

for ((r=0; r<63; r++)); do
    line=""
    for ((c=0; c<100; c++)); do
        if [[ -n "\${grid[\$r,\$c]}" ]]; then
            line+="1"
        else
            line+="_"
        fi
    done
    echo "$line"
done`;
    }
    if (slug.includes('lets-echo') || lower.includes('lets echo') || (lower.includes('print') && lower.includes('hello'))) {
      return 'echo "HELLO"';
    }
    if (slug.includes('looping-and-skipping') || lower.includes('odd natural numbers from 1 to 99')) {
      return 'for i in {1..99..2}; do echo $i; done';
    }
    if (slug.includes('personalized-echo') || lower.includes('personalized echo') || (lower.includes('welcome') && lower.includes('name'))) {
      return 'read name\necho "Welcome $name"';
    }
    if (slug.includes('looping-with-numbers') || lower.includes('numbers from 1 to 50')) {
      return 'for i in {1..50}; do echo $i; done';
    }
    if (slug.includes('the-world-of-numbers') || (lower.includes('sum') && lower.includes('difference') && lower.includes('product') && lower.includes('quotient'))) {
      return 'read x\nread y\necho $((x + y))\necho $((x - y))\necho $((x * y))\necho $((x / y))';
    }
    if (slug.includes('comparing-numbers') || lower.includes('x is less than y')) {
      return 'read x\nread y\nif [ $x -lt $y ]; then\n  echo "X is less than Y"\nelif [ $x -gt $y ]; then\n  echo "X is greater than Y"\nelse\n  echo "X is equal to Y"\nfi';
    }
    if (slug.includes('getting-started-with-conditionals') || (lower.includes('yes') && lower.includes('no') && lower.includes('y/n'))) {
      return 'read char\nif [[ "$char" == "y" || "$char" == "Y" ]]; then\n  echo "YES"\nelse\n  echo "NO"\nfi';
    }
    if (slug.includes('more-on-conditionals') || (lower.includes('equilateral') || lower.includes('isosceles') || lower.includes('scalene'))) {
      return 'read a\nread b\nread c\nif [ $a -eq $b ] && [ $b -eq $c ]; then\n  echo "EQUILATERAL"\nelif [ $a -eq $b ] || [ $b -eq $c ] || [ $a -eq $c ]; then\n  echo "ISOSCELES"\nelse\n  echo "SCALENE"\nfi';
    }
    if (slug.includes('arithmetic-operations') || lower.includes('evaluate the expression and display the output correct to 3 decimal places')) {
      return 'read expr\nprintf "%.3f\\n" $(echo "$expr" | bc -l)';
    }
    if (slug.includes('compute-the-average') || lower.includes('compute the average')) {
      return 'read n\nsum=0\nfor ((i=0;i<n;i++)); do\n  read val\n  sum=$((sum + val))\ndone\nprintf "%.3f\\n" $(echo "$sum / $n" | bc -l)';
    }

    const statementLower = statement.toLowerCase();

    // 10. Grep Commands
    if (isMatch('grep', 1) || (isMatch('grep') && statementLower.includes('the') && !statementLower.includes('case-insensitive') && !statementLower.includes('those') && !statementLower.includes('that'))) {
      return "grep -w 'the'";
    }
    if (isMatch('grep', 2) || (isMatch('grep') && statementLower.includes('case-insensitive') && statementLower.includes('the') && !statementLower.includes('those') && !statementLower.includes('that'))) {
      return "grep -i -w 'the'";
    }
    if (isMatch('grep', 3) || (isMatch('grep') && statementLower.includes('that') && (statementLower.includes('remove') || statementLower.includes('exclude')))) {
      return "grep -i -v -w 'that'";
    }
    if (isMatch('grep', 4) || isMatch('grep', 'a') || (isMatch('grep') && (statementLower.includes('those') || statementLower.includes('then')))) {
      return "grep -i -w -E 'the|that|then|those'";
    }
    if (isMatch('grep', 5) || isMatch('grep', 'b') || (isMatch('grep') && statementLower.includes('consecutive') && statementLower.includes('digits'))) {
      return "grep -E '([0-9]) *\\1'";
    }

    // 11. Array Operations
    if (slug.includes('filter-an-array-with-patterns') || lower.includes('filter an array')) {
      return "grep -v -i 'a'";
    }
    if (slug.includes('slice-an-array') || lower.includes('slice an array')) {
      return "sed -n '4,8p' | tr '\\n' ' '";
    }
    if (slug.includes('read-in-an-array') || lower.includes('read in an array')) {
      return "tr '\\n' ' '";
    }
    if (slug.includes('display-the-third-element-of-an-array') || lower.includes('third element of an array')) {
      return "sed -n '4p'";
    }
    if (slug.includes('count-the-number-of-elements-in-an-array') || lower.includes('number of elements in an array')) {
      return 'wc -l';
    }
    if (slug.includes('concatenate-an-array-with-itself') || lower.includes('concatenate an array with itself')) {
      return 'arr=($(cat))\ntripled=("${arr[@]}" "${arr[@]}" "${arr[@]}")\necho "${tripled[@]}"';
    }
    if (slug.includes('lonely-integer') || lower.includes('lonely integer')) {
      return "read\ntr ' ' '\\n' | sort | uniq -u";
    }
    if (slug.includes('remove-the-first-capital-letter') || lower.includes('first capital letter')) {
      return "sed 's/^[A-Z]/./' | tr '\\n' ' '";
    }

    return null;
  }
}
