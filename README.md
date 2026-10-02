# HackerRank Practice & Educational Assistant 🎓

> **⚠️ DISCLAIMER: FOR EDUCATIONAL & PRACTICE PURPOSES ONLY**
>
> This project is developed strictly for **educational, learning, and self-practice purposes**. It is designed to assist programmers and students in understanding algorithmic problem-solving techniques, database query patterns, UI state management, and shell scripting concepts on HackerRank's publicly available practice tracks.
>
> - **DO NOT USE** this tool on competitive contests, active job assessments, hiring challenges, or certification exams.
> - Always review, study, and understand the generated solutions and logic explanations.
> - The authors and contributors do not promote or encourage academic dishonesty.

---

A modular, browser-based developer tool for interactively analyzing, solving, explaining, and validating HackerRank practice challenges across **Algorithms**, **SQL**, **React**, **Linux Shell**, and **JavaScript**.

---

## 🔒 Safety & Ethical Guardrails

- **Educational Practice Focus**: Built specifically for understanding problem structures, time/space complexity, and syntax rules.
- **Local-Only Privacy Mode**: With `PRIVACY_MODE=local_only`, zero challenge content is sent to external APIs. Offline heuristic solving or local Ollama models can be used exclusively.
- **Explainable Solutions**: Every solved problem provides structured requirements analysis, edge case checks, and step-by-step logic explanations.

---

## 📁 Project Architecture

```text
hackerrank-assistant/
├── backend/
│   ├── src/
│   │   ├── ai/                    # Multi-provider abstraction (OpenRouter, Ollama, OpenAI, Gemini, Heuristic)
│   │   │   ├── AIProvider.ts
│   │   │   ├── gemini.ts
│   │   │   ├── localHeuristic.ts
│   │   │   ├── ollama.ts
│   │   │   ├── openai.ts
│   │   │   ├── openrouter.ts
│   │   │   ├── prompts.ts
│   │   │   └── providerFactory.ts
│   │   ├── automation/            # Playwright automation & selector configuration
│   │   │   ├── autoRunner.ts
│   │   │   ├── cli.ts
│   │   │   ├── hackerRankSelectors.ts
│   │   │   └── playwrightRunner.ts
│   │   ├── services/              # Domain solvers, analyzers, and validators
│   │   │   ├── algorithmSolver.ts # Algorithms track solver & boilerplate merger
│   │   │   ├── challengeAnalyzer.ts
│   │   │   ├── completedStore.ts
│   │   │   ├── reactSolver.ts
│   │   │   ├── sandbox.ts
│   │   │   ├── shellSolver.ts
│   │   │   ├── sqlSolver.ts
│   │   │   └── validator.ts
│   │   ├── types/
│   │   └── server.ts              # Express API server
├── extension/                     # Chrome Manifest V3 Extension
│   ├── manifest.json
│   ├── src/
│   │   ├── content/               # Injected Floating Assistant Panel & Editor Adapters
│   │   │   ├── contentScript.tsx
│   │   │   ├── editorAdapter.ts
│   │   │   ├── floatingPanel.tsx
│   │   │   └── problemExtractor.ts
│   │   └── popup/                 # Settings & Privacy configuration
│   │       └── Popup.tsx
│   └── vite.config.ts
├── tests/                         # Vitest unit and integration test suites
│   ├── aiProviders.test.ts
│   ├── algorithmSolver.test.ts
│   ├── analyzer.test.ts
│   ├── completedStore.test.ts
│   ├── imageAndWorkflow.test.ts
│   ├── reactSolver.test.ts
│   ├── shellSolver.test.ts
│   └── sqlSolver.test.ts
├── .env.example
├── package.json
└── README.md
```

---

## ⚡ Key Features

### 1. Domain-Specific Solvers
- **Algorithms & Problem Solving**: Resolves algorithm challenges (Compare the Triplets, Diagonal Difference, Mini-Max Sum, Array Sums, etc.) with automatic HackerRank I/O boilerplate preservation (`main()`, `readLine()`, `process.stdin`).
- **SQL Solver**: Schema parser, table/column relationship extraction, and dialect-specific validation (MySQL, Oracle, MS SQL Server, PostgreSQL).
- **React Solver**: Babel AST analysis for generating minimal code patches and unified diffs with test-ID validation.
- **Linux Shell Solver**: POSIX-compliant script generation (`awk`, `sed`, `grep`, `cut`, `sort`, `uniq`, `tr`) with built-in security sandbox checks.

### 2. Multi-Provider AI Engine
- **Local Heuristic Engine**: 100% offline, rule-based fast generator.
- **OpenRouter**: Access to free open-weight models (`meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-exp:free`, etc.) with automatic fallback.
- **Google Gemini**: Gemini Flash / Pro.
- **OpenAI**: GPT-4o / GPT-4o-mini.
- **Ollama**: Local AI models (`deepseek-coder:6.7b`, `qwen2.5-coder`).

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```env
PORT=4000
AI_PROVIDER=openrouter         # or 'ollama', 'gemini', 'openai', 'local_heuristic'
PRIVACY_MODE=allow_cloud       # 'local_only' or 'allow_cloud'

# OpenRouter (Free models)
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Ollama Settings (Local AI)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-coder:6.7b
```

### 3. Start Backend Server
```bash
npm start
```

### 4. Build Chrome Extension
```bash
npm run build:extension
```
1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `dist/extension` folder.

### 5. Automated Practice Runner
```bash
# Run CLI interactive mode
npm run auto

# Or run specific tracks
npm run auto:algo
npm run auto:sql
npm run auto:shell
npm run auto:react
```

---

## 🧪 Running Tests
```bash
npm test
```
Runs the Vitest test suite covering all solvers, AI providers, and end-to-end analyzer pipelines.

---

## 📜 License
This project is licensed under the MIT License for educational and learning use.
