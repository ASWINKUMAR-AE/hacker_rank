import { ValidationResult, ValidationIssue } from '../types';

export class AlgorithmSolver {
  /**
   * Merges a generated function implementation into existing HackerRank boilerplate code
   */
  public mergeWithBoilerplate(
    existingCode: string,
    functionName: string,
    functionImplementation: string
  ): string {
    if (!existingCode || existingCode.trim().length === 0) {
      return functionImplementation;
    }

    const trimmedImp = functionImplementation.trim();

    // 1. Check if existing code already has function definition for functionName
    // Regex matches: function compareTriplets(...) { ... } or const compareTriplets = (...) => { ... }
    const jsFuncRegex = new RegExp(
      `function\\s+${functionName}\\s*\\([^{]*\\)\\s*\\{[\\s\\S]*?\\n\\}`,
      'm'
    );

    if (jsFuncRegex.test(existingCode)) {
      return existingCode.replace(jsFuncRegex, trimmedImp);
    }

    // 2. Check for Python def functionName(...): ...
    const pyFuncRegex = new RegExp(
      `def\\s+${functionName}\\s*\\([^)]*\\):[\\s\\S]*?(?=\\n(?:def|if __name__|$))`,
      'm'
    );
    if (pyFuncRegex.test(existingCode)) {
      return existingCode.replace(pyFuncRegex, trimmedImp + '\n');
    }

    // 3. Check for placeholder comment: /* Complete the 'functionName' function below. ... */
    const placeholderCommentRegex = new RegExp(
      `/\\*\\s*\\*\\s*Complete the '${functionName}' function below\\.[\\s\\S]*?\\*/[\\s\\S]*?(?=\\nfunction main|\\nif __name__|$)`,
      'm'
    );
    if (placeholderCommentRegex.test(existingCode)) {
      return existingCode.replace(placeholderCommentRegex, trimmedImp + '\n');
    }

    // 4. If function implementation is a full file (contains main/process.stdin), return it directly
    if (trimmedImp.includes('function main()') || trimmedImp.includes('if __name__ ==')) {
      return trimmedImp;
    }

    // 5. If no existing match, replace the function stub or prepend before main()
    if (existingCode.includes('function main()')) {
      return existingCode.replace('function main()', `${trimmedImp}\n\nfunction main()`);
    }

    return trimmedImp;
  }

