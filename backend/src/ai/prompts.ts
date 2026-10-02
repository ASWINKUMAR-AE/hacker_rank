import { ProblemPayload, ChallengeCategory } from '../types';

export function buildSystemPrompt(category: ChallengeCategory): string {
  const baseRules = `You are the HackerRank Practice Automation Expert AI.
Your objective is to analyze programming challenges, understand exact requirements, and generate the most concise, correct, production-quality solution.

STRICT OPERATIONAL GUIDELINES:
1. Understand the complete problem statement and all requirements.
2. Identify and respect all explicit and implicit constraints (time/memory complexity, types, null handling, case sensitivity).
3. Analyze all provided examples and sample inputs/outputs.
4. Determine the exact expected output format (spaces, newlines, precision, header rules).
5. Generate the smallest, cleanest, correct solution.
6. Explain clearly why the solution works, step-by-step.
7. Identify key edge cases (e.g., empty sets, duplicate values, extreme bounds, negative numbers, nulls).
8. Validate the answer against all examples before producing output.
9. ABSOLUTE PROHIBITION AGAINST HALLUCINATION:
   - NEVER invent tables, columns, variables, mock data, components, props, or external APIs not present in the challenge.
   - For SQL: Use ONLY the exact tables and columns provided in the problem description.
   - For React: Preserve the existing project architecture, component hierarchy, and styling. Modify ONLY the minimum lines of code required. Do NOT rewrite unrelated code.
   - For Linux Shell: Prefer POSIX-portable commands (awk, sed, grep, cut, sort, uniq, tr, etc.) unless a specific shell feature is explicitly required.
   - For Algorithms & General Coding: Implement the EXACT required function name (e.g., compareTriplets, simpleArraySum, diagonalDifference) or full I/O script. NEVER return placeholder dummy functions like solve(input).

OUTPUT FORMAT:
You MUST respond with a valid, raw JSON object (and nothing else outside the JSON) conforming to this structure:
{
  "category": "${category}",
  "difficulty": "Easy" | "Medium" | "Hard",
  "requirements": ["point 1", "point 2"],
  "constraints": ["constraint 1", "constraint 2"],
  "expected_output": ["description of output structure"],
  "solution_strategy": "High level strategy",
  "generated_solution": "THE EXACT CODE TO INSERT INTO THE EDITOR",
  "explanation": "Markdown formatted explanation of how the code satisfies the requirements",
  "edge_cases": ["edge case 1", "edge case 2"]
}`;

  switch (category) {
    case 'SQL':
      return `${baseRules}

SPECIFIC SQL RULES:
- Detect the required dialect (MySQL / Oracle / MS SQL Server / DB2 / PostgreSQL) from selectedLanguage.
- Only reference schema tables and columns described in the challenge.
- Check JOIN types carefully (INNER vs LEFT vs FULL).
- Check GROUP BY requirements: Any non-aggregated SELECT expression MUST be present in GROUP BY.
- Check ORDER BY directions and NULL sorting.
- Use window functions (ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG) when optimal.
- Format the query cleanly with uppercase SQL keywords (SELECT, FROM, WHERE, GROUP BY, ORDER BY).`;

    case 'React':
      return `${baseRules}

SPECIFIC REACT RULES:
- Identify existing components, hooks, props, state, and event handlers.
- Make the MINIMAL required changes. If you are modifying App.jsx, keep existing structure and only add/update what is required.
- Do NOT replace entire template boilerplate if only a state handler or rendering logic is missing.
- Ensure proper key attributes in lists.
- Avoid memory leaks, direct DOM mutations, or unsupported external packages.`;

    case 'Linux Shell':
      return `${baseRules}

SPECIFIC LINUX SHELL RULES:
- Write robust, one-liner or small pipeline scripts.
- Use standard utilities: grep, awk, sed, cut, sort, uniq, tr, head, tail, xargs, find.
- Pay attention to field delimiters (-d, -F, FS), tab vs space, and 1-based indexing in cut/awk.
- Handle trailing newlines and multi-line inputs properly.
- Ensure commands are safe and read from standard input ($stdin) or files as specified.`;

    case 'Algorithms':
    case 'JavaScript':
    default:
      return `${baseRules}

SPECIFIC ALGORITHMS & GENERAL CODING RULES:
- Read the required function name and parameters from the problem statement (e.g., function compareTriplets(a, b), def compareTriplets(a, b):).
- When EXISTING EDITOR CODE / BOILERPLATE is provided with I/O handling (such as process.stdin, readLine(), main(), fs.createWriteStream, sys.stdin, Scanner):
  YOU MUST PRESERVE the entire boilerplate and insert your completed function into the existing code template, so that the entire script runs, reads stdin, calls the function, and writes output to stdout or process.env.OUTPUT_PATH as HackerRank expects.
- Match the return type exactly (e.g., return [alice, bob] array of 2 integers for Compare the Triplets).
- Optimize time and space complexity to ensure all test cases pass without Time Limit Exceeded (TLE).`;
  }
}

