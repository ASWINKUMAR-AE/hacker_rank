/**
 * Resilient HackerRank Selector Configuration System.
 * Uses tiered primary, fallback, and accessibility/semantic selectors so that HackerRank UI updates
 * do not break problem detection and interaction.
 */

export interface SelectorGroup {
  primary: string[];
  fallbacks: string[];
  semanticLabels?: string[];
  xpathFallbacks?: string[];
}

export interface HackerRankSelectorConfig {
  problemTitle: SelectorGroup;
  problemStatement: SelectorGroup;
  inputFormat: SelectorGroup;
  outputFormat: SelectorGroup;
  constraints: SelectorGroup;
  sampleCases: SelectorGroup;
  sampleInput: SelectorGroup;
  sampleOutput: SelectorGroup;
  editorContainer: SelectorGroup;
  monacoTextarea: SelectorGroup;
  languageSelector: SelectorGroup;
  currentLanguageBadge: SelectorGroup;
  categoryBreadcrumb: SelectorGroup;
  runCodeButton: SelectorGroup;
  submitButton: SelectorGroup;
  testResults: SelectorGroup;
  tabProblem: SelectorGroup;
  tabSubmissions: SelectorGroup;
}

export const defaultSelectors: HackerRankSelectorConfig = {
  problemTitle: {
    primary: [
      'h1[data-automation="challenge-title"]',
      'h1.ui-heading',
      '.challenge-name',
      '.challenge-title'
    ],
    fallbacks: [
      'main h1',
      'h1',
      '[role="heading"][aria-level="1"]',
      '.title-wrapper h1'
    ],
    semanticLabels: ['Challenge Title', 'Problem Title']
  },
  problemStatement: {
    primary: [
      '.question-description',
      'div[class*="question-description"]',
      '[data-automation="problem-statement"]',
      '.challenge-body-html',
      '.problem-statement',
      '.challenge_problem_statement'
    ],
    fallbacks: [
      '.problem-description',
      '.challenge-content .tab-pane.active',
      '.coding-problem-statement',
      'section[class*="problem-statement"]',
      '.react-problem-description'
    ]
  },
  inputFormat: {
    primary: [
      '#input-format + div',
      '.input-format',
      '[data-automation="input-format"]'
    ],
    fallbacks: [
      'h3:has-text("Input Format") + div',
      'h4:has-text("Input Format") + div',
      'p:has-text("Input Format")'
    ],
    semanticLabels: ['Input Format']
  },
  outputFormat: {
    primary: [
      '#output-format + div',
      '.output-format',
      '[data-automation="output-format"]'
    ],
    fallbacks: [
      'h3:has-text("Output Format") + div',
      'h4:has-text("Output Format") + div',
      'p:has-text("Output Format")'
    ],
    semanticLabels: ['Output Format']
  },
  constraints: {
    primary: [
      '#constraints + div',
      '.constraints',
      '[data-automation="constraints"]'
    ],
    fallbacks: [
      'h3:has-text("Constraints") + div',
      'h4:has-text("Constraints") + div',
      'p:has-text("Constraints")'
    ],
    semanticLabels: ['Constraints']
  },
  sampleCases: {
    primary: [
      '.challenge-body-html .sample-case',
      '.sample-test-cases',
      '.sample-case-container'
    ],
    fallbacks: [
      'div[class*="sample"]',
      '.hackdown-content pre'
    ]
  },
  sampleInput: {
    primary: [
      '.sample-input pre',
      '.sample-case-input pre',
      'pre[id*="sample-input"]'
    ],
    fallbacks: [
      'div:has-text("Sample Input") + pre',
      'h3:has-text("Sample Input") ~ pre'
    ]
  },
  sampleOutput: {
    primary: [
      '.sample-output pre',
      '.sample-case-output pre',
      'pre[id*="sample-output"]'
    ],
    fallbacks: [
      'div:has-text("Sample Output") + pre',
      'h3:has-text("Sample Output") ~ pre'
    ]
  },
  editorContainer: {
    primary: [
      '.monaco-editor',
      '[data-automation="monaco-editor"]',
      '.hr-monaco-editor',
      '#editor'
    ],
    fallbacks: [
      '.code-editor',
      '.CodeMirror',
      'div[class*="editor-container"]',
      'div[role="code"]'
    ]
  },
  monacoTextarea: {
    primary: [
      '.monaco-editor textarea.inputarea',
      'textarea[aria-label="Editor content; pressing Alt+F1 for Accessiblity Options."]',
      '.monaco-editor textarea'
    ],
    fallbacks: [
      'textarea.custominput',
      '.CodeMirror textarea',
      'textarea[class*="inputarea"]'
    ]
  },
  languageSelector: {
    primary: [
      '[data-automation="select-language"]',
      '.select-language',
      '.language-selector',
      'div[class*="select-language"]'
    ],
    fallbacks: [
      '.css-1hwfws3', // react-select container common on HackerRank
      '[aria-label="Select language"]',
      '.select2-container',
      'select[name="language"]'
    ]
  },
  currentLanguageBadge: {
    primary: [
      '[data-automation="select-language"] .css-1uccc91-singleValue',
      '.select-language .select-value',
      '.language-badge'
    ],
    fallbacks: [
      '.css-single-value',
      'div[class*="singleValue"]',
      '.selected-language-label'
    ]
  },
  categoryBreadcrumb: {
    primary: [
      '.breadcrumb',
      '.track-breadcrumb',
      '[data-automation="breadcrumb"]',
      '.breadcrumbs-list'
    ],
    fallbacks: [
      'nav[aria-label="Breadcrumb"]',
      '.breadcrumbs',
      'a[href*="/domains/"]'
    ]
  },
  runCodeButton: {
    primary: [
      'button:has-text("Run Tests")',
      'button[data-automation="run-tests"]',
      'button[data-automation="run-code-button"]',
      'button.hr-monaco-run-code',
      'button:has-text("Run Code")'
    ],
    fallbacks: [
      'button:has-text("Run")',
      'button[data-analytics="RunCode"]',
      'button:has-text("Compile & Test")',
      'button[aria-label="Run Code"]',
      'button[aria-label="Run Tests"]'
    ]
  },
  submitButton: {
    primary: [
      'button[data-automation="submit-code-button"]',
      'button.hr-monaco-submit',
      'button:has-text("Submit Code")',
      'button:has-text("Submit Answer")',
      'button:has-text("Submit")'
    ],
    fallbacks: [
      'button[data-analytics="SubmitCode"]',
      'button[data-analytics="SubmitAnswer"]',
      'button.btn-primary:has-text("Submit")',
      '.ui-btn-primary:has-text("Submit")',
      'button:has-text("Confirm")'
    ]
  },
  testResults: {
    primary: [
      '.compile-bottom',
      '[data-automation="compile-bottom"]',
      '.testcase-status-view',
      '.testcase-results'
    ],
    fallbacks: [
      '.test-results',
      '.submission-details',
      'div[class*="testcase-result"]'
    ]
  },
  tabProblem: {
    primary: [
      'a[data-automation="problem-tab"]',
      'a[href$="/problem"]',
      'button:has-text("Problem")'
    ],
    fallbacks: [
      '[role="tab"]:has-text("Problem")',
      '.tab-list a:first-child'
    ]
  },
  tabSubmissions: {
    primary: [
      'a[data-automation="submissions-tab"]',
      'a[href$="/submissions"]',
      'button:has-text("Submissions")'
    ],
    fallbacks: [
      '[role="tab"]:has-text("Submissions")'
    ]
  }
};

/**
 * Selector Config Store supporting dynamic overrides
 */
export class SelectorConfigStore {
  private static instance: SelectorConfigStore;
  private selectors: HackerRankSelectorConfig = defaultSelectors;

  public static getInstance(): SelectorConfigStore {
    if (!SelectorConfigStore.instance) {
      SelectorConfigStore.instance = new SelectorConfigStore();
    }
    return SelectorConfigStore.instance;
  }

  public getSelectors(): HackerRankSelectorConfig {
    return this.selectors;
  }

  public updateSelectorGroup(key: keyof HackerRankSelectorConfig, group: Partial<SelectorGroup>): void {
    this.selectors[key] = {
      ...this.selectors[key],
      ...group,
      primary: group.primary || this.selectors[key].primary,
      fallbacks: group.fallbacks || this.selectors[key].fallbacks
    };
  }

  public resetToDefaults(): void {
    this.selectors = { ...defaultSelectors };
  }

  public exportConfig(): string {
    return JSON.stringify(this.selectors, null, 2);
  }

  public importConfig(jsonString: string): void {
    const parsed = JSON.parse(jsonString);
    this.selectors = { ...defaultSelectors, ...parsed };
  }
}