  /**
   * Verified high-confidence solutions for common HackerRank Algorithms track challenges
   */
  public findHighConfidenceSolution(
    slugOrTitle: string,
    statement: string = '',
    existingCode: string = '',
    language: string = 'JavaScript'
  ): string | null {
    const slug = slugOrTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const lower = (slugOrTitle + ' ' + statement).toLowerCase();
    const isPython = /python/i.test(language);

    // 1. Compare the Triplets
    if (
      slug.includes('compare-the-triplets') ||
      slug.includes('compare-triplets') ||
      (lower.includes('compare') && lower.includes('triplet') && lower.includes('alice') && lower.includes('bob'))
    ) {
      if (isPython) {
        const pyFunc = `def compareTriplets(a, b):
    alice = sum(1 for i in range(3) if a[i] > b[i])
    bob = sum(1 for i in range(3) if a[i] < b[i])
    return [alice, bob]`;
        return this.mergeWithBoilerplate(existingCode, 'compareTriplets', pyFunc);
      } else {
        const jsFunc = `function compareTriplets(a, b) {
    let alice = 0;
    let bob = 0;
    for (let i = 0; i < 3; i++) {
        if (a[i] > b[i]) alice++;
        else if (a[i] < b[i]) bob++;
    }
    return [alice, bob];
}`;
        return this.mergeWithBoilerplate(existingCode, 'compareTriplets', jsFunc);
      }
    }

    // 2. Simple Array Sum
    if (
      slug.includes('simple-array-sum') ||
      (lower.includes('simple array sum') || (lower.includes('sum of the elements') && lower.includes('array of integers')))
    ) {
      if (isPython) {
        const pyFunc = `def simpleArraySum(ar):
    return sum(ar)`;
        return this.mergeWithBoilerplate(existingCode, 'simpleArraySum', pyFunc);
      } else {
        const jsFunc = `function simpleArraySum(ar) {
    return ar.reduce((acc, val) => acc + val, 0);
}`;
        return this.mergeWithBoilerplate(existingCode, 'simpleArraySum', jsFunc);
      }
    }

    // 3. A Very Big Sum
    if (
      slug.includes('a-very-big-sum') ||
      (lower.includes('a very big sum') || lower.includes('very big sum'))
    ) {
      if (isPython) {
        const pyFunc = `def aVeryBigSum(ar):
    return sum(ar)`;
        return this.mergeWithBoilerplate(existingCode, 'aVeryBigSum', pyFunc);
      } else {
        const jsFunc = `function aVeryBigSum(ar) {
    return ar.reduce((acc, val) => acc + val, 0);
}`;
        return this.mergeWithBoilerplate(existingCode, 'aVeryBigSum', jsFunc);
      }
    }

    // 4. Diagonal Difference
    if (
      slug.includes('diagonal-difference') ||
      lower.includes('diagonal difference') ||
      (lower.includes('square matrix') && lower.includes('absolute difference between the sums of its diagonals'))
    ) {
      if (isPython) {
        const pyFunc = `def diagonalDifference(arr):
    n = len(arr)
    d1 = sum(arr[i][i] for i in range(n))
    d2 = sum(arr[i][n - 1 - i] for i in range(n))
    return abs(d1 - d2)`;
        return this.mergeWithBoilerplate(existingCode, 'diagonalDifference', pyFunc);
      } else {
        const jsFunc = `function diagonalDifference(arr) {
    const n = arr.length;
    let d1 = 0;
    let d2 = 0;
    for (let i = 0; i < n; i++) {
        d1 += arr[i][i];
        d2 += arr[i][n - 1 - i];
    }
    return Math.abs(d1 - d2);
}`;
        return this.mergeWithBoilerplate(existingCode, 'diagonalDifference', jsFunc);
      }
    }

    // 5. Plus Minus
    if (
      slug.includes('plus-minus') ||
      lower.includes('plus minus') ||
      (lower.includes('ratios of its elements that are positive, negative, and zero'))
    ) {
      if (isPython) {
        const pyFunc = `def plusMinus(arr):
    n = len(arr)
    pos = sum(1 for x in arr if x > 0)
    neg = sum(1 for x in arr if x < 0)
    zero = sum(1 for x in arr if x == 0)
    print(f"{pos / n:.6f}")
    print(f"{neg / n:.6f}")
    print(f"{zero / n:.6f}")`;
        return this.mergeWithBoilerplate(existingCode, 'plusMinus', pyFunc);
      } else {
        const jsFunc = `function plusMinus(arr) {
    const n = arr.length;
    let pos = 0, neg = 0, zero = 0;
    for (const x of arr) {
        if (x > 0) pos++;
        else if (x < 0) neg++;
        else zero++;
    }
    console.log((pos / n).toFixed(6));
    console.log((neg / n).toFixed(6));
    console.log((zero / n).toFixed(6));
}`;
        return this.mergeWithBoilerplate(existingCode, 'plusMinus', jsFunc);
      }
    }

    // 6. Staircase
    if (
      slug.includes('staircase') ||
      (lower.includes('staircase') && lower.includes('base and height are both equal to'))
    ) {
      if (isPython) {
        const pyFunc = `def staircase(n):
    for i in range(1, n + 1):
        print(' ' * (n - i) + '#' * i)`;
        return this.mergeWithBoilerplate(existingCode, 'staircase', pyFunc);
      } else {
        const jsFunc = `function staircase(n) {
    for (let i = 1; i <= n; i++) {
        console.log(' '.repeat(n - i) + '#'.repeat(i));
    }
}`;
        return this.mergeWithBoilerplate(existingCode, 'staircase', jsFunc);
      }
    }

    // 7. Mini-Max Sum
    if (
      slug.includes('mini-max-sum') ||
      slug.includes('min-max-sum') ||
      (lower.includes('mini-max sum') || lower.includes('five positive integers') && lower.includes('minimum and maximum'))
    ) {
      if (isPython) {
        const pyFunc = `def miniMaxSum(arr):
    arr.sort()
    total = sum(arr)
    print(f"{total - arr[-1]} {total - arr[0]}")`;
        return this.mergeWithBoilerplate(existingCode, 'miniMaxSum', pyFunc);
      } else {
        const jsFunc = `function miniMaxSum(arr) {
    arr.sort((a, b) => a - b);
    const total = arr.reduce((acc, v) => acc + v, 0);
    console.log(\`\${total - arr[arr.length - 1]} \${total - arr[0]}\`);
}`;
        return this.mergeWithBoilerplate(existingCode, 'miniMaxSum', jsFunc);
      }
    }

    // 8. Birthday Cake Candles
    if (
      slug.includes('birthday-cake-candles') ||
      (lower.includes('birthday cake candles') || (lower.includes('candles') && lower.includes('tallest')))
    ) {
      if (isPython) {
        const pyFunc = `def birthdayCakeCandles(candles):
    max_h = max(candles)
    return candles.count(max_h)`;
        return this.mergeWithBoilerplate(existingCode, 'birthdayCakeCandles', pyFunc);
      } else {
        const jsFunc = `function birthdayCakeCandles(candles) {
    let max = -Infinity;
    let count = 0;
    for (const c of candles) {
        if (c > max) {
            max = c;
            count = 1;
        } else if (c === max) {
            count++;
        }
    }
    return count;
}`;
        return this.mergeWithBoilerplate(existingCode, 'birthdayCakeCandles', jsFunc);
      }
    }

    // 9. Time Conversion
    if (
      slug.includes('time-conversion') ||
      (lower.includes('time conversion') || (lower.includes('12-hour am/pm format') && lower.includes('military (24-hour) time')))
    ) {
      if (isPython) {
        const pyFunc = `def timeConversion(s):
    modifier = s[-2:]
    parts = s[:-2].split(':')
    hours = int(parts[0])
    if modifier == 'PM' and hours != 12:
        hours += 12
    elif modifier == 'AM' and hours == 12:
        hours = 0
    return f"{hours:02d}:{parts[1]}:{parts[2]}"`;
        return this.mergeWithBoilerplate(existingCode, 'timeConversion', pyFunc);
      } else {
        const jsFunc = `function timeConversion(s) {
    const modifier = s.slice(-2);
    let [hours, minutes, seconds] = s.slice(0, -2).split(':');
    if (modifier === 'PM' && hours !== '12') {
        hours = String(parseInt(hours, 10) + 12);
    }
    if (modifier === 'AM' && hours === '12') {
        hours = '00';
    }
    return \`\${hours}:\${minutes}:\${seconds}\`;
}`;
        return this.mergeWithBoilerplate(existingCode, 'timeConversion', jsFunc);
      }
    }

    // 10. Solve Me First
    if (slug.includes('solve-me-first') || lower.includes('solve me first')) {
      if (isPython) {
        const pyFunc = `def solveMeFirst(a, b):
    return a + b`;
        return this.mergeWithBoilerplate(existingCode, 'solveMeFirst', pyFunc);
      } else {
        const jsFunc = `function solveMeFirst(a, b) {
    return a + b;
}`;
        return this.mergeWithBoilerplate(existingCode, 'solveMeFirst', jsFunc);
      }
    }

    // 11. Grading Students
    if (slug.includes('grading-students') || lower.includes('grading students') || (lower.includes('rounding') && lower.includes('grade'))) {
      if (isPython) {
        const pyFunc = `def gradingStudents(grades):
    res = []
    for g in grades:
        if g >= 38 and g % 5 >= 3:
            res.append(g + (5 - (g % 5)))
        else:
            res.append(g)
    return res`;
        return this.mergeWithBoilerplate(existingCode, 'gradingStudents', pyFunc);
      } else {
        const jsFunc = `function gradingStudents(grades) {
    return grades.map(g => {
        if (g >= 38 && g % 5 >= 3) {
            return g + (5 - (g % 5));
        }
        return g;
    });
}`;
        return this.mergeWithBoilerplate(existingCode, 'gradingStudents', jsFunc);
      }
    }

    return null;
  }

