import { ProblemPayload, SampleTestCase, ChallengeCategory, ProblemImage } from '../../../backend/src/types';
import { defaultSelectors, SelectorGroup } from '../../../backend/src/automation/hackerRankSelectors';
import { EditorAdapter } from './editorAdapter';

export class ProblemExtractor {
  private editorAdapter: EditorAdapter;

  constructor() {
    this.editorAdapter = new EditorAdapter();
  }

  private queryFirstElement(group: SelectorGroup): Element | null {
    for (const selector of group.primary.concat(group.fallbacks)) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch {
        // continue
      }
    }
    return null;
  }

  private queryFirstText(group: SelectorGroup): string {
    const el = this.queryFirstElement(group);
    return el && el.textContent ? el.textContent.trim() : '';
  }

  /**
   * Converts HTML <table> elements into structured Markdown tables
   */
  private convertTablesToMarkdown(container: Element): string {
    const tables = container.querySelectorAll('table');
    if (tables.length === 0) return '';

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

    return mdTables.join('\n');
  }

  /**
   * Extracts all image diagrams, schemas, and UI mockups from the problem pane
   */
  private extractImages(container: Element | null): ProblemImage[] {
    const images: ProblemImage[] = [];
    const imageElements = container 
      ? Array.from(container.querySelectorAll('img, svg image')) 
      : Array.from(document.querySelectorAll('.challenge-body-html img, .problem-statement img, [data-automation="problem-statement"] img, .challenge-content img'));

    const seenUrls = new Set<string>();

    for (const el of imageElements) {
      const img = el as HTMLImageElement;
      const src = img.src || img.getAttribute('data-src') || img.getAttribute('data-url') || '';
      if (src && !seenUrls.has(src)) {
        seenUrls.add(src);
        images.push({
          src,
          alt: img.alt || img.getAttribute('aria-label') || 'HackerRank Problem Diagram / Schema Image',
          title: img.title || undefined
        });
      }
    }

    return images;
  }

  public extractProblem(): ProblemPayload {
    const title = this.queryFirstText(defaultSelectors.problemTitle) || document.title.replace(' | HackerRank', '');
    const statementEl = this.queryFirstElement(defaultSelectors.problemStatement) || document.querySelector('.challenge-body-html, .problem-statement, .challenge-content');
    
    let statement = statementEl && statementEl.textContent ? statementEl.textContent.trim() : 'Statement not found';
    const statementHtml = statementEl ? statementEl.innerHTML : undefined;

    // Append structured Markdown tables if HTML tables are present in statement
    if (statementEl) {
      const tableMd = this.convertTablesToMarkdown(statementEl);
      if (tableMd) {
        statement += `\n\n--- EXTRACTED DATABASE / COMPONENT SCHEMA TABLES ---\n${tableMd}`;
      }
    }

    // Extract all diagrams, entity-relationship images, and UI mockups
    const images = this.extractImages(statementEl);

    const inputFormat = this.queryFirstText(defaultSelectors.inputFormat);
    const outputFormat = this.queryFirstText(defaultSelectors.outputFormat);
    const rawConstraints = this.queryFirstText(defaultSelectors.constraints);

    const constraints = rawConstraints
      ? rawConstraints.split('\n').map(s => s.trim()).filter(Boolean)
      : [];

    const examples: SampleTestCase[] = [];
    const sampleInputEls = document.querySelectorAll('.sample-input pre, .sample-case-input pre');
    const sampleOutputEls = document.querySelectorAll('.sample-output pre, .sample-case-output pre');

    for (let i = 0; i < Math.max(sampleInputEls.length, sampleOutputEls.length); i++) {
      examples.push({
        input: sampleInputEls[i]?.textContent?.trim() || '',
        output: sampleOutputEls[i]?.textContent?.trim() || ''
      });
    }

    const selectedLanguage = this.editorAdapter.getLanguage();
    const existingCode = this.editorAdapter.getCode();

    return {
      title,
      statement,
      statementHtml,
      images,
      inputFormat,
      outputFormat,
      constraints,
      examples,
      selectedLanguage,
      existingCode,
      url: window.location.href
    };
  }
}

