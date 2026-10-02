/**
 * Abstract Editor Adapter and implementations for HackerRank's code editors (Monaco, CodeMirror, Textarea).
 */

export interface IEditorAdapter {
  isAvailable(): boolean;
  getCode(): string;
  setCode(code: string): Promise<boolean>;
  typeCodeAnimated(code: string, options?: { delayMs?: number; onProgress?: (current: number, total: number) => void }): Promise<boolean>;
  replaceSelection(code: string): Promise<boolean>;
  getLanguage(): string;
}

export class MonacoEditorAdapter implements IEditorAdapter {
  public isAvailable(): boolean {
    return !!document.querySelector('.monaco-editor') || !!(window as any).monaco;
  }

  public getCode(): string {
    const win = window as any;
    if (win.monaco && win.monaco.editor) {
      const editors = win.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        return editors[0].getValue();
      }
    }

    // Fallback: Read from DOM lines
    const lines = document.querySelectorAll('.monaco-editor .view-lines .view-line');
    if (lines && lines.length > 0) {
      return Array.from(lines).map(line => line.textContent || '').join('\n');
    }

    const textarea = document.querySelector('.monaco-editor textarea.inputarea') as HTMLTextAreaElement;
    return textarea ? textarea.value : '';
  }

  public async setCode(code: string): Promise<boolean> {
    const win = window as any;
    // 1. Direct Monaco API
    if (win.monaco && win.monaco.editor) {
      const editors = win.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        editors[0].setValue(code);
        return true;
      }
    }

    // 2. Dispatch custom event / script tag injection to reach page context
    try {
      const script = document.createElement('script');
      script.textContent = `
        if (window.monaco && window.monaco.editor) {
          const editors = window.monaco.editor.getEditors();
          if (editors && editors.length > 0) {
            editors[0].setValue(${JSON.stringify(code)});
          }
        }
      `;
      document.documentElement.appendChild(script);
      script.remove();
      return true;
    } catch {
      // fallback
    }

    // 3. Fallback to textarea simulation
    const textarea = document.querySelector('.monaco-editor textarea.inputarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
      textarea.select();
      document.execCommand('insertText', false, code);
      return true;
    }

    return false;
  }

  public async typeCodeAnimated(
    code: string,
    options?: { delayMs?: number; onProgress?: (current: number, total: number) => void }
  ): Promise<boolean> {
    const delay = options?.delayMs || 15;
    const total = code.length;

    // 1. Script injection to type smoothly via Monaco editor
    try {
      const scriptId = 'monaco_type_script_' + Date.now();
      const script = document.createElement('script');
      script.id = scriptId;
      script.textContent = `
        (async () => {
          if (window.monaco && window.monaco.editor) {
            const editors = window.monaco.editor.getEditors();
            if (editors && editors.length > 0) {
              const editor = editors[0];
              editor.setValue('');
              const model = editor.getModel();
              const fullText = ${JSON.stringify(code)};
              const lines = fullText.split('\\n');
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i] + (i < lines.length - 1 ? '\\n' : '');
                const lastLine = model.getLineCount();
                const lastCol = model.getLineMaxColumn(lastLine);
                editor.executeEdits('typing-animation', [{
                  range: { startLineNumber: lastLine, startColumn: lastCol, endLineNumber: lastLine, endColumn: lastCol },
                  text: line,
                  forceMoveMarkers: true
                }]);
                window.dispatchEvent(new CustomEvent('monaco_type_progress', { detail: { line: i + 1, totalLines: lines.length } }));
                await new Promise(r => setTimeout(r, ${delay}));
              }
              window.dispatchEvent(new CustomEvent('monaco_type_complete'));
            }
          }
        })();
      `;
      document.documentElement.appendChild(script);
      script.remove();
      
      // Also notify progress locally
      if (options?.onProgress) {
        let current = 0;
        const interval = setInterval(() => {
          current = Math.min(total, current + Math.max(5, Math.floor(total / 20)));
          options.onProgress?.(current, total);
          if (current >= total) clearInterval(interval);
        }, Math.max(30, delay));
      }
      return true;
    } catch {
      // Fallback to instant setCode
      return this.setCode(code);
    }
  }

  public async replaceSelection(code: string): Promise<boolean> {
    const win = window as any;
    if (win.monaco && win.monaco.editor) {
      const editors = win.monaco.editor.getEditors();
      if (editors && editors.length > 0) {
        const editor = editors[0];
        const selection = editor.getSelection();
        editor.executeEdits('hackerrank-assistant', [{ range: selection, text: code, forceMoveMarkers: true }]);
        return true;
      }
    }
    return this.setCode(code);
  }

  public getLanguage(): string {
    const badge = document.querySelector('[data-automation="select-language"] .css-1uccc91-singleValue, .select-language');
    if (badge && badge.textContent) {
      return badge.textContent.trim();
    }
    return 'Unknown';
  }
}

export class TextareaEditorAdapter implements IEditorAdapter {
  private getTargetTextarea(): HTMLTextAreaElement | null {
    return document.querySelector('textarea.custominput, textarea[id*="editor"], .code-editor textarea') as HTMLTextAreaElement;
  }

  public isAvailable(): boolean {
    return !!this.getTargetTextarea();
  }

  public getCode(): string {
    const el = this.getTargetTextarea();
    return el ? el.value : '';
  }

  public async setCode(code: string): Promise<boolean> {
    const el = this.getTargetTextarea();
    if (!el) return false;
    el.value = code;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  public async typeCodeAnimated(
    code: string,
    options?: { delayMs?: number; onProgress?: (current: number, total: number) => void }
  ): Promise<boolean> {
    const el = this.getTargetTextarea();
    if (!el) return false;
    const delay = options?.delayMs || 15;
    el.value = '';
    el.focus();

    const chunkSize = 3;
    for (let i = 0; i < code.length; i += chunkSize) {
      const chunk = code.substring(i, i + chunkSize);
      el.value += chunk;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      options?.onProgress?.(Math.min(i + chunkSize, code.length), code.length);
      await new Promise(r => setTimeout(r, delay));
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  public async replaceSelection(code: string): Promise<boolean> {
    const el = this.getTargetTextarea();
    if (!el) return false;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.setRangeText(code, start, end, 'end');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  public getLanguage(): string {
    return 'Text';
  }
}

/**
 * Composite Editor Adapter that delegates to available editor
 */
export class EditorAdapter implements IEditorAdapter {
  private adapters: IEditorAdapter[];

  constructor() {
    this.adapters = [new MonacoEditorAdapter(), new TextareaEditorAdapter()];
  }

  private getActiveAdapter(): IEditorAdapter {
    for (const adapter of this.adapters) {
      if (adapter.isAvailable()) {
        return adapter;
      }
    }
    return this.adapters[0];
  }

  public isAvailable(): boolean {
    return this.adapters.some(a => a.isAvailable());
  }

  public getCode(): string {
    return this.getActiveAdapter().getCode();
  }

  public async setCode(code: string): Promise<boolean> {
    return this.getActiveAdapter().setCode(code);
  }

  public async typeCodeAnimated(
    code: string,
    options?: { delayMs?: number; onProgress?: (current: number, total: number) => void }
  ): Promise<boolean> {
    return this.getActiveAdapter().typeCodeAnimated(code, options);
  }

  public async replaceSelection(code: string): Promise<boolean> {
    return this.getActiveAdapter().replaceSelection(code);
  }

  public getLanguage(): string {
    return this.getActiveAdapter().getLanguage();
  }
}