  /**
   * Validates syntax and basic safety for algorithm solutions
   */
  public validateAlgorithmCode(code: string, language?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const issues: ValidationIssue[] = [];

    const trimmed = code.trim();
    if (!trimmed) {
      return {
        isValid: false,
        errors: ['Generated solution code is empty'],
        warnings: [],
        issues: [{ severity: 'error', message: 'Solution is empty' }]
      };
    }

    // Check for dummy placeholder code
    if (/function\s+solve\s*\(\s*input\s*\)\s*\{\s*return\s+input;\s*\}/i.test(trimmed)) {
      errors.push('Placeholder function detected. Solution must implement the specific required challenge logic.');
      issues.push({ severity: 'error', message: 'Placeholder function solve(input) returned' });
    }

    // Check bracket balance for JS / C++ / Java
    const isPy = language && /python/i.test(language);
    if (!isPy) {
      let braces = 0;
      let parens = 0;
      let brackets = 0;
      for (const ch of trimmed) {
        if (ch === '{') braces++;
        if (ch === '}') braces--;
        if (ch === '(') parens++;
        if (ch === ')') parens--;
        if (ch === '[') brackets++;
        if (ch === ']') brackets--;
      }
      if (braces !== 0) {
        errors.push('Unbalanced curly braces { } in code.');
        issues.push({ severity: 'error', message: 'Unbalanced curly braces' });
      }
      if (parens !== 0) {
        errors.push('Unbalanced parentheses ( ) in code.');
        issues.push({ severity: 'error', message: 'Unbalanced parentheses' });
      }
      if (brackets !== 0) {
        errors.push('Unbalanced square brackets [ ] in code.');
        issues.push({ severity: 'error', message: 'Unbalanced brackets' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      issues
    };
  }
}
