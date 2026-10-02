import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChallengeAnalyzer } from './services/challengeAnalyzer';
import { SQLSolver } from './services/sqlSolver';
import { ReactSolver } from './services/reactSolver';
import { ShellSolver } from './services/shellSolver';
import { SolutionValidator } from './services/validator';
import { PlaywrightHackerRankRunner } from './automation/playwrightRunner';
import { AIProviderFactory } from './ai/providerFactory';
import { SelectorConfigStore } from './automation/hackerRankSelectors';
import { ProblemPayload, AIProviderType, PrivacyMode } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const analyzer = new ChallengeAnalyzer();
const sqlSolver = new SQLSolver();
const reactSolver = new ReactSolver();
const shellSolver = new ShellSolver();
const validator = new SolutionValidator();
let playwrightRunner: PlaywrightHackerRankRunner | null = null;

// Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  const config = AIProviderFactory.getConfig();
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    provider: config.provider,
    privacyMode: config.privacyMode
  });
});

// Settings & Config
app.get('/api/config', (req: Request, res: Response) => {
  res.json(AIProviderFactory.getConfig());
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    const updated = AIProviderFactory.updateConfig(req.body);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Selector configuration endpoints
app.get('/api/selectors', (req: Request, res: Response) => {
  res.json(SelectorConfigStore.getInstance().getSelectors());
});

app.post('/api/selectors', (req: Request, res: Response) => {
  try {
    const store = SelectorConfigStore.getInstance();
    if (req.body.selectors) {
      store.importConfig(JSON.stringify(req.body.selectors));
    }
    res.json({ success: true, selectors: store.getSelectors() });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Challenge Analysis & Solution Generation
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const problem: ProblemPayload = req.body;
    if (!problem || !problem.statement) {
      return res.status(400).json({ error: 'Problem statement is required' });
    }

    const result = await analyzer.analyzeAndSolve(problem);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error analyzing problem:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Validation endpoint
app.post('/api/validate', (req: Request, res: Response) => {
  try {
    const { category, solution, schema, dialect } = req.body;
    const result = validator.validate(category, solution, schema, dialect);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// React Diff & Patch endpoint
app.post('/api/react/patch', (req: Request, res: Response) => {
  try {
    const { originalCode, modifiedCode, filename } = req.body;
    const patch = reactSolver.generatePatch(originalCode, modifiedCode, filename || 'src/App.jsx');
    res.json({ success: true, data: patch });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Shell safe local sandbox test endpoint
app.post('/api/shell/test', async (req: Request, res: Response) => {
  try {
    const { command, input } = req.body;
    const testResult = await shellSolver.testCommand(command, input || '');
    res.json({ success: true, data: testResult });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Challenge Completion & Non-Repeat Tracking Endpoints
import { CompletedChallengeStore } from './services/completedStore';
const completedStore = CompletedChallengeStore.getInstance();

app.get('/api/challenges/completed', (req: Request, res: Response) => {
  res.json({
    success: true,
    count: completedStore.getCompletedCount(),
    completed: completedStore.getCompletedList()
  });
});

app.post('/api/challenges/completed/check', (req: Request, res: Response) => {
  const { slug, url } = req.body;
  const target = slug || url;
  if (!target) {
    return res.status(400).json({ success: false, error: 'slug or url is required' });
  }
  const isCompleted = completedStore.isCompleted(target);
  res.json({ success: true, isCompleted, slug: completedStore.normalizeSlug(target) });
});

app.post('/api/challenges/completed', (req: Request, res: Response) => {
  const { slug, url, title } = req.body;
  const target = slug || url;
  if (!target) {
    return res.status(400).json({ success: false, error: 'slug or url is required' });
  }
  completedStore.markCompleted(target, title);
  res.json({ success: true, message: `Marked '${target}' as completed` });
});

app.delete('/api/challenges/completed', (req: Request, res: Response) => {
  const { slug, url } = req.body || {};
  const target = slug || url;
  if (target) {
    const removed = completedStore.unmarkCompleted(target);
    res.json({ success: true, removed, message: `Removed '${target}' from completed` });
  } else {
    completedStore.clearAll();
    res.json({ success: true, message: 'All completed challenges cleared' });
  }
});

// Browser Automation (Playwright) Endpoints
app.post('/api/browser/launch', async (req: Request, res: Response) => {
  try {
    if (!playwrightRunner) {
      playwrightRunner = new PlaywrightHackerRankRunner();
    }
    const targetUrl = req.body.url || 'https://www.hackerrank.com/domains';
    await playwrightRunner.navigateToHackerRank(targetUrl);
    res.json({ success: true, message: 'Browser launched and navigated to HackerRank' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/browser/detect', async (req: Request, res: Response) => {
  try {
    if (!playwrightRunner) {
      return res.status(400).json({ success: false, error: 'Browser not launched yet' });
    }
    const status = await playwrightRunner.isChallengePage();
    if (!status.isChallenge) {
      return res.json({ isChallenge: false, message: 'Not currently on a challenge page' });
    }
    const challenge = await playwrightRunner.extractCurrentChallenge();
    const isCompleted = challenge?.url ? completedStore.isCompleted(challenge.url) : false;
    res.json({ isChallenge: true, isCompleted, data: challenge });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/insert', async (req: Request, res: Response) => {
  try {
    if (!playwrightRunner) {
      return res.status(400).json({ success: false, error: 'Browser not launched' });
    }
    const { code, animated, charDelayMs } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code is required' });
    }
    const isAnimated = animated !== undefined ? !!animated : true;
    const inserted = await playwrightRunner.insertCodeIntoEditor(code, isAnimated, charDelayMs || 15);
    res.json({ success: inserted, animated: isAnimated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/browser/run-test', async (req: Request, res: Response) => {
  try {
    if (!playwrightRunner) {
      return res.status(400).json({ success: false, error: 'Browser not launched' });
    }
    const ran = await playwrightRunner.runCodeTest();
    res.json({ success: ran });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Full Auto Solver Loop Endpoint
let autoRunnerInstance: any = null;

app.post('/api/auto/start', async (req: Request, res: Response) => {
  try {
    const { HackerRankAutoRunner } = await import('./automation/autoRunner');
    const autoSubmit = !!req.body.autoSubmit;
    const animatedTyping = req.body.animatedTyping !== false;
    const selectedDomain = req.body.domain || 'SQL';
    autoRunnerInstance = new HackerRankAutoRunner();
    
    // Launch in background without blocking API response
    autoRunnerInstance.runFullAutoLoop(autoSubmit, animatedTyping, selectedDomain).catch((err: any) => {
      console.error('Auto Runner background error:', err);
    });

    res.json({ 
      success: true, 
      message: `Full auto solver loop launched for domain '${selectedDomain}'!`, 
      domain: selectedDomain,
      animatedTyping,
      completedChallengesCount: completedStore.getCompletedCount()
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/auto/stop', (req: Request, res: Response) => {
  if (autoRunnerInstance) {
    autoRunnerInstance.stop();
    autoRunnerInstance = null;
    res.json({ success: true, message: 'Auto solver loop stopped' });
  } else {
    res.json({ success: false, message: 'No auto runner currently active' });
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 HackerRank Assistant Server listening on port ${PORT}`);
  console.log(`🔒 Privacy Mode: ${AIProviderFactory.getConfig().privacyMode}`);
  console.log(`🧠 AI Provider: ${AIProviderFactory.getConfig().provider}`);
  console.log(`====================================================`);
});
