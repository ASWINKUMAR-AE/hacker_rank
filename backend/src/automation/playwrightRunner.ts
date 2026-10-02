import { chromium, BrowserContext, Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { defaultSelectors, HackerRankSelectorConfig, SelectorGroup } from './hackerRankSelectors';
import { ProblemPayload, SampleTestCase } from '../types';

export class PlaywrightHackerRankRunner {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private selectors: HackerRankSelectorConfig = defaultSelectors;
  private userDataDir: string;

  constructor(userDataDir?: string) {
    this.userDataDir = userDataDir || path.resolve(process.cwd(), '.browser_data');
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
  }

  /**
   * Launches persistent browser session allowing manual login
   */
  public async launchBrowser(headless: boolean = false): Promise<Page> {
    if (this.page && !this.page.isClosed()) {
      return this.page;
    }

    this.context = await chromium.launchPersistentContext(this.userDataDir, {
      headless,
      viewport: null, // Allow natural normal browser window view without white margins
      args: [
        '--disable-blink-features=AutomationControlled',
        '--start-maximized',
        '--no-default-browser-check'
      ]
    });

    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    return this.page;
  }

  /**
   * Navigates to HackerRank homepage or login page
   */
  public async navigateToHackerRank(targetUrl: string = 'https://www.hackerrank.com'): Promise<void> {
    const page = await this.launchBrowser(false);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  }

  /**
   * Checks if current URL is a practice challenge page
   */
  public async isChallengePage(): Promise<{ isChallenge: boolean; url: string; challengeSlug?: string }> {
    if (!this.page) return { isChallenge: false, url: '' };

    const url = this.page.url();
    const challengeMatch = url.match(/\/challenges\/([^\/]+)(?:\/problem)?/);
    if (challengeMatch) {
      return {
        isChallenge: true,
        url,
        challengeSlug: challengeMatch[1]
      };
    }
    return { isChallenge: false, url };
  }

  /**
   * Tries multiple selectors in a group until a match is found
   */
  private async findFirstMatchingText(group: SelectorGroup): Promise<string> {
    if (!this.page) return '';

    // 1. Try primary selectors
    for (const selector of group.primary) {
      try {
        const el = this.page.locator(selector).first();
        if (await el.isVisible({ timeout: 1000 })) {
          const text = await el.innerText();
          if (text && text.trim().length > 0) return text.trim();
        }
      } catch {
        // continue
      }
    }

    // 2. Try fallbacks
    for (const selector of group.fallbacks) {
      try {
        const el = this.page.locator(selector).first();
        if (await el.isVisible({ timeout: 1000 })) {
          const text = await el.innerText();
          if (text && text.trim().length > 0) return text.trim();
        }
      } catch {
        // continue
      }
    }

    return '';
  }

  /**
   * Extracts complete challenge payload from active page, including schema tables and images
   */
  public async extractCurrentChallenge(): Promise<ProblemPayload | null> {
    if (!this.page) return null;

    const url = this.page.url();
    const title = await this.findFirstMatchingText(this.selectors.problemTitle);
    
    // Extract rich statement, tables, and images from page DOM
    const statementData = await this.page.evaluate(() => {
      const selectors = [
        '.question-description',
        'div[class*="question-description"]',
        'div[class*="problem-description"]',
        '[data-automation="problem-statement"]',
        '.challenge-body-html',
        '.problem-statement',
        '.challenge_problem_statement',
        '.challenge-content',
        '.coding-problem-statement',
        '.hackdown-content',
        'section[class*="problem-statement"]'
      ];
      
      let container: Element | null = null;
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 0) {
          container = el;
          break;
        }
      }

      if (!container) {
        return {
          statement: document.body?.innerText?.substring(0, 3000) || '',
          statementHtml: '',
          images: [],
          tableMd: ''
        };
      }

      // Convert HTML tables inside statement to Markdown tables
      const tables = container.querySelectorAll('table');
      const mdTables: string[] = [];
      tables.forEach((table, tableIdx) => {
        const rows = Array.from(table.querySelectorAll('tr'));
        if (rows.length === 0) return;

        const matrix: string[][] = [];
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td')).map(c => 
            (c.textContent || '').replace(/[\n\r\t]+/g, ' ').replace(/\|/g, '\\|').trim()
          );
          if (cells.length > 0) matrix.push(cells);
        });

        if (matrix.length > 0) {
          const maxCols = Math.max(...matrix.map(r => r.length));
          const normalized = matrix.map(r => {
            while (r.length < maxCols) r.push('');
            return r;
          });

          let md = `\n### Table Schema / Data ${tableIdx + 1}:\n`;
          md += '| ' + normalized[0].join(' | ') + ' |\n';
          md += '| ' + normalized[0].map(() => '---').join(' | ') + ' |\n';
          for (let i = 1; i < normalized.length; i++) {
            md += '| ' + normalized[i].join(' | ') + ' |\n';
          }
          mdTables.push(md);
        }
      });

      // Extract all diagrams, ER schema images, and UI mockups
      const images: Array<{ src: string; alt?: string; title?: string }> = [];
      const imageEls = container.querySelectorAll('img, svg image');
      const seen = new Set<string>();
      imageEls.forEach(img => {
        const el = img as HTMLImageElement;
        const src = el.src || el.getAttribute('data-src') || el.getAttribute('data-url') || '';
        if (src && !seen.has(src)) {
          seen.add(src);
          images.push({
            src,
            alt: el.alt || el.getAttribute('aria-label') || 'HackerRank Diagram / Schema Image',
            title: el.title || undefined
          });
        }
      });

      return {
        statement: container.textContent ? container.textContent.trim() : '',
        statementHtml: container.innerHTML,
        images,
        tableMd: mdTables.join('\n')
      };
    });

    let statement = statementData.statement || (await this.findFirstMatchingText(this.selectors.problemStatement)) || 'No statement extracted';
    if (statementData.tableMd) {
      statement += `\n\n--- EXTRACTED DATABASE / COMPONENT SCHEMA TABLES ---\n${statementData.tableMd}`;
    }

    const inputFormat = await this.findFirstMatchingText(this.selectors.inputFormat);
    const outputFormat = await this.findFirstMatchingText(this.selectors.outputFormat);
    const rawConstraints = await this.findFirstMatchingText(this.selectors.constraints);

    // Selected language detection
    let selectedLanguage = await this.findFirstMatchingText(this.selectors.currentLanguageBadge);
    if (!selectedLanguage) {
      selectedLanguage = await this.findFirstMatchingText(this.selectors.languageSelector);
    }

    // Existing editor content extraction
    const existingCode = await this.getEditorContent();

    // Sample test cases extraction
    const examples: SampleTestCase[] = [];
    try {
      const sampleInputs = await this.page.locator('.sample-input pre, .sample-case-input pre').allInnerTexts();
      const sampleOutputs = await this.page.locator('.sample-output pre, .sample-case-output pre').allInnerTexts();
      for (let i = 0; i < Math.max(sampleInputs.length, sampleOutputs.length); i++) {
        examples.push({
          input: sampleInputs[i] || '',
          output: sampleOutputs[i] || ''
        });
      }
    } catch {
      // ignore
    }

    const constraints = rawConstraints
      ? rawConstraints.split('\n').map(c => c.trim()).filter(c => c.length > 0)
      : [];

    const defaultLang = (url.includes('database') || url.includes('relational-algebra'))
      ? 'Plain Text'
      : (url.includes('react') || url.includes('javascript'))
        ? 'JavaScript'
        : (url.includes('shell') || url.includes('bash'))
          ? 'Bash'
          : 'MySQL';

    return {
      title: title || 'HackerRank Practice Challenge',
      statement,
      statementHtml: statementData.statementHtml,
      images: statementData.images,
      inputFormat,
      outputFormat,
      constraints,
      examples,
      selectedLanguage: selectedLanguage || defaultLang,
      existingCode,
      url
    };
  }

  /**
   * Retrieves editor code via Monaco window API or DOM textarea
   */
  public async getEditorContent(): Promise<string> {
    if (!this.page) return '';

    try {
      // 1. Try Monaco JavaScript object in page context
      const monacoCode = await this.page.evaluate(() => {
        const win = window as any;
        if (win.monaco && win.monaco.editor) {
          const editors = win.monaco.editor.getEditors();
          if (editors && editors.length > 0) {
            return editors[0].getValue();
          }
        }
        return null;
      });

      if (monacoCode !== null && monacoCode !== undefined) {
        return monacoCode;
      }

      // 2. Try textarea fallback
      for (const selector of this.selectors.monacoTextarea.primary) {
        const text = await this.page.locator(selector).first().inputValue().catch(() => '');
        if (text) return text;
      }
    } catch {
      // fallback
    }

    return '';
  }

  /**
   * Inserts generated code safely into Monaco or textarea, with multi-strategy fallback
   */
  public async insertCodeIntoEditor(code: string, animated: boolean = true, charDelayMs: number = 15): Promise<boolean> {
    if (!this.page || this.page.isClosed()) return false;

    console.log(`⌨️ Inserting code into active editor (${code.length} characters)...`);

    try {
      // Step 1: Ensure active Monaco editor container is focused
      const editorLocator = this.page.locator('.monaco-editor .view-lines, .monaco-editor textarea.inputarea, .monaco-editor').first();
      if (await editorLocator.isVisible({ timeout: 1500 }).catch(() => false)) {
        await editorLocator.click({ force: true });
        await this.page.waitForTimeout(300);
      }

      // Step 2: Try Monaco Editor Window API with pushEditOperations for event triggering & sync
      const monacoSuccess = await this.page.evaluate((val) => {
        const win = window as any;
        let modified = false;

        if (win.monaco && win.monaco.editor) {
          const models = win.monaco.editor.getModels ? win.monaco.editor.getModels() : [];
          for (let i = 0; i < models.length; i++) {
            const m = models[i];
            const uri = m.uri ? m.uri.toString() : '';
            if (!uri.includes('INSTRUCTIONS') && !uri.includes('.md') && !uri.includes('.test.')) {
              if (m.pushEditOperations) {
                m.pushEditOperations(
                  [],
                  [{ range: m.getFullModelRange(), text: val }],
                  () => null
                );
              }
              m.setValue(val);
              modified = true;
            }
          }

          const editors = win.monaco.editor.getEditors ? win.monaco.editor.getEditors() : [];
          for (let i = 0; i < editors.length; i++) {
            const ed = editors[i];
            const m = ed.getModel ? ed.getModel() : null;
            const uri = m && m.uri ? m.uri.toString() : '';
            if (!uri.includes('INSTRUCTIONS') && !uri.includes('.md') && !uri.includes('.test.')) {
              ed.focus();
              ed.setValue(val);
              modified = true;
            }
          }
        }
        return modified;
      }, code);

      if (monacoSuccess) {
        console.log('✅ Code successfully set and synchronized via Monaco Editor Model API.');
        await this.page.waitForTimeout(1000);
        return true;
      }

      // Step 3: Direct keyboard selection and text injection
      console.log('⌨️ Monaco API fallback: Using keyboard input...');
      const viewLines = this.page.locator('.monaco-editor .view-lines, [data-automation="monaco-editor"], textarea.inputarea, .monaco-editor, .code-editor').first();
      if (await viewLines.isVisible().catch(() => false)) {
        await viewLines.click({ force: true });
      }
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Backspace');
      await this.page.keyboard.type(code, { delay: 5 });
      await this.page.waitForTimeout(600);

      // Verify content
      const currentText = await this.getEditorContent();
      if (currentText && currentText.trim().length > 0) {
        console.log('✅ Code successfully written to editor via keyboard.');
        return true;
      }

      // Step 4: Textarea fill fallback
      const textarea = this.page.locator('textarea.inputarea, .monaco-editor textarea, textarea.custominput').first();
      if (await textarea.isVisible({ timeout: 1000 }).catch(() => false)) {
        await textarea.focus();
        await textarea.fill(code);
        await this.page.waitForTimeout(600);
        return true;
      }

      // Step 5: Radio button / Multiple Choice Question option selection
      const radioOptions = this.page.locator('input[type="radio"], input[type="checkbox"], label.ui-radio, label.ui-checkbox, .radio-custom, .checkbox-custom, div[data-automation="question-option"], .challenge-option, .theme-m label');
      const count = await radioOptions.count().catch(() => 0);
      if (count > 0) {
        console.log(`🔘 Multiple choice / radio options detected (${count} options). Selecting matching option for: "${code}"...`);
        const trimmedCode = code.trim();
        const idxMap: Record<string, number> = { '1': 0, 'a': 0, '2': 1, 'b': 1, '3': 2, 'c': 2, '4': 3, 'd': 3 };
        const targetIdx = idxMap[trimmedCode.toLowerCase()];

        if (targetIdx !== undefined && targetIdx < count) {
          await radioOptions.nth(targetIdx).click({ force: true });
          console.log(`✅ Clicked option index ${targetIdx + 1}`);
          return true;
        }

        const labels = this.page.locator('label, .challenge-option, div[data-automation="question-option"], .ui-radio-label, .ui-checkbox-label, .theme-m label');
        const labelCount = await labels.count().catch(() => 0);
        for (let i = 0; i < labelCount; i++) {
          const text = (await labels.nth(i).innerText().catch(() => '')) || '';
          if (text && trimmedCode && (text.toLowerCase().includes(trimmedCode.toLowerCase()) || trimmedCode.toLowerCase().includes(text.toLowerCase()))) {
            await labels.nth(i).click({ force: true });
            console.log(`✅ Selected matching option label: "${text.trim()}"`);
            return true;
          }
        }

        await radioOptions.first().click({ force: true });
        return true;
      }
    } catch (err) {
      console.error('Failed to set editor code:', err);
    }

    return false;
  }

  /**
   * Clicks 'Run Code' button for testing without submitting
   */
  public async runCodeTest(): Promise<boolean> {
    if (!this.page) return false;

    for (const selector of this.selectors.runCodeButton.primary.concat(this.selectors.runCodeButton.fallbacks)) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          return true;
        }
      } catch {
        // try next
      }
    }
    return false;
  }

  /**
   * Automatically detects and clicks 'Enter Fullscreen' mode if HackerRank prompts with the full-screen dialog/banner
   */
  public async handleEnterFullscreenIfPresent(): Promise<boolean> {
    if (!this.page || this.page.isClosed()) return false;

    console.log('🔍 Checking for HackerRank "Enter Fullscreen" prompt / modal...');

    const fullscreenSelectors = [
      'button:has-text("Enter Fullscreen")',
      'button:has-text("Enter Full Screen")',
      'button:has-text("Enter full-screen mode")',
      'button:has-text("Enter full-screen")',
      'div:has-text("Please enter the full-screen mode") button',
      'div:has-text("full-screen mode") button',
      'button[data-automation="enter-fullscreen-btn"]',
      '.enter-fullscreen-btn',
      'a:has-text("Enter Fullscreen")',
      'button:has-text("Fullscreen")'
    ];

    for (const sel of fullscreenSelectors) {
      try {
        const btn = this.page.locator(sel).first();
        if (await btn.isVisible({ timeout: 1200 })) {
          console.log(`🖥️ Detected "Enter Fullscreen" button (${sel}). Clicking to open full React IDE...`);
          await btn.click({ force: true });
          await this.page.waitForTimeout(3000);
          return true;
        }
      } catch {
        // continue
      }
    }

    // In-page fallback check across document and all child iframes
    try {
      const clicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], div[class*="btn"]'));
        for (const b of buttons) {
          const text = (b.textContent || '').trim().toLowerCase();
          if (
            text.includes('enter fullscreen') ||
            text.includes('enter full-screen') ||
            text.includes('enter full screen') ||
            (text.includes('fullscreen') && !text.includes('exit'))
          ) {
            (b as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (clicked) {
        console.log('🖥️ Clicked "Enter Fullscreen" button in page context.');
        await this.page.waitForTimeout(3000);
        return true;
      }
    } catch {}

    return false;
  }

  /**
   * Switches to the editable React component tab (e.g., CodeReviewFeedback.js, Slides.js, ItemList.js, App.js)
   */
  public async ensureReactEditorTab(): Promise<boolean> {
    if (!this.page || this.page.isClosed()) return false;

    console.log('📂 Ensuring editable React component tab is active in IDE...');
    try {
      // 1. Try DOM evaluation without nested function declarations
      const switched = await this.page.evaluate(() => {
        const tabElements = Array.from(
          document.querySelectorAll(
            'div[class*="tab"], li[class*="tab"], div[role="tab"], button[role="tab"], span[class*="title"], div[data-key*="tab"], .tab-item, .editor-tab'
          )
        );

        // Priority 1: Unlocked App.js / App.jsx (e.g. Article Sorting, Item List Manager)
        for (let i = 0; i < tabElements.length; i++) {
          const t = tabElements[i];
          const text = (t.textContent || '').trim();
          const html = t.innerHTML.toLowerCase();
          const title = (t.getAttribute('title') || '').toLowerCase();
          const aria = (t.getAttribute('aria-label') || '').toLowerCase();
          const isLocked = html.includes('lock') || title.includes('lock') || title.includes('read-only') || aria.includes('lock') || aria.includes('read-only') || !!t.querySelector('svg, i, [class*="lock"]');

          if (
            (text === 'App.js' || text === 'App.jsx' || text === 'src/App.js' || text === 'src/App.jsx') &&
            !isLocked
          ) {
            (t as HTMLElement).click();
            return { clicked: true, name: text };
          }
        }

        // Priority 2: Unlocked component tabs if App.js is locked or absent (e.g. CodeReviewFeedback.js, Slides.js)
        for (let i = 0; i < tabElements.length; i++) {
          const t = tabElements[i];
          const text = (t.textContent || '').trim();
          const html = t.innerHTML.toLowerCase();
          const title = (t.getAttribute('title') || '').toLowerCase();
          const aria = (t.getAttribute('aria-label') || '').toLowerCase();
          const isLocked = html.includes('lock') || title.includes('lock') || title.includes('read-only') || aria.includes('lock') || aria.includes('read-only') || !!t.querySelector('svg, i, [class*="lock"]');

          if (
            (text.endsWith('.js') || text.endsWith('.jsx') || text.endsWith('.ts') || text.endsWith('.tsx')) &&
            !text.includes('test') &&
            !text.includes('spec') &&
            !text.includes('INSTRUCTIONS') &&
            !text.includes('.md') &&
            !isLocked
          ) {
            (t as HTMLElement).click();
            return { clicked: true, name: text };
          }
        }

        // Priority 3: Any unlocked tab ending in .js/.jsx
        for (let i = 0; i < tabElements.length; i++) {
          const t = tabElements[i];
          const text = (t.textContent || '').trim();
          const html = t.innerHTML.toLowerCase();
          const title = (t.getAttribute('title') || '').toLowerCase();
          const aria = (t.getAttribute('aria-label') || '').toLowerCase();
          const isLocked = html.includes('lock') || title.includes('lock') || title.includes('read-only') || aria.includes('lock') || aria.includes('read-only') || !!t.querySelector('svg, i, [class*="lock"]');

          if (
            (text.endsWith('.js') || text.endsWith('.jsx')) &&
            !text.includes('test') &&
            !text.includes('instruction') &&
            !text.includes('.md') &&
            !isLocked
          ) {
            (t as HTMLElement).click();
            return { clicked: true, name: text };
          }
        }

        return { clicked: false, name: '' };
      });

      if (switched && switched.clicked) {
        console.log(`✅ Focused editable React component tab (${switched.name}) in IDE.`);
        await this.page.waitForTimeout(1200);
        return true;
      }

      // 2. Playwright locator fallback
      const tabLocators = [
        'div[role="tab"]:has-text("CodeReviewFeedback.js")',
        'div[role="tab"]:has-text("ItemList.js")',
        'div[role="tab"]:has-text("Slides.js")',
        'div[role="tab"]:has-text("Articles.js")',
        'div:has-text("CodeReviewFeedback.js")',
        'span:has-text("CodeReviewFeedback.js")'
      ];

      for (const loc of tabLocators) {
        const el = this.page.locator(loc).first();
        if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
          await el.click();
          console.log(`✅ Focused editable component tab via locator (${loc}).`);
          await this.page.waitForTimeout(1000);
          return true;
        }
      }
    } catch (e) {
      console.log('Tab switch notice:', e);
    }

    return false;
  }

  /**
   * Automatically selects or switches editor language (e.g. 'MySQL')
   */
  public async ensureLanguage(targetLanguage: string = 'MySQL'): Promise<boolean> {
    if (!this.page || this.page.isClosed()) return false;

    try {
      // Check current language badge
      const current = await this.findFirstMatchingText(this.selectors.currentLanguageBadge);
      if (current && current.toLowerCase().includes(targetLanguage.toLowerCase())) {
        return true;
      }

      console.log(`⚙️ Switching HackerRank language to '${targetLanguage}'...`);
      // 1. Click language selector
      for (const selector of this.selectors.languageSelector.primary.concat(this.selectors.languageSelector.fallbacks)) {
        try {
          const el = this.page.locator(selector).first();
          if (await el.isVisible({ timeout: 1000 })) {
            await el.click();
            await new Promise(r => setTimeout(r, 500));

            // Look for target language option in dropdown
            const option = this.page.locator(`div[id*="react-select"]:has-text("${targetLanguage}"), div:has-text("${targetLanguage}")`).last();
            if (await option.isVisible({ timeout: 1000 })) {
              await option.click();
              console.log(`✅ Successfully selected language '${targetLanguage}'!`);
              await new Promise(r => setTimeout(r, 1000));
              return true;
            }
          }
        } catch {
          // try next
        }
      }
    } catch (err) {
      console.log(`Language switch note: ${err}`);
    }
    return false;
  }

  /**
   * Waits for test/compilation results and extracts numerical score, pass/fail status, and error details
   */
  public async waitForTestResult(timeoutMs: number = 25000): Promise<TestScoreResult> {
    if (!this.page || this.page.isClosed()) {
      return { passed: false, score: 0, maxScore: 100, details: 'Browser closed or not active' };
    }

    const startTime = Date.now();
    console.log('⏳ Awaiting HackerRank test results & score calculation...');

    while (Date.now() - startTime < timeoutMs) {
      if (!this.page || this.page.isClosed()) {
        return { passed: false, score: 0, maxScore: 100, details: 'Browser closed during test execution' };
      }

      try {
        const result = await this.page.evaluate(() => {
          const bodyText = document.body ? document.body.innerText : '';
          
          // Check if still running / compiling
          const isProcessing = bodyText.includes('Processing...') || bodyText.includes('Running Code...');
          if (isProcessing) {
            return { finished: false };
          }

          // Check for genuine compilation error / runtime error (ignore informational messages like "No sample test-cases")
          const compErrorEl = document.querySelector('.compile-error, .testcase-error, .error-output, .output-error, [data-automation="compile-error"]');
          if (compErrorEl) {
            const errText = compErrorEl.textContent?.trim() || '';
            const isActualError = /error|traceback|syntaxerror|exception|runtime\s*error|compilation\s*error/i.test(errText);
            if (isActualError && !errText.includes('No sample test-cases')) {
              return {
                finished: true,
                passed: false,
                score: 0,
                maxScore: 100,
                passedCount: 0,
                totalCount: 1,
                details: 'Compilation / Runtime Error',
                error: errText
              };
            }
          }

          // Check for congratulations / all sample cases passed / React Jest test suite passed / submission success / Plain Text accepted
          const congratsEl = document.querySelector('.congratulations-message, .status-success, .testcase-status--success, .compile-success, [data-automation="compile-success"], .submission-congratulations, .submission-success, [data-automation="submission-success"]');
          const hasCongratsText = !!congratsEl ||
                                 bodyText.includes('Congratulations!') ||
                                 bodyText.includes('Congratulations') ||
                                 bodyText.includes('Right Answer') ||
                                 bodyText.includes('Accepted') ||
                                 bodyText.includes('You solved this challenge') ||
                                 bodyText.includes('Would you like to challenge your friends') ||
                                 bodyText.includes('You passed all sample test cases') ||
                                 bodyText.includes('You have passed all test cases') ||
                                 bodyText.includes('Passed all sample test cases') ||
                                 bodyText.includes('Test Suites: 1 passed') ||
                                 bodyText.includes('PASS src/') ||
                                 (bodyText.includes('PASS') && bodyText.includes('.test.js')) ||
                                 (bodyText.includes('Points:') && !bodyText.includes('Points: 0')) ||
                                 (bodyText.includes('Score:') && !bodyText.includes('Score: 0')) ||
                                 bodyText.includes('Success');

          if (hasCongratsText) {
            return {
              finished: true,
              passed: true,
              score: 100,
              maxScore: 100,
              passedCount: 1,
              totalCount: 1,
              details: 'Passed all test cases! Score: 100/100'
            };
          }

          // Check for sample test cases result boxes
          const passedPills = document.querySelectorAll('.testcase-item.passed, .testcase-status-view .badge-success, .test-case-passed, [data-automation="testcase-passed"], .ui-badge--success');
          const failedPills = document.querySelectorAll('.testcase-item.failed, .testcase-status-view .badge-danger, .test-case-failed, [data-automation="testcase-failed"], .ui-badge--danger');

          if (passedPills.length > 0 || failedPills.length > 0) {
            const passedCount = passedPills.length;
            const totalCount = passedCount + failedPills.length;
            const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : (hasCongratsText ? 100 : 0);
            const passed = failedPills.length === 0 && (passedCount > 0 || hasCongratsText);

            let errorDetail = '';
            const diffEl = document.querySelector('.sample-output-diff, .diff-view, .testcase-error-view, .testcase-expected-output');
            if (diffEl) {
              errorDetail = diffEl.textContent?.trim() || '';
            }

            return {
              finished: true,
              passed,
              score,
              maxScore: 100,
              passedCount,
              totalCount,
              details: `Passed ${passedCount}/${totalCount} test cases (Score: ${score}/100)`,
              error: errorDetail || (passed ? undefined : `Failed ${failedPills.length} test case(s)`)
            };
          }

          // Check for wrong answer / failed text
          const hasWrongAnswer = bodyText.includes('Wrong Answer') || bodyText.includes('Failed Testcase');
          if (hasWrongAnswer) {
            return {
              finished: true,
              passed: false,
              score: 0,
              maxScore: 100,
              passedCount: 0,
              totalCount: 1,
              details: 'Wrong Answer (Score: 0/100)',
              error: 'Output did not match expected output'
            };
          }

          // Check if compile-bottom output container appeared with test case tabs
          const compileBottom = document.querySelector('.compile-bottom, [data-automation="compile-bottom"]');
          if (compileBottom) {
            const text = compileBottom.textContent || '';
            if (text.includes('Congratulations') || text.includes('Passed') || text.includes('Success')) {
              return {
                finished: true,
                passed: true,
                score: 100,
                maxScore: 100,
                passedCount: 1,
                totalCount: 1,
                details: 'Passed all test cases! Score: 100/100'
              };
            }
          }

          return { finished: false };
        });

        if (result && result.finished) {
          return {
            passed: !!result.passed,
            score: result.score ?? (result.passed ? 100 : 0),
            maxScore: result.maxScore || 100,
            passedCount: result.passedCount,
            totalCount: result.totalCount,
            details: result.details || `Score: ${result.score}/100`,
            error: result.error
          };
        }
      } catch {
        // ignore evaluate error during page transition
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    return {
      passed: false,
      score: 0,
      maxScore: 100,
      details: 'Test execution completed or score pending',
      error: undefined
    };
  }

  /**
   * Submits code and extracts score earned
   */
  public async submitCode(timeoutMs: number = 30000): Promise<TestScoreResult> {
    if (!this.page || this.page.isClosed()) {
      return { passed: false, score: 0, maxScore: 100, details: 'Browser not active' };
    }

    console.log('🚀 Clicking "Submit Code" button on HackerRank...');
    let clicked = false;
    for (const selector of this.selectors.submitButton.primary.concat(this.selectors.submitButton.fallbacks)) {
      try {
        const btn = this.page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1000 })) {
          await btn.click();
          clicked = true;
          break;
        }
      } catch {
        // try next
      }
    }

    if (!clicked) {
      return { passed: false, score: 0, maxScore: 100, details: 'Could not find submit button' };
    }

    // Wait for submission result
    return this.waitForTestResult(timeoutMs);
  }

  /**
   * Automatically detects and clicks the 'Next Challenge' or 'Solve Next Challenge' button / modal
   */
  public async clickNextChallenge(timeoutMs: number = 8000): Promise<{ clicked: boolean; nextUrl?: string }> {
    if (!this.page || this.page.isClosed()) return { clicked: false };

    const startTime = Date.now();
    console.log('🔍 Searching for "Next Challenge" button / modal in congratulations area...');

    while (Date.now() - startTime < timeoutMs) {
      if (!this.page || this.page.isClosed()) break;

      try {
        // 1. Try in-page evaluate to search and click directly in the DOM
        const evaluateResult = await this.page.evaluate(() => {
          // Search all buttons, links, and role="button" elements
          const elements = Array.from(document.querySelectorAll('a, button, [role="button"], div[class*="btn"], span[class*="btn"]'));
          
          for (const el of elements) {
            const htmlEl = el as HTMLElement;
            const text = (el.textContent || '').trim();
            const lower = text.toLowerCase();
            const isVisible = htmlEl.offsetParent !== null || window.getComputedStyle(htmlEl).display !== 'none';
            
            // Check if text matches "Next Challenge", "Try the next challenge", "Solve Next Challenge", or "Next"
            if (isVisible && (
              lower.includes('try the next challenge') ||
              lower.includes('next challenge') || 
              lower.includes('solve next') || 
              lower === 'next' ||
              lower.includes('next problem') ||
              lower.includes('try next')
            )) {
              htmlEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              htmlEl.click();
              const href = (el as HTMLAnchorElement).href || '';
              return { clicked: true, text, href };
            }
          }
          return { clicked: false };
        });

        if (evaluateResult && evaluateResult.clicked) {
          console.log(`👉 Clicked Next Challenge element ("${evaluateResult.text}"). Navigating...`);
          await this.page.waitForTimeout(3000);
          return { clicked: true, nextUrl: evaluateResult.href || this.page.url() };
        }

        // 2. Try Playwright locators
        const nextSelectors = [
          'a:has-text("Try the next challenge")',
          'button:has-text("Try the next challenge")',
          'a:has-text("Next Challenge")',
          'button:has-text("Next Challenge")',
          'a:has-text("Solve Next Challenge")',
          'button:has-text("Solve Next Challenge")',
          '[data-automation="next-challenge-button"]',
          '[data-analytics="NextChallenge"]',
          '.congratulations-modal button',
          '.congratulations-modal a',
          'div.modal-content button:has-text("Next")',
          'div.modal-content a:has-text("Next")',
          'a[href*="/challenges/"]:has-text("Next")',
          'button:has-text("Next")'
        ];

        for (const sel of nextSelectors) {
          const loc = this.page.locator(sel).first();
          if (await loc.isVisible({ timeout: 500 }).catch(() => false)) {
            const href = await loc.getAttribute('href').catch(() => null);
            console.log(`👉 Found Next Challenge locator (${sel}). Clicking to proceed...`);
            await loc.click({ force: true });
            await this.page.waitForTimeout(3000);
            return { clicked: true, nextUrl: href || this.page.url() };
          }
        }
      } catch {
        // continue polling
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    return { clicked: false };
  }

  public async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }
}
