import { Page } from 'playwright';
import * as path from 'path';
import { PlaywrightHackerRankRunner } from './playwrightRunner';
import { ChallengeAnalyzer } from '../services/challengeAnalyzer';
import { CompletedChallengeStore } from '../services/completedStore';
import dotenv from 'dotenv';

dotenv.config();

export interface TrackTopic {
  name: string;
  url: string;
  category: string;
}

export const POPULAR_TOPICS: TrackTopic[] = [
  // SQL Tracks & Subtracks
  { name: 'SQL (All)', url: 'https://www.hackerrank.com/domains/sql', category: 'SQL' },
  { name: 'SQL: Basic Select', url: 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=select', category: 'SQL' },
  { name: 'SQL: Advanced Select', url: 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=advanced-select', category: 'SQL' },
  { name: 'SQL: Aggregation', url: 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=aggregation', category: 'SQL' },
  { name: 'SQL: Basic Join', url: 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=basic-join', category: 'SQL' },
  { name: 'SQL: Advanced Join', url: 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=advanced-join', category: 'SQL' },
  { name: 'SQL: Alternative Queries', url: 'https://www.hackerrank.com/domains/sql?filters%5Bsubdomains%5D%5B%5D=alternative-queries', category: 'SQL' },

  // Linux Shell Tracks
  { name: 'Linux Shell (All)', url: 'https://www.hackerrank.com/domains/shell', category: 'Linux Shell' },
  { name: 'Linux Shell: Bash', url: 'https://www.hackerrank.com/domains/shell?filters%5Bsubdomains%5D%5B%5D=bash', category: 'Linux Shell' },
  { name: 'Linux Shell: Text Processing', url: 'https://www.hackerrank.com/domains/shell?filters%5Bsubdomains%5D%5B%5D=text-processing', category: 'Linux Shell' },
  { name: 'Linux Shell: Grep/Sed/Awk', url: 'https://www.hackerrank.com/domains/shell?filters%5Bsubdomains%5D%5B%5D=grep-sed-awk', category: 'Linux Shell' },

  // React & Frontend Tracks
  { name: 'React (All)', url: 'https://www.hackerrank.com/domains/react', category: 'React' },

  // JavaScript & React Tutorials
  { name: '10 Days of JavaScript', url: 'https://www.hackerrank.com/domains/tutorials/10-days-of-javascript', category: 'JavaScript' },
  
  // Databases Tracks (Relational Algebra & Normalization)
  { name: 'Databases (All)', url: 'https://www.hackerrank.com/domains/databases', category: 'Databases' },
  { name: 'Databases: Relational Algebra', url: 'https://www.hackerrank.com/domains/databases?filters%5Bsubdomains%5D%5B%5D=relational-algebra', category: 'Databases' },
  { name: 'Databases: Database Normalization', url: 'https://www.hackerrank.com/domains/databases?filters%5Bsubdomains%5D%5B%5D=database-normalization', category: 'Databases' },

  // Algorithms & Data Structures Tracks
  { name: 'Algorithms (All)', url: 'https://www.hackerrank.com/domains/algorithms', category: 'Algorithms' },
  { name: 'Algorithms: Warmup', url: 'https://www.hackerrank.com/domains/algorithms?filters%5Bsubdomains%5D%5B%5D=warmup', category: 'Algorithms' },
  { name: 'Data Structures (All)', url: 'https://www.hackerrank.com/domains/data-structures', category: 'Algorithms' }
];

export class HackerRankAutoRunner {
  private runner: PlaywrightHackerRankRunner;
  private analyzer: ChallengeAnalyzer;
  private completedStore: CompletedChallengeStore;
  private page: Page | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.runner = new PlaywrightHackerRankRunner();
    this.analyzer = new ChallengeAnalyzer();
    this.completedStore = CompletedChallengeStore.getInstance();
  }

  private isCompleted(slug: string): boolean {
    return this.completedStore.isCompleted(slug);
  }

  private markCompleted(slug: string, title?: string): void {
    this.completedStore.markCompleted(slug, title);
  }

  /**
   * Logs into HackerRank automatically
   */
  public async autoLogin(email?: string, password?: string): Promise<boolean> {
    const userEmail = email || process.env.HACKERRANK_EMAIL;
    const userPass = password || process.env.HACKERRANK_PASSWORD;

    this.page = await this.runner.launchBrowser(false);

    console.log('🔑 Checking login status...');
    try {
      await this.page.goto('https://www.hackerrank.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise(r => setTimeout(r, 2500));
    } catch (err: any) {
      console.log(`Navigation note: ${err.message}. Retrying or continuing in browser.`);
    }

    // Check if already logged in (redirected away from login page)
    if (!this.page.url().includes('/auth/login')) {
      console.log('✅ Already logged in!');
      return true;
    }

    if (!userEmail || !userPass) {
      console.log('⚠ Please log in manually in the opened browser window.');
      return false;
    }

    console.log(`🔐 Logging in automatically as ${userEmail}...`);
    try {
      const usernameSelector = 'input[name="username"], input[id="input-1"], input[data-automation="login-username"], input[type="text"]';
      await this.page.waitForSelector(usernameSelector, { timeout: 8000 });
      await this.page.fill(usernameSelector, userEmail);

      const passSelector = 'input[name="password"], input[id="input-2"], input[data-automation="login-password"], input[type="password"]';
      await this.page.fill(passSelector, userPass);

      const loginBtnSelector = 'button[data-automation="login-button"], button[type="submit"], button:has-text("Log In")';
      await this.page.click(loginBtnSelector);

      await this.page.waitForURL((url) => !url.href.includes('/auth/login'), { timeout: 30000 });
      console.log('🎉 Successfully logged into HackerRank!');
      return true;
    } catch (err: any) {
      console.log(`⚠ Note during auto-login: ${err.message}. Please complete login in the browser if needed.`);
      return false;
    }
  }

  /**
   * Scrapes challenge list and filters out already solved / completed challenges
   */
  public async getTopicChallenges(topicUrl: string): Promise<Array<{ title: string; href: string; slug: string; solved: boolean }>> {
    if (!this.page || this.page.isClosed()) return [];

    console.log(`\n🔍 Exploring Topic: ${topicUrl}`);
    try {
      await this.page.goto(topicUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await new Promise(r => setTimeout(r, 3000));
    } catch (err: any) {
      console.log(`Error navigating to topic ${topicUrl}: ${err.message}`);
      return [];
    }

    const challenges = await this.page.evaluate(() => {
      const results: Array<{ title: string; href: string; slug: string; solved: boolean }> = [];
      const links = document.querySelectorAll('a[href*="/challenges/"], a[href*="/problem"], .challengecard-title a, .challenge-card-modern a, .challenges-list a');

      links.forEach((el) => {
        const anchor = el as HTMLAnchorElement;
        if (anchor && anchor.href && !anchor.href.includes('/leaderboard') && !anchor.href.includes('/submissions')) {
          const match = anchor.href.match(/\/challenges\/([^\/\?#]+)/);
          if (match) {
            const slug = match[1];
            const title = (anchor.innerText || anchor.textContent || el.closest('.challenge-card-modern, .challengecard-title')?.textContent || slug).trim();
            const card = anchor.closest('.challenge-card-modern, .challengecard-title, .challenge-list-item, div[class*="challenge"]');
            
            const isSolved = !!card?.querySelector('.solved, .badge-solved, [data-automation="solved-badge"]') ||
                             card?.innerHTML.includes('Solved') ||
                             card?.textContent?.includes('Solved');

            if (slug && !results.some(r => r.slug === slug)) {
              results.push({ title, href: anchor.href, slug, solved: !!isSolved });
            }
          }
        }
      });
      return results;
    });

    console.log(`📋 Found ${challenges.length} total challenges in topic.`);
    return challenges;
  }

  /**
   * Automatically solves a single challenge page and transitions to the next
   */
  public async autoSolveChallenge(challengeUrl: string, autoSubmit: boolean = false, animatedTyping: boolean = true): Promise<boolean> {
    if (!this.page) return false;

    const match = challengeUrl.match(/\/challenges\/([^\/\?#]+)/);
    const slug = match ? match[1] : challengeUrl;
    const cleanUrl = `https://www.hackerrank.com/challenges/${slug}/problem`;

    if (this.isCompleted(slug)) {
      console.log(`⏩ [NO REPEAT] Skipping already completed challenge: ${slug}`);
      return true;
    }

    console.log(`\n======================================================`);
    console.log(`[STEP 2/6: NAVIGATING TO PROBLEM] ${slug}`);
    console.log(`URL: ${cleanUrl}`);
    try {
      await this.page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await this.page.waitForTimeout(3000);
    } catch (navErr: any) {
      console.log(`Navigation notice (${slug}): ${navErr.message}. Continuing in browser...`);
      await this.page.waitForTimeout(2000);
    }

    // Automatically click 'Enter Fullscreen' if HackerRank prompts with full-screen banner/dialog
    await this.runner.handleEnterFullscreenIfPresent();

    // Check if on-page indicators show it's already solved
    const isAlreadySolved = await this.page.evaluate(() => {
      const solvedBadge = document.querySelector('.solved, .badge-solved, [data-automation="solved-badge"], .ui-badge--success');
      const bodyText = document.body ? document.body.innerText : '';
      return !!solvedBadge || bodyText.includes('You have solved this challenge') || bodyText.includes('Congratulations on solving');
    });

    if (isAlreadySolved) {
      console.log(`⏩ [ALREADY SOLVED] Challenge '${slug}' is already solved on HackerRank. Marking completed and skipping.`);
      this.markCompleted(slug);
      return true;
    }

    // If React challenge or tabs are present, focus the editable component tab (e.g. App.js)
    await this.runner.ensureReactEditorTab();

    // [STEP 3: UNDERSTAND PROBLEM STATEMENT]
    console.log('\n[STEP 3/6: UNDERSTAND PROBLEM STATEMENT & EXTRACT DIAGRAMS/SCHEMAS]');
    const problem = await this.runner.extractCurrentChallenge();
    if (!problem || !problem.statement || problem.statement === 'No statement extracted') {
      console.log('❌ Could not extract problem details. Moving to next question.');
      return false;
    }

    console.log(`📝 Title: ${problem.title}`);
    if (problem.images && problem.images.length > 0) {
      console.log(`🖼️ Extracted Diagrams/Schemas: ${problem.images.length} image(s) captured from problem pane`);
      problem.images.forEach((img, idx) => {
        console.log(`   └─ Image ${idx + 1}: ${img.src} (${img.alt || 'Schema'})`);
      });
    }
    if (problem.examples && problem.examples.length > 0) {
      console.log(`🧪 Sample Test Cases Found: ${problem.examples.length} case(s)`);
    }

    // [STEP 4: CONFIGURE CODE EDITOR]
    console.log('\n[STEP 4/6: CONFIGURE CODE EDITOR & LANGUAGE]');
    const category = this.analyzer.detectCategory(problem);
    console.log(`🎯 Detected Domain: ${category}`);

    // Set appropriate language for maximum test case passing
    if (category === 'SQL') {
      console.log('⚙️ Selecting MySQL dialect in editor for SQL challenge...');
      await this.runner.ensureLanguage('MySQL');
    } else if (category === 'React') {
      console.log('⚙️ Focused React component in IDE.');
      await this.runner.ensureReactEditorTab();
    } else if (category === 'Linux Shell') {
      console.log('⚙️ Configuring Bash environment for Linux Shell challenge...');
      await this.runner.ensureLanguage('Bash');
    } else if (category === 'JavaScript') {
      await this.runner.ensureLanguage('JavaScript');
    }

    // [STEP 5: WRITE AND TEST SOLUTION]
    console.log('\n[STEP 5/6: WRITE AND TEST SOLUTION]');
    const MAX_RETRIES = 3;
    let attempt = 0;
    let pointsScored = false;
    let currentProblem = { ...problem };

    while (attempt < MAX_RETRIES && !pointsScored) {
      if (!this.page || this.page.isClosed()) {
        console.log('⚠ Browser window was closed. Stopping challenge execution.');
        return false;
      }

      attempt++;
      if (attempt > 1) {
        console.log(`\n🔄 [SELF-HEALING RETRY ${attempt}/${MAX_RETRIES}] Repeating question '${slug}' with error feedback...`);
      }

      // Generate Solution via AI / Heuristic engine
      console.log(`🧠 Generating solution (Attempt ${attempt}/${MAX_RETRIES})...`);
      let result;
      try {
        result = await this.analyzer.analyzeAndSolve(currentProblem);
      } catch (err: any) {
        console.error(`AI Solver Error (Attempt ${attempt}): ${err.message}`);
        continue;
      }

      console.log(`💡 Solution Strategy: ${result.solution_strategy}`);
      console.log(`\n--- Generated Code (Attempt ${attempt}) ---\n${result.generated_solution}\n------------------------------------------`);

      // Insert solution into Monaco Editor with typing animation
      console.log(`⌨️ Typing solution into Monaco Editor ${animatedTyping ? '(Animated typing)' : '(Instant injection)'}...`);
      await this.runner.insertCodeIntoEditor(result.generated_solution, animatedTyping);
      await new Promise(r => setTimeout(r, 2000));

      const hasSampleCases = problem.examples && problem.examples.length > 0;
      let testScore = { passed: false, score: 0, maxScore: 0, details: '' };

      if (hasSampleCases) {
        // Trigger Run Code test for public Sample Cases
        console.log('🧪 Clicking "Run Code" to test against public Sample Cases...');
        await this.runner.runCodeTest();
        testScore = await this.runner.waitForTestResult(25000);

        console.log('\n======================================================');
        console.log(`📊 [TEST RESULT & SCORE LOG] Challenge: ${slug}`);
        console.log(`🏆 SCORE: ${testScore.score} / ${testScore.maxScore} points`);
        console.log(`📋 Details: ${testScore.details}`);
        if (testScore.passedCount !== undefined && testScore.totalCount !== undefined) {
          console.log(`🧪 Test Cases Passed: ${testScore.passedCount} / ${testScore.totalCount}`);
        }
        if (testScore.error) {
          console.log(`⚠️ Failure Details: ${testScore.error}`);
        }
        console.log('======================================================\n');
      } else {
        console.log('ℹ️ No public sample test cases for this challenge. Submitting directly for grading...');
      }

      if (testScore.score > 0 || testScore.passed || !hasSampleCases) {
        // [STEP 6: SUBMIT CODE]
        console.log('\n[STEP 6/6: SUBMIT CODE AGAINST HIDDEN TEST CASES]');
        if (autoSubmit || !hasSampleCases) {
          console.log('🚀 Clicking "Submit Code" to run against all test cases...');
          const submitScore = await this.runner.submitCode(35000);
          console.log(`📊 [SUBMISSION RESULT] Score: ${submitScore.score} / ${submitScore.maxScore} points (${submitScore.details})`);
          
          if (submitScore.score > 0 || submitScore.passed) {
            pointsScored = true;
          }
          // Wait briefly for congratulation banner / modal to render
          await this.page.waitForTimeout(2500);
        } else {
          pointsScored = true;
          console.log('✓ Code tested successfully with points.');
        }

        if (pointsScored) {
          // Mark as completed so we NEVER repeat
          this.markCompleted(slug, problem.title);
          console.log(`✅ [MARKED COMPLETED] Saved '${slug}' to completed challenges store.`);

          // Check if there is an on-page or modal "Next Challenge" button and click it
          console.log('🔍 Checking for "Next Challenge" button / modal...');
          const nextResult = await this.runner.clickNextChallenge();
          if (nextResult.clicked) {
            console.log(`🚀 Clicked Next Challenge button! Navigated to: ${nextResult.nextUrl || 'Next Problem'}`);
          } else {
            console.log('ℹ️ No direct Next Challenge button found. Will load next challenge from queue.');
          }

          break;
        }
      } else {
        console.log(`⚠️ [ZERO POINTS / FAILED] Solution failed sample test cases.`);
        if (attempt < MAX_RETRIES) {
          console.log(`🔁 Refining prompt with compiler/runtime error logs for next attempt...`);
          currentProblem = {
            ...problem,
            errorFeedback: testScore.error || testScore.details,
            previousAttempt: {
              code: result.generated_solution,
              error: testScore.error || testScore.details,
              score: testScore.score
            }
          };
          await this.page.waitForTimeout(3000);
        } else {
          console.log(`❌ [UNSOLVED AFTER ${MAX_RETRIES} RETRIES] Did not earn points. '${slug}' will NOT be marked completed so it can be retried later.`);
        }
      }
    }

    console.log(`======================================================\n`);
    return pointsScored;
  }

  /**
   * Full autonomous loop across all topics without repeating completed questions
   */
  public async runFullAutoLoop(autoSubmit: boolean = false, animatedTyping: boolean = true, selectedDomain: string = 'SQL'): Promise<void> {
    this.isRunning = true;
    console.log('======================================================');
    console.log('🤖 STARTING FULL HACKERRANK AUTO-SOLVER ASSISTANT');
    console.log(`📁 Completed challenges in database: ${this.completedStore.getCompletedCount()}`);
    console.log(`🎯 Active Domain: ${selectedDomain}`);
    console.log(`⌨️ Typing Animation: ${animatedTyping ? 'ON' : 'OFF'}`);
    console.log('======================================================');

    const loggedIn = await this.autoLogin();
    if (!loggedIn) {
      console.log('👉 Waiting 10s for login verification...');
      await this.page?.waitForTimeout(10000);
    }

    // Filter topics by selected domain
    let activeTopics = POPULAR_TOPICS;
    if (selectedDomain && selectedDomain.toLowerCase() !== 'all') {
      activeTopics = POPULAR_TOPICS.filter(t => 
        t.category.toLowerCase().includes(selectedDomain.toLowerCase()) || 
        t.name.toLowerCase().includes(selectedDomain.toLowerCase())
      );
      if (activeTopics.length === 0) {
        console.log(`⚠ No specific topics matched '${selectedDomain}'. Running all tracks.`);
        activeTopics = POPULAR_TOPICS;
      }
    }

    console.log(`📋 Running ${activeTopics.length} track(s) for domain '${selectedDomain}': ${activeTopics.map(t => t.name).join(', ')}`);

    for (const topic of activeTopics) {
      if (!this.isRunning) break;
      console.log(`\n🚀 >>> STARTING TRACK: ${topic.name} <<<`);

      const challenges = await this.getTopicChallenges(topic.url);
      
      // Filter out challenges that are already marked as solved on HR or recorded locally in completedStore
      const pendingChallenges = challenges.filter(c => !c.solved && !this.isCompleted(c.slug));
      console.log(`⚡ ${pendingChallenges.length} Unsolved & Unprocessed Challenges in ${topic.name} (${challenges.length - pendingChallenges.length} skipped)`);

      for (let i = 0; i < pendingChallenges.length; i++) {
        if (!this.isRunning) break;
        const c = pendingChallenges[i];
        
        // Double check completion before starting
        if (this.isCompleted(c.slug)) {
          console.log(`⏩ Skipping already completed: ${c.title} (${c.slug})`);
          continue;
        }

        console.log(`\n[${i + 1}/${pendingChallenges.length}] Next up: ${c.title} (${c.slug})`);
        
        await this.autoSolveChallenge(c.href, autoSubmit, animatedTyping);
        
        // Small pause between challenges
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    console.log('\n🏁 Full auto-solver run completed across all available topics!');
  }

  public stop(): void {
    this.isRunning = false;
  }
}