export function buildUserPrompt(problem: ProblemPayload): string {
  let prompt = `Analyze the following HackerRank challenge and generate the solution JSON:\n\n`;
  prompt += `TITLE: ${problem.title}\n`;
  prompt += `CATEGORY: ${problem.category || 'Algorithms'}\n`;
  if (problem.selectedLanguage) {
    prompt += `SELECTED LANGUAGE / DIALECT: ${problem.selectedLanguage}\n`;
  }
  prompt += `\nPROBLEM STATEMENT:\n${problem.statement}\n`;

  if (problem.inputFormat) {
    prompt += `\nINPUT FORMAT:\n${problem.inputFormat}\n`;
  }
  if (problem.outputFormat) {
    prompt += `\nOUTPUT FORMAT:\n${problem.outputFormat}\n`;
  }
  if (problem.constraints && problem.constraints.length > 0) {
    prompt += `\nCONSTRAINTS:\n${problem.constraints.join('\n')}\n`;
  }
  if (problem.examples && problem.examples.length > 0) {
    prompt += `\nEXAMPLES:\n`;
    problem.examples.forEach((ex, idx) => {
      prompt += `Example ${idx + 1}:\nInput:\n${ex.input}\nExpected Output:\n${ex.output}\n`;
      if (ex.explanation) prompt += `Explanation: ${ex.explanation}\n`;
    });
  }
  if (problem.images && problem.images.length > 0) {
    prompt += `\nPROBLEM DIAGRAMS / SCHEMA IMAGES (${problem.images.length} extracted from statement/side panel):\n`;
    problem.images.forEach((img, idx) => {
      prompt += `[Image ${idx + 1}]: URL: ${img.src} | Description: ${img.alt || 'Visual diagram / Schema'}${img.title ? ` | Title: ${img.title}` : ''}\n`;
    });
    prompt += `NOTE: For SQL/React challenges, the above images contain database schema ERDs, table column types, and UI component wireframes. Take them into account.\n`;
  }

  if (problem.existingCode && problem.existingCode.trim().length > 0) {
    prompt += `\nEXISTING EDITOR CODE / BOILERPLATE:\n\`\`\`\n${problem.existingCode}\n\`\`\`\n`;
  }

  if (problem.errorFeedback || problem.previousAttempt) {
    prompt += `\n⚠️ PREVIOUS ATTEMPT FAILED / SCORED 0 POINTS:\n`;
    if (problem.previousAttempt?.code) {
      prompt += `Failed Code / Query:\n\`\`\`\n${problem.previousAttempt.code}\n\`\`\`\n`;
    }
    if (problem.previousAttempt?.error || problem.errorFeedback) {
      prompt += `Error / Failure Output:\n${problem.previousAttempt?.error || problem.errorFeedback}\n`;
    }
    prompt += `Score Earned: ${problem.previousAttempt?.score ?? 0} points.\n`;
    prompt += `CRITICAL INSTRUCTION: Analyze why the previous code scored 0 points. Fix all logic errors, syntax mistakes, edge cases, or output formatting mismatches. Provide a completely working solution that will pass 100% of test cases.\n`;
  }

  prompt += `\nReturn the JSON response now:`;
  return prompt;
}
